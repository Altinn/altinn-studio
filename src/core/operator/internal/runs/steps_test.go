package runs

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	. "github.com/onsi/gomega"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"

	"altinn.studio/core-operator/internal/callbacks"
	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/jobhost"
)

var errQuota = errors.New("exceeded quota: sandbox-runs, requested: count/jobs.batch=1, limited: count/jobs.batch=2")

func TestARunGoesThroughEveryStep(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()

	run := h.create(t, "assistant", "app")
	Expect(run.Status).To(Equal(StatusQueued))
	Expect(*run.QueuePosition).To(Equal(1))

	Expect(h.step(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.get(t, run.ID).Status).To(Equal(StatusStarting))

	Expect(h.step(t, run.ID, StepCreateJob).done()).To(BeTrue())
	job, err := h.kube.Job(ctx, testNamespace, run.ID)
	Expect(err).NotTo(HaveOccurred())
	Expect(job.Labels).To(HaveKeyWithValue(LabelRunCaller, "assistant"))
	Expect(job.Spec.Template.Labels).To(HaveKeyWithValue(LabelRunID, run.ID))
	// A repeated create, after a lost answer, is fine.
	Expect(h.call(t, run.ID, StepCreateJob).done()).To(BeTrue())

	waiting := h.step(t, run.ID, StepAwaitPod)
	Expect(waiting.deferred()).To(BeTrue())
	Expect(waiting.response.Defer.Reason).To(Equal("Waiting for the Job to create its pod."))
	h.readyPod(t, run.ID, corev1.PodRunning, true)
	ready := h.step(t, run.ID, StepAwaitPod)
	Expect(ready.done()).To(BeTrue())
	state, err := parseState(ready.response.State)
	Expect(err).NotTo(HaveOccurred())
	Expect(state.PodIP).To(Equal(podIP))
	Expect(state.Kind).To(Equal(testKind))
	Expect(h.get(t, run.ID).Status).To(Equal(StatusAwaitingArchive))

	// The run waits for the caller's archive.
	waiting = h.step(t, run.ID, StepAwaitArchive)
	Expect(waiting.deferred()).To(BeTrue())
	Expect(waiting.response.Defer.Reason).To(Equal("Waiting for the caller to upload the archive."))
	Expect(h.uploadArchive(t, run.ID, "app")).To(Succeed())
	runID, command, archive, _ := h.host.Snapshot()
	Expect(runID).To(Equal(run.ID))
	Expect(command).To(Equal("upgrade-v9"))
	Expect(archive).To(Equal(gzipArchive(t, "app")))
	Expect(h.step(t, run.ID, StepAwaitArchive).done()).To(BeTrue())
	Expect(h.uploadArchive(t, run.ID, "again")).To(MatchError(ErrNotAwaiting), "the run runs")

	running := h.step(t, run.ID, StepAwaitResult)
	Expect(running.deferred()).To(BeTrue())
	Expect(running.response.Defer.Delay).To(Equal(engine.Duration(time.Second)))
	Expect(h.get(t, run.ID).Status).To(Equal(StatusRunning))
	_, _, err = h.service.Result(ctx, "assistant", run.ID)
	Expect(err).To(MatchError(ErrNotFinished))

	result := `{"status":"completed","exitCode":0,"timedOut":false,"stdout":"upgraded","stderr":"",` +
		`"report":{"exitCode":3,"steps":[]},"patch":"cGF0Y2g="}`
	h.host.Finish(jobhost.Status{Status: jobhost.StatusCompleted, ExitCode: new(0)}, result)
	finished := h.step(t, run.ID, StepAwaitResult)
	Expect(finished.done()).To(BeTrue())
	state, err = parseState(finished.response.State)
	Expect(err).NotTo(HaveOccurred())
	Expect(state.Outcome).To(Equal(jobhost.StatusCompleted))
	Expect(h.host.FetchCount()).To(BeZero(), "the step reads the status, which is not a fetch")

	// The result is the caller's while run.cleanup waits.
	completed := h.get(t, run.ID)
	Expect(completed.Status).To(Equal(StatusCompleted))
	Expect(completed.StartedAt).NotTo(BeNil())
	Expect(completed.FinishedAt).NotTo(BeNil())
	Expect(*completed.ResultExpiresAt).To(Equal(completed.FinishedAt.Add(5 * time.Minute)))
	Expect(completed.Error).To(BeNil())
	Expect(completed.Source).To(Equal(testSource("app")))

	cleanup := h.step(t, run.ID, StepCleanup)
	Expect(cleanup.deferred()).To(BeTrue())
	Expect(cleanup.response.Defer.Reason).To(Equal("Waiting for the caller to fetch the result."))
	Expect(h.result(t, run.ID)).To(MatchJSON(result))
	Expect(h.host.FetchCount()).To(Equal(1))

	// The job host exits once the grace after the fetch has passed.
	h.endPod(t, run.ID)
	Expect(h.step(t, run.ID, StepCleanup).done()).To(BeTrue())
	_, err = h.kube.Job(ctx, testNamespace, run.ID)
	Expect(apierrors.IsNotFound(err)).To(BeTrue())

	done := h.get(t, run.ID)
	Expect(done.Status).To(Equal(StatusCompleted))
	_, _, err = h.service.Result(ctx, "assistant", run.ID)
	Expect(err).To(MatchError(ErrExpired))
}

func TestAFailedCommandFailsTheRunWithItsError(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	h.startCommand(t, run.ID)
	h.host.Finish(jobhost.Status{Status: jobhost.StatusFailed, Error: "the app does not build"}, "")
	Expect(h.step(t, run.ID, StepAwaitResult).done()).To(BeTrue())
	Expect(h.step(t, run.ID, StepCleanup).done()).To(BeTrue(), "a run without a result does not wait for a fetch")

	failed := h.get(t, run.ID)
	Expect(failed.Status).To(Equal(StatusFailed))
	Expect(failed.Error).To(Equal(&RunError{Reason: ReasonRunFailed, Detail: "the app does not build"}))
	Expect(failed.ResultExpiresAt).To(BeNil())
	_, _, err := h.service.Result(t.Context(), "assistant", run.ID)
	Expect(err).To(MatchError(ErrNoResult))
	Expect(err).To(MatchError(ContainSubstring("the app does not build")))
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

	Expect(h.step(t, first.ID, StepAdmit).done()).To(BeTrue())
	queued := h.step(t, second.ID, StepAdmit)
	Expect(queued.deferred()).To(BeTrue())
	Expect(queued.response.Defer.Delay).To(Equal(engine.Duration(AdmitRecheck)))
	Expect(queued.response.Defer.Reason).To(Equal("The run is number 1 in the queue for upgrade-v9."))
	Expect(h.step(t, third.ID, StepAdmit).done()).To(BeTrue())

	status := h.get(t, second.ID)
	Expect(status.Status).To(Equal(StatusQueued))
	Expect(*status.QueuePosition).To(Equal(1))

	// The first run's Job counts once it exists, and its reservation ends.
	Expect(h.step(t, first.ID, StepCreateJob).done()).To(BeTrue())
	Expect(h.step(t, second.ID, StepAdmit).deferred()).To(BeTrue())

	// When the first run's Job finishes, the second run takes its place.
	Expect(h.step(t, first.ID, StepCleanup).done()).To(BeTrue())
	Expect(h.step(t, second.ID, StepAdmit).done()).To(BeTrue())
}

func TestAdmitLeavesTheQueueOnTheFinalWaitCheck(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	first := h.create(t, "assistant", "a1")
	h.clock.Advance(time.Second)
	second := h.create(t, "assistant", "a2")
	Expect(h.step(t, first.ID, StepAdmit).done()).To(BeTrue())

	final := h.step(t, second.ID, StepAdmit, func(p *callbacks.Payload) { p.IsFinalWaitCheck = true })
	Expect(final.status).To(Equal(http.StatusUnprocessableEntity), final.body)
	_, queued := h.queue.Position(second.ID)
	Expect(queued).To(BeFalse())

	h.failStep(t, second.ID, StepAdmit, failedByOperator(final))
	expired := h.get(t, second.ID)
	Expect(expired.Status).To(Equal(StatusExpired))
	Expect(expired.Error).To(Equal(&RunError{
		Reason: ReasonQueueTimeout,
		Detail: "The run waited in the queue longer than its kind allows.",
	}))
}

func TestCreateJobDefersWhileTheQuotaIsFull(t *testing.T) {
	RegisterTestingT(t)
	quotaFull := true
	h := newHarness(t, func(builder *fake.ClientBuilder) {
		builder.WithInterceptorFuncs(interceptor.Funcs{
			Create: func(ctx context.Context, c client.WithWatch, obj client.Object, opts ...client.CreateOption) error {
				if _, isJob := obj.(*batchv1.Job); isJob && quotaFull {
					return apierrors.NewForbidden(schema.GroupResource{Group: "batch", Resource: "jobs"},
						obj.GetName(), errQuota)
				}
				return c.Create(ctx, obj, opts...)
			},
		})
	})

	run := h.create(t, "assistant", "key")
	Expect(h.step(t, run.ID, StepAdmit).done()).To(BeTrue())
	waiting := h.step(t, run.ID, StepCreateJob)
	Expect(waiting.deferred()).To(BeTrue())
	Expect(waiting.response.Defer.Delay).To(Equal(engine.Duration(5 * time.Second)))

	// The run keeps its place while it waits, also past the time an admitted run without a Job is forgotten.
	h.clock.Advance(2 * time.Minute)
	Expect(h.step(t, run.ID, StepCreateJob).deferred()).To(BeTrue())
	active, _ := h.queue.activeLocked(testKind, nil)
	Expect(active).To(Equal(1))

	quotaFull = false
	Expect(h.step(t, run.ID, StepCreateJob).done()).To(BeTrue())
}

func TestCreateJobFailsWhenTheAPIServerRefusesTheJob(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t, func(builder *fake.ClientBuilder) {
		builder.WithInterceptorFuncs(interceptor.Funcs{
			Create: func(_ context.Context, _ client.WithWatch, obj client.Object, _ ...client.CreateOption) error {
				return apierrors.NewInvalid(schema.GroupKind{Group: "batch", Kind: "Job"}, obj.GetName(), nil)
			},
		})
	})

	run := h.create(t, "assistant", "key")
	Expect(h.step(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.step(t, run.ID, StepCreateJob).status).To(Equal(http.StatusUnprocessableEntity))
}

func TestAwaitPodFailsForAPodThatStopped(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	Expect(h.step(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.step(t, run.ID, StepCreateJob).done()).To(BeTrue())
	h.readyPod(t, run.ID, corev1.PodPending, false)
	Expect(h.step(t, run.ID, StepAwaitPod).response.Defer.Reason).To(Equal("Waiting for the job host to start."))

	pod := &corev1.Pod{}
	Expect(h.client.Get(t.Context(), client.ObjectKey{Namespace: testNamespace, Name: JobName(run.ID) + "-abcde"},
		pod)).To(Succeed())
	pod.Status.Phase = corev1.PodFailed
	Expect(h.client.Status().Update(t.Context(), pod)).To(Succeed())
	Expect(h.step(t, run.ID, StepAwaitPod).status).To(Equal(http.StatusUnprocessableEntity))

	h.failStep(t, run.ID, StepAwaitPod, "the pod stopped before it was ready")
	failed := h.get(t, run.ID)
	Expect(failed.Status).To(Equal(StatusFailed))
	Expect(failed.Error.Reason).To(Equal(ReasonStartFailed))
}

func TestAwaitPodWaitsForASandboxNode(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	Expect(h.step(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.step(t, run.ID, StepCreateJob).done()).To(BeTrue())
	pod := h.readyPod(t, run.ID, corev1.PodPending, false)
	pod.Status.Conditions = []corev1.PodCondition{{
		Type: corev1.PodScheduled, Status: corev1.ConditionFalse, Reason: corev1.PodReasonUnschedulable,
	}}
	Expect(h.client.Status().Update(t.Context(), pod)).To(Succeed())
	Expect(h.step(t, run.ID, StepAwaitPod).response.Defer.Reason).To(Equal("Waiting for a sandbox node."))
}

func TestAwaitPodFailsForAFailedJobWithoutPod(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	Expect(h.step(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.step(t, run.ID, StepCreateJob).done()).To(BeTrue())
	job, err := h.kube.Job(t.Context(), testNamespace, run.ID)
	Expect(err).NotTo(HaveOccurred())
	job.Status.Conditions = []batchv1.JobCondition{{
		Type: batchv1.JobFailed, Status: corev1.ConditionTrue, Reason: "DeadlineExceeded",
	}}
	Expect(h.client.Status().Update(t.Context(), job)).To(Succeed())
	Expect(h.step(t, run.ID, StepAwaitPod).status).To(Equal(http.StatusUnprocessableEntity))
}

func TestAwaitArchiveRetriesAnUnreachableJobHost(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	ip, port := h.host.Address()
	h.host.Close()
	h.steps.host = jobhost.NewClient(http.DefaultClient, port)
	h.states[run.ID] = h.stateWith(t, run.ID, func(s *runState) { s.PodIP = ip })
	h.readyPod(t, run.ID, corev1.PodRunning, true)
	Expect(h.call(t, run.ID, StepAwaitArchive).status).To(Equal(http.StatusServiceUnavailable))
}

func TestAwaitArchiveFailsTheRunWhenNoArchiveArrives(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	h.states[run.ID] = h.stateWith(t, run.ID, func(s *runState) { s.PodIP = podIP })
	h.engine.Reach(h.workflowID(t, run.ID), StepAwaitArchive, engine.StatusWaiting)
	final := h.call(t, run.ID, StepAwaitArchive, func(p *callbacks.Payload) { p.IsFinalWaitCheck = true })
	Expect(final.status).To(Equal(http.StatusUnprocessableEntity), final.body)

	h.failStep(t, run.ID, StepAwaitArchive, failedByOperator(final))
	failed := h.get(t, run.ID)
	Expect(failed.Status).To(Equal(StatusFailed))
	Expect(failed.Error).To(Equal(&RunError{
		Reason: ReasonArchiveTimeout,
		Detail: "No archive arrived within the upload timeout of the kind.",
	}))
}

func TestAwaitResultFailsWhenThePodIsGone(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	ip, port := h.host.Address()
	h.host.Close()
	h.steps.host = jobhost.NewClient(http.DefaultClient, port)
	h.states[run.ID] = h.stateWith(t, run.ID, func(s *runState) { s.PodIP = ip })

	// The pod is still there, so the job host may answer later.
	pod := h.readyPod(t, run.ID, corev1.PodRunning, true)
	Expect(h.call(t, run.ID, StepAwaitResult).status).To(Equal(http.StatusServiceUnavailable))

	Expect(h.client.Delete(t.Context(), pod)).To(Succeed())
	Expect(h.call(t, run.ID, StepAwaitResult).status).To(Equal(http.StatusUnprocessableEntity))
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
		Expect(h.call(t, run.ID, StepAdmit, change).status).To(Equal(http.StatusUnprocessableEntity), name)
	}
	Expect(h.call(t, run.ID, StepAwaitArchive).status).To(Equal(http.StatusUnprocessableEntity), "no pod IP")
}

// The job host protocol has no arguments yet, so a run must not start its command without them.
func TestAwaitArchiveFailsARunWithArguments(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run, _, err := h.service.Create(t.Context(), "assistant",
		CreateRequest{Kind: argsKind, Source: testSource("app"), Args: map[string]string{"target": "v9"}})
	Expect(err).NotTo(HaveOccurred())
	Expect(h.step(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.step(t, run.ID, StepCreateJob).done()).To(BeTrue())
	h.readyPod(t, run.ID, corev1.PodRunning, true)
	Expect(h.step(t, run.ID, StepAwaitPod).done()).To(BeTrue())

	result := h.step(t, run.ID, StepAwaitArchive)
	Expect(result.status).To(Equal(http.StatusUnprocessableEntity))
	Expect(result.body).To(ContainSubstring(errArgs.Error()))
}

// A run keeps the kind it was created with, so a change to the catalog does not change a run in flight, and its
// Job's deadline fits the budgets of its workflow.
func TestARunKeepsItsKindWhenTheCatalogChanges(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()

	run := h.create(t, "assistant", "key")
	Expect(h.step(t, run.ID, StepAdmit).done()).To(BeTrue())
	changed := h.cfg.Kinds[testKind]
	changed.Command = "other-command"
	changed.RunTimeout = time.Minute
	h.cfg.Kinds[testKind] = changed

	Expect(h.step(t, run.ID, StepCreateJob).done()).To(BeTrue())
	job, err := h.kube.Job(ctx, testNamespace, run.ID)
	Expect(err).NotTo(HaveOccurred())
	Expect(*job.Spec.ActiveDeadlineSeconds).To(Equal(int64(1650)), "the deadline of a run timeout of 660 s")
	h.readyPod(t, run.ID, corev1.PodRunning, true)
	Expect(h.step(t, run.ID, StepAwaitPod).done()).To(BeTrue())
	Expect(h.uploadArchive(t, run.ID, "app")).To(Succeed())
	Expect(h.step(t, run.ID, StepAwaitArchive).done()).To(BeTrue())
	started, command, _, _ := h.host.Snapshot()
	Expect(started).To(Equal(run.ID))
	Expect(command).To(Equal("upgrade-v9"))

	// Without the kind in the catalog, the run still cleans up after itself.
	delete(h.cfg.Kinds, testKind)
	Expect(h.call(t, run.ID, StepCleanup).done()).To(BeTrue())
	_, err = h.kube.Job(ctx, testNamespace, run.ID)
	Expect(apierrors.IsNotFound(err)).To(BeTrue())
}

// The queue's limits are the kind's current ones, so a kind that has left the catalog admits no more runs.
func TestAdmitFailsARunWhoseKindIsGone(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	delete(h.cfg.Kinds, testKind)
	result := h.call(t, run.ID, StepAdmit)
	Expect(result.status).To(Equal(http.StatusUnprocessableEntity))
	Expect(result.body).To(ContainSubstring(errNoKind.Error()))
}

// stateWith returns the run's initial state with change applied, as the steps before would have left it.
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

// startCommand takes a run through its steps up to its running command, with the caller's archive.
func (h *harness) startCommand(t *testing.T, runID string) {
	t.Helper()
	for _, key := range []string{StepAdmit, StepCreateJob} {
		if !h.step(t, runID, key).done() {
			t.Fatalf("%s did not complete", key)
		}
	}
	h.readyPod(t, runID, corev1.PodRunning, true)
	if !h.step(t, runID, StepAwaitPod).done() {
		t.Fatal("run.await-pod did not complete")
	}
	if err := h.uploadArchive(t, runID, "app"); err != nil {
		t.Fatal(err)
	}
	if !h.step(t, runID, StepAwaitArchive).done() {
		t.Fatal("run.await-archive did not complete")
	}
}

// endPod ends the pod of a run's Job, as when the job host exits.
func (h *harness) endPod(t *testing.T, runID string) {
	t.Helper()
	pod := &corev1.Pod{}
	key := client.ObjectKey{Namespace: testNamespace, Name: JobName(runID) + "-abcde"}
	if err := h.client.Get(t.Context(), key, pod); err != nil {
		t.Fatal(err)
	}
	pod.Status.Phase = corev1.PodSucceeded
	if err := h.client.Status().Update(t.Context(), pod); err != nil {
		t.Fatal(err)
	}
}

// The engine runs a step again when it did not commit the step's answer, for example after the operator's pod
// crashed. The job host still has the status then, since only the caller's fetch counts.
func TestAwaitResultReadsTheStatusAgainWithoutAFetch(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	h.startCommand(t, run.ID)
	h.host.Finish(jobhost.Status{Status: jobhost.StatusCompleted, ExitCode: new(0)}, `{"status":"completed"}`)
	Expect(h.call(t, run.ID, StepAwaitResult).done()).To(BeTrue())
	again := h.call(t, run.ID, StepAwaitResult)
	Expect(again.done()).To(BeTrue(), again.body)
	Expect(h.host.FetchCount()).To(BeZero())
}

// The caller may never fetch the result. run.cleanup then deletes the Job on its final check, once the result timeout
// has passed.
func TestCleanupDeletesTheJobWhenNoOneFetchesTheResult(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	h.startCommand(t, run.ID)
	h.host.Finish(jobhost.Status{Status: jobhost.StatusCompleted, ExitCode: new(0)}, `{"status":"completed"}`)
	Expect(h.step(t, run.ID, StepAwaitResult).done()).To(BeTrue())
	Expect(h.step(t, run.ID, StepCleanup).deferred()).To(BeTrue())

	final := h.step(t, run.ID, StepCleanup, func(p *callbacks.Payload) { p.IsFinalWaitCheck = true })
	Expect(final.done()).To(BeTrue(), final.body)
	_, err := h.kube.Job(t.Context(), testNamespace, run.ID)
	Expect(apierrors.IsNotFound(err)).To(BeTrue())
}

// A queue that restarted while a run waited for the cache to show its new Job learns of the run's place from
// run.await-pod.
func TestAwaitPodKeepsTheReservationUntilTheJobShows(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	h.queue = NewQueue(h.clock)
	h.steps.queue = h.queue
	Expect(h.step(t, run.ID, StepAwaitPod).deferred()).To(BeTrue())
	active, _ := h.queue.activeLocked(testKind, nil)
	Expect(active).To(Equal(1))
}

// While the PodTemplate rolls out, the admission policy compares a new Job with the template it cached a moment
// before, and refuses it. A later attempt succeeds, so the step retries.
func TestCreateJobRetriesWhenTheAdmissionPolicyRefuses(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t, func(builder *fake.ClientBuilder) {
		builder.WithInterceptorFuncs(interceptor.Funcs{
			Create: func(_ context.Context, _ client.WithWatch, obj client.Object, _ ...client.CreateOption) error {
				return policyDenial(obj.GetName())
			},
		})
	})

	run := h.create(t, "assistant", "key")
	Expect(h.step(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.step(t, run.ID, StepCreateJob).status).To(Equal(http.StatusServiceUnavailable))
}

// policyDenial is the error the API server gives when the admission policy refuses a Job, as the envtest shows.
func policyDenial(name string) error {
	cause := "ValidatingAdmissionPolicy 'sandbox-run-jobs' with binding 'sandbox-run-jobs' denied request: " +
		"The pod spec of the Job must be the pod spec of the PodTemplate job-host."
	return &apierrors.StatusError{ErrStatus: metav1.Status{
		Status:  metav1.StatusFailure,
		Code:    http.StatusUnprocessableEntity,
		Reason:  metav1.StatusReasonInvalid,
		Message: `jobs.batch "` + name + `" is forbidden: ` + cause,
		Details: &metav1.StatusDetails{
			Name: name, Group: "batch", Kind: "jobs", Causes: []metav1.StatusCause{{Message: cause}},
		},
	}}
}
