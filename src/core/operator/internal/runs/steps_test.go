package runs

import (
	"net/http"
	"testing"
	"time"

	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/callbacks"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/runner"
	"altinn.studio/core-operator/internal/sandbox"
)

func TestAFailedCommandFailsTheRunWithItsError(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	h.startCommand(t, run.ID)
	h.host.Finish(runner.Status{Status: runner.StatusFailed, Error: "the app does not build"}, "")
	finished := h.call(t, run.ID, StepAwaitResult)
	Expect(finished.done()).To(BeTrue())
	state, err := parseState(finished.response.State)
	Expect(err).NotTo(HaveOccurred())
	Expect(state.Outcome).To(Equal(runner.StatusFailed))
	Expect(state.Error).To(Equal("the app does not build"))
	Expect(h.call(t, run.ID, StepCleanup).done()).To(BeTrue(), "a run without a result does not wait for a fetch")
}

func TestAdmitQueuesBeyondTheLimits(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	// maxActivePerCaller is 1, so the assistant's second run waits while the other caller's run starts.
	first := h.create(t, "assistant", "a1")
	h.clock.Advance(time.Second)
	second := h.create(t, "assistant", "a2")
	h.clock.Advance(time.Second)
	third := h.create(t, "other", "o1")

	Expect(h.call(t, first.ID, StepAdmit).done()).To(BeTrue())
	queued := h.call(t, second.ID, StepAdmit)
	Expect(queued.deferred()).To(BeTrue())
	Expect(queued.response.Defer.Delay).To(Equal(engine.Duration(AdmitRecheck)))
	Expect(queued.response.Defer.Reason).To(Equal("The run is number 1 in the queue for upgrade-v9."))
	Expect(h.call(t, third.ID, StepAdmit).done()).To(BeTrue())

	status := h.get(t, second.ID)
	Expect(status.Status).To(Equal(StatusQueued))
	Expect(*status.QueuePosition).To(Equal(1))

	// The Job of the first run counts after it exists, and its reservation ends.
	Expect(h.call(t, first.ID, StepCreateJob).done()).To(BeTrue())
	Expect(h.call(t, second.ID, StepAdmit).deferred()).To(BeTrue())

	// When the first run's Job finishes, the second run takes its place.
	Expect(h.call(t, first.ID, StepCleanup).done()).To(BeTrue())
	Expect(h.call(t, second.ID, StepAdmit).done()).To(BeTrue())
}

func TestAdmitLeavesTheQueueOnTheFinalWaitCheck(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	first := h.create(t, "assistant", "a1")
	h.clock.Advance(time.Second)
	second := h.create(t, "assistant", "a2")
	Expect(h.call(t, first.ID, StepAdmit).done()).To(BeTrue())

	final := h.call(t, second.ID, StepAdmit, func(p *callbacks.Payload) { p.IsFinalWaitCheck = true })
	Expect(callbacks.Ended(final.body)).To(HaveField("Reason", ReasonQueueTimeout), final.body)
	_, queued := h.queue.Position(second.ID)
	Expect(queued).To(BeFalse())
}

func TestCreateJobDefersWhileTheQuotaIsFull(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	h.sandbox.CreateErr = sandbox.ErrQuotaFull

	run := h.create(t, "assistant", "key")
	Expect(h.call(t, run.ID, StepAdmit).done()).To(BeTrue())
	waiting := h.call(t, run.ID, StepCreateJob)
	Expect(waiting.deferred()).To(BeTrue())
	Expect(waiting.response.Defer.Delay).To(Equal(engine.Duration(5 * time.Second)))

	// The run keeps its place while it waits, also after admittedTTL, when the queue forgets an admitted run without a
	// Job.
	h.clock.Advance(2 * time.Minute)
	Expect(h.call(t, run.ID, StepCreateJob).deferred()).To(BeTrue())
	next := h.create(t, "assistant", "next")
	Expect(h.call(t, next.ID, StepAdmit).deferred()).To(BeTrue())

	h.sandbox.CreateErr = nil
	Expect(h.call(t, run.ID, StepCreateJob).done()).To(BeTrue())
}

func TestCreateJobFailsWhenTheSandboxRefusesTheJob(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	h.sandbox.CreateErr = sandbox.ErrRefused

	run := h.create(t, "assistant", "key")
	Expect(h.call(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(callbacks.Ended(h.call(t, run.ID, StepCreateJob).body)).To(HaveField("Reason", ReasonStartFailed))

	// The run releases its place at once, so the caller's next run starts.
	h.sandbox.CreateErr = nil
	Expect(h.call(t, h.create(t, "assistant", "next").ID, StepAdmit).done()).To(BeTrue())
}

func TestAwaitPodFailsForAPodThatStopped(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	Expect(h.call(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.call(t, run.ID, StepCreateJob).done()).To(BeTrue())
	h.setPod(run.ID, sandbox.PodStarting, "")
	Expect(h.call(t, run.ID, StepAwaitPod).response.Defer.Reason).To(Equal("Waiting for the operator runner to start."))

	h.setPod(run.ID, sandbox.PodEnded, "run-x is Failed")
	Expect(callbacks.Ended(h.call(t, run.ID, StepAwaitPod).body)).To(Equal(&callbacks.End{Reason: ReasonStartFailed,
		Detail: "The pod stopped before it was ready: run-x is Failed"}))
	Expect(h.hasJob(run.ID)).To(BeFalse(), "the run's Job goes at once")
}

func TestAwaitPodWaitsForASandboxNode(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	Expect(h.call(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.call(t, run.ID, StepCreateJob).done()).To(BeTrue())
	h.setPod(run.ID, sandbox.PodUnschedulable, "")
	Expect(h.call(t, run.ID, StepAwaitPod).response.Defer.Reason).To(Equal("Waiting for a sandbox node."))

	// On the engine's final check, the run fails with what the pod waited for.
	final := h.call(t, run.ID, StepAwaitPod, func(p *callbacks.Payload) { p.IsFinalWaitCheck = true })
	Expect(callbacks.Ended(final.body)).To(Equal(&callbacks.End{Reason: ReasonStartFailed,
		Detail: "The pod was not ready in time. Waiting for a sandbox node."}))
}

func TestAwaitPodFailsForAFailedJobWithoutPod(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	Expect(h.call(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.call(t, run.ID, StepCreateJob).done()).To(BeTrue())
	h.setPod(run.ID, sandbox.JobFailed, "DeadlineExceeded")
	Expect(callbacks.Ended(h.call(t, run.ID, StepAwaitPod).body)).To(Equal(&callbacks.End{Reason: ReasonStartFailed,
		Detail: "The Job failed: DeadlineExceeded"}))
}

func TestAwaitArchiveRetriesAnUnreachableRunner(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	ip, _ := h.host.Address()
	h.host.Close()
	h.states[run.ID] = h.stateWith(t, run.ID, func(s *runState) { s.PodIP = ip })
	h.sandbox.Add(sandbox.Job{RunID: run.ID, Kind: testKind, Caller: "assistant", Namespace: testNamespace})
	h.sandbox.SetPod(testNamespace, run.ID, sandbox.Pod{Status: sandbox.PodReady, IP: ip})
	Expect(h.call(t, run.ID, StepAwaitArchive).status).To(Equal(http.StatusServiceUnavailable))
}

func TestAwaitArchiveFailsTheRunWhenNoArchiveArrives(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	h.states[run.ID] = h.stateWith(t, run.ID, func(s *runState) { s.PodIP = podIP })
	final := h.call(t, run.ID, StepAwaitArchive, func(p *callbacks.Payload) { p.IsFinalWaitCheck = true })
	Expect(callbacks.Ended(final.body)).To(HaveField("Reason", ReasonArchiveTimeout), final.body)
}

func TestAwaitResultFailsWhenThePodIsGone(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	ip, _ := h.host.Address()
	h.host.Close()
	h.states[run.ID] = h.stateWith(t, run.ID, func(s *runState) { s.PodIP = ip })

	// The pod is still there, so the operator runner can answer later.
	h.sandbox.Add(sandbox.Job{RunID: run.ID, Kind: testKind, Caller: "assistant", Namespace: testNamespace})
	h.sandbox.SetPod(testNamespace, run.ID, sandbox.Pod{Status: sandbox.PodReady, IP: ip})
	Expect(h.call(t, run.ID, StepAwaitResult).status).To(Equal(http.StatusServiceUnavailable))

	Expect(h.sandbox.DeleteJob(t.Context(), testNamespace, run.ID)).To(Succeed())
	Expect(callbacks.Ended(h.call(t, run.ID, StepAwaitResult).body)).To(HaveField("Reason", ReasonRunFailed))
}

func TestStepsRefuseCallbacksThatAreNotForARun(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	cases := map[string]func(*callbacks.Payload){
		"another domain":   func(p *callbacks.Payload) { p.Context.Domain = "maskinporten" },
		"no caller":        func(p *callbacks.Payload) { p.Context.Caller = "" },
		"not a run id":     func(p *callbacks.Payload) { p.Context.SubjectID = "../../etc" },
		"a broken state":   func(p *callbacks.Payload) { p.State = new("{") },
		"an empty state":   func(p *callbacks.Payload) { p.State = new("") },
		"a state, no kind": func(p *callbacks.Payload) { p.State = new(`{"podIP":"127.0.0.1"}`) },
	}
	for name, change := range cases {
		Expect(callbacks.Ended(h.call(t, run.ID, StepAdmit, change).body)).To(HaveField("Reason", ReasonInternal), name)
	}
	ended := callbacks.Ended(h.call(t, run.ID, StepAwaitArchive).body)
	Expect(ended).To(HaveField("Reason", ReasonStartFailed), "no pod IP")
}

func TestARunKeepsItsKindWhenTheCatalogChanges(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	Expect(h.call(t, run.ID, StepAdmit).done()).To(BeTrue())
	changed := h.cfg.Kinds[testKind]
	changed.Command = "other-command"
	changed.RunTimeout = time.Minute
	h.cfg.Kinds[testKind] = changed

	Expect(h.call(t, run.ID, StepCreateJob).done()).To(BeTrue())
	job, ok := h.sandbox.Job(testNamespace, run.ID)
	Expect(ok).To(BeTrue())
	Expect(job.Deadline).To(Equal(config.JobDeadline(660*time.Second)), "the Job's deadline fits the run's own budgets")
	h.readyPod(run.ID)
	Expect(h.call(t, run.ID, StepAwaitPod).done()).To(BeTrue())
	h.upload(t, run.ID, "app")
	Expect(h.call(t, run.ID, StepAwaitArchive).done()).To(BeTrue())
	started, command, _, _ := h.host.Snapshot()
	Expect(started).To(Equal(run.ID))
	Expect(command).To(Equal("upgrade-v9"))

	// Without the kind in the catalog, run.cleanup still completes.
	delete(h.cfg.Kinds, testKind)
	Expect(h.call(t, run.ID, StepCleanup).done()).To(BeTrue())
	Expect(h.hasJob(run.ID)).To(BeFalse())
}

// The queue uses the current limits of the kind, so a kind that left the catalog admits no more runs.
func TestAdmitFailsARunWhoseKindIsGone(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	delete(h.cfg.Kinds, testKind)
	Expect(callbacks.Ended(h.call(t, run.ID, StepAdmit).body)).To(Equal(&callbacks.End{Reason: ReasonStartFailed,
		Detail: "The run's kind is not configured anymore."}))
}

// stateWith returns the run's initial state with change applied, as the earlier steps leave it.
func (h *harness) stateWith(t *testing.T, runID string, change func(*runState)) *string {
	t.Helper()
	stored, ok := h.engine.Workflow(h.workflowID(t, runID))
	if !ok {
		t.Fatalf("no workflow for run %s", runID)
	}
	state, err := parseState(stored.Request.Workflows[0].State)
	if err != nil {
		t.Fatal(err)
	}
	change(state)
	encoded, err := state.encode()
	if err != nil {
		t.Fatal(err)
	}
	return encoded
}

// startCommand moves a run through its steps until its command runs, with the caller's archive.
func (h *harness) startCommand(t *testing.T, runID string) {
	t.Helper()
	for _, key := range []string{StepAdmit, StepCreateJob} {
		if !h.call(t, runID, key).done() {
			t.Fatalf("%s did not complete", key)
		}
	}
	h.readyPod(runID)
	if !h.call(t, runID, StepAwaitPod).done() {
		t.Fatal("run.await-pod did not complete")
	}
	h.upload(t, runID, "app")
	if !h.call(t, runID, StepAwaitArchive).done() {
		t.Fatal("run.await-archive did not complete")
	}
}

// The steps keep the times that the run shows. The upload deadline starts when the pod is ready. The start time is when
// the archive arrived, and the end time is when run.await-result had the outcome.
func TestStepsKeepTheTimesOfTheRun(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	Expect(h.call(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.call(t, run.ID, StepCreateJob).done()).To(BeTrue())
	h.readyPod(run.ID)
	Expect(h.call(t, run.ID, StepAwaitPod).done()).To(BeTrue())
	ready := h.clock.Now()
	h.clock.Advance(time.Minute)
	h.upload(t, run.ID, "app")
	Expect(h.call(t, run.ID, StepAwaitArchive).done()).To(BeTrue())
	started := h.clock.Now()
	h.clock.Advance(time.Minute)
	h.host.Finish(runner.Status{Status: runner.StatusCompleted, ExitCode: new(0)}, `{"status":"completed"}`)
	Expect(h.call(t, run.ID, StepAwaitResult).done()).To(BeTrue())

	state, err := parseState(h.states[run.ID])
	Expect(err).NotTo(HaveOccurred())
	Expect(*state.UploadBy).To(BeTemporally("==", ready.Add(config.UploadTimeout)))
	Expect(*state.StartedAt).To(BeTemporally("==", started))
	Expect(*state.FinishedAt).To(BeTemporally("==", h.clock.Now()))
}

// The engine runs a step again when it did not commit the step's answer, for example after the operator's pod crashed.
// The operator runner still has the status then, because only the caller's fetch counts.
func TestAwaitResultReadsTheStatusAgainWithoutAFetch(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	h.startCommand(t, run.ID)
	h.host.Finish(runner.Status{Status: runner.StatusCompleted, ExitCode: new(0)}, `{"status":"completed"}`)
	Expect(h.call(t, run.ID, StepAwaitResult).done()).To(BeTrue())
	again := h.call(t, run.ID, StepAwaitResult)
	Expect(again.done()).To(BeTrue(), again.body)
	Expect(h.host.FetchCount()).To(BeZero())
}

// If the caller does not fetch the result, run.cleanup deletes the Job on its final check, after the result timeout.
func TestCleanupDeletesTheJobWhenNoOneFetchesTheResult(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	h.startCommand(t, run.ID)
	h.host.Finish(runner.Status{Status: runner.StatusCompleted, ExitCode: new(0)}, `{"status":"completed"}`)
	Expect(h.call(t, run.ID, StepAwaitResult).done()).To(BeTrue())
	Expect(h.call(t, run.ID, StepCleanup).deferred()).To(BeTrue())

	final := h.call(t, run.ID, StepCleanup, func(p *callbacks.Payload) { p.IsFinalWaitCheck = true })
	Expect(final.done()).To(BeTrue(), final.body)
	Expect(h.hasJob(run.ID)).To(BeFalse())
}

// A queue that restarted while a run waited for the cache to show its new Job gets the place of the run from
// run.await-pod.
func TestAwaitPodKeepsTheReservationUntilTheJobShows(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	h.steps.queue = NewQueue(h.cfg, h.sandbox, h.clock)
	h.steps.queue.Open()
	Expect(h.call(t, run.ID, StepAwaitPod).deferred()).To(BeTrue())
	h.clock.Advance(warmup)
	next := h.create(t, "assistant", "next")
	Expect(h.call(t, next.ID, StepAdmit).deferred()).To(BeTrue(), "the caller's next run waits")
}

func TestCreateJobRetriesWhenTheAdmissionPolicyRefuses(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	h.sandbox.CreateErr = sandbox.ErrNotAdmitted

	run := h.create(t, "assistant", "key")
	Expect(h.call(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.call(t, run.ID, StepCreateJob).status).To(Equal(http.StatusServiceUnavailable))
}
