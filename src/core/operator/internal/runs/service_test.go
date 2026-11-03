package runs

import (
	"bytes"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/runner"
	"altinn.studio/core-operator/internal/sandbox"
)

// A create for a kind and labels that the caller has in progress finds that run, so a retried create, or one from a
// caller that restarted, makes no second run.
func TestCreateFindsTheRunInProgress(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()

	first := h.create(t, "assistant", "app")

	again, created, err := h.service.Create(ctx, "assistant", CreateRequest{Kind: testKind, Labels: testLabels("app")})
	Expect(err).NotTo(HaveOccurred())
	Expect(created).To(BeFalse())
	Expect(again.ID).To(Equal(first.ID))
	Expect(h.engine.Workflows()).To(HaveLen(1))

	// Label values are compared without case.
	upper := testLabels("APP")
	upper["repoOwner"] = "TTD"
	again, created, err = h.service.Create(ctx, "assistant", CreateRequest{Kind: testKind, Labels: upper})
	Expect(err).NotTo(HaveOccurred())
	Expect(created).To(BeFalse())
	Expect(again.ID).To(Equal(first.ID))

	// Another caller, another commit and another kind are other runs.
	other := h.create(t, "other", "app")
	Expect(other.ID).NotTo(Equal(first.ID))
	nextCommit := testLabels("app")
	nextCommit["commit"] = strings.Repeat("f", 40)
	next, created, err := h.service.Create(ctx, "assistant", CreateRequest{Kind: testKind, Labels: nextCommit})
	Expect(err).NotTo(HaveOccurred())
	Expect(created).To(BeTrue())
	Expect(next.ID).NotTo(Equal(first.ID))
}

// Once a run has ended, a create for the same kind and source makes a new run, and the next create finds that one.
func TestCreateAfterARunEndedMakesANewRun(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()
	request := CreateRequest{Kind: testKind, Labels: testLabels("app")}

	first := h.create(t, "assistant", "app")
	h.engine.Update(h.workflowID(t, first.ID), func(w *engine.Workflow) { w.OverallStatus = engine.StatusFailed })

	// The queue forgets a run that the engine no longer calls.
	h.clock.Advance(waitingTTL + time.Second)
	second, created, err := h.service.Create(ctx, "assistant", request)
	Expect(err).NotTo(HaveOccurred())
	Expect(created).To(BeTrue())
	Expect(second.ID).NotTo(Equal(first.ID))
	again, created, err := h.service.Create(ctx, "assistant", request)
	Expect(err).NotTo(HaveOccurred())
	Expect(created).To(BeFalse())
	Expect(again.ID).To(Equal(second.ID))

	h.engine.Update(h.workflowID(t, second.ID), func(w *engine.Workflow) { w.OverallStatus = engine.StatusCompleted })
	h.clock.Advance(waitingTTL + time.Second)
	third, created, err := h.service.Create(ctx, "assistant", request)
	Expect(err).NotTo(HaveOccurred())
	Expect(created).To(BeTrue())
	Expect(third.ID).NotTo(BeElementOf(first.ID, second.ID))
}

// The engine keeps the run: its labels name it and say what it is for, and its initial state has its kind.
func TestCreateStoresTheRunInTheEngine(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	Expect(run.ID).To(Equal(RunID("assistant", createKey(testKind, testLabels("app"), ""))))
	Expect(run.Kind).To(Equal(testKind))
	Expect(run.Labels).To(Equal(testLabels("app")))
	Expect(run.CreatedAt).To(Equal(h.clock.Now().UTC()))

	stored, ok := h.engine.Workflow(h.workflowID(t, run.ID))
	Expect(ok).To(BeTrue())
	Expect(stored.State.Namespace).To(Equal("runs-assistant"))
	Expect(stored.State.Labels).To(Equal(map[string]string{
		"runId": run.ID, "kind": testKind, "caller": "assistant",
		"org": "ttd", "app": "app", "repoOwner": "ttd", "repo": "app", "commit": testCommit,
	}))
	state, err := parseState(stored.Request.Workflows[0].State)
	Expect(err).NotTo(HaveOccurred())
	Expect(state.Kind).To(Equal(testKind))
	Expect(state.Spec).To(Equal(specOf(h.cfg.Kinds[testKind])))
}

func TestCreateChecksTheKindTheLabelsAndTheQueue(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()

	_, _, err := h.service.Create(ctx, "assistant", CreateRequest{Kind: "unknown", Labels: testLabels("app")})
	Expect(err).To(MatchError(ErrKindNotFound))
	_, _, err = h.service.Create(ctx, "designer", CreateRequest{Kind: testKind, Labels: testLabels("app")})
	Expect(err).To(MatchError(ErrKindForbidden))

	for message, change := range map[string]func(map[string]string){
		"The label repo must be":                              func(l map[string]string) { l["repo"] = "../app" },
		"The label org must be":                               func(l map[string]string) { l["org"] = "" },
		"The label app must be":                               func(l map[string]string) { l["app"] = strings.Repeat("a", 101) },
		"A run of the kind upgrade-v9 needs the label commit": func(l map[string]string) { delete(l, "commit") },
		"The kind upgrade-v9 has no label branch":             func(l map[string]string) { l["branch"] = "main" },
		"A label key must be":                                 func(l map[string]string) { l["runId"] = "x" },
		"Send at most 16 labels": func(l map[string]string) {
			for i := range 12 {
				l[fmt.Sprintf("extra%d", i)] = "x"
			}
		},
	} {
		labels := testLabels("app")
		change(labels)
		_, _, err = h.service.Create(ctx, "assistant", CreateRequest{Kind: testKind, Labels: labels})
		var invalid *RequestError
		Expect(err).To(BeAssignableToTypeOf(invalid), message)
		Expect(err).To(MatchError(HavePrefix(message)))
	}

	// maxQueuedPerCaller is 2.
	h.create(t, "assistant", "a")
	h.create(t, "assistant", "b")
	_, _, err = h.service.Create(ctx, "assistant", CreateRequest{Kind: testKind, Labels: testLabels("c")})
	Expect(err).To(MatchError(ErrQueueFull))
	// A queued run is found, not made again.
	_, created, err := h.service.Create(ctx, "assistant", CreateRequest{Kind: testKind, Labels: testLabels("a")})
	Expect(err).NotTo(HaveOccurred())
	Expect(created).To(BeFalse())
	// Another caller has its own queue.
	h.create(t, "other", "c")
}

func TestCreateAnswersUnavailableWhenTheEngineIsDown(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()
	request := CreateRequest{Kind: testKind, Labels: testLabels("app")}

	h.engine.AtCapacity = true
	_, _, err := h.service.Create(ctx, "assistant", request)
	Expect(err).To(MatchError(ErrUnavailable))
	h.engine.AtCapacity = false
	h.engine.FailReads = true
	_, _, err = h.service.Create(ctx, "assistant", request)
	Expect(err).To(MatchError(ErrUnavailable), "the operator cannot tell whether the run exists")

	h.engine.FailReads = false
	run, created, err := h.service.Create(ctx, "assistant", request)
	Expect(err).NotTo(HaveOccurred())
	Expect(created).To(BeTrue())
	Expect(run.Status).To(Equal(StatusQueued))
}

func TestCreateForTheSameSourceAtOnceMakesOneRun(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	var wg sync.WaitGroup
	results := make(chan bool, 4)
	for range 4 {
		wg.Go(func() {
			_, created, err := h.service.Create(t.Context(), "assistant",
				CreateRequest{Kind: testKind, Labels: testLabels("app")})
			if err == nil {
				results <- created
			}
		})
	}
	wg.Wait()
	close(results)
	created := 0
	for result := range results {
		if result {
			created++
		}
	}
	Expect(created).To(Equal(1))
	Expect(h.engine.Workflows()).To(HaveLen(1))
}

func TestFindListsTheCallersRunsNewestFirst(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()

	first := h.create(t, "assistant", "app")
	h.clock.Advance(time.Second)
	second := h.create(t, "assistant", "other")
	h.create(t, "other", "app")

	found, err := h.service.Find(ctx, "assistant", Filter{Labels: map[string]string{"org": "TTD"}})
	Expect(err).NotTo(HaveOccurred())
	Expect(found).To(HaveLen(2))
	Expect(found[0].ID).To(Equal(second.ID))
	Expect(found[1].ID).To(Equal(first.ID))

	found, err = h.service.Find(ctx, "assistant", Filter{
		Labels: map[string]string{"repoOwner": "ttd", "repo": "app", "commit": testCommit}, Kind: testKind,
	})
	Expect(err).NotTo(HaveOccurred())
	Expect(found).To(HaveLen(1))
	Expect(found[0].ID).To(Equal(first.ID))

	found, err = h.service.Find(ctx, "assistant", Filter{Labels: map[string]string{"repo": "nothing"}})
	Expect(err).NotTo(HaveOccurred())
	Expect(found).To(BeEmpty())

	var invalid *RequestError
	_, err = h.service.Find(ctx, "assistant", Filter{})
	Expect(err).To(BeAssignableToTypeOf(invalid))
	_, err = h.service.Find(ctx, "assistant", Filter{Labels: map[string]string{"repo": "../app"}})
	Expect(err).To(MatchError(HavePrefix("The label repo must be")))
	_, err = h.service.Find(ctx, "assistant", Filter{Labels: map[string]string{"kind": testKind}})
	Expect(err).To(MatchError(HavePrefix("A label key must be")), "kind is a filter of its own")
}

func TestGetShowsOnlyTheCallersRuns(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()

	run := h.create(t, "assistant", "key")
	_, err := h.service.Get(ctx, "other", run.ID, 0)
	Expect(err).To(MatchError(ErrNotFound))
	_, _, err = h.service.Result(ctx, "other", run.ID)
	Expect(err).To(MatchError(ErrNotFound))
	_, _, err = h.service.Cancel(ctx, "other", run.ID)
	Expect(err).To(MatchError(ErrNotFound))
	_, err = h.service.Upload(ctx, "other", run.ID, bytes.NewReader(gzipArchive(t, "app")), -1)
	Expect(err).To(MatchError(ErrNotFound))
	_, err = h.service.Get(ctx, "assistant", "not-a-uuid", 0)
	Expect(err).To(MatchError(ErrNotFound))
	_, err = h.service.Get(ctx, "assistant", RunID("assistant", "unknown"), 0)
	Expect(err).To(MatchError(ErrNotFound))
}

func TestGetWaitsForAChange(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	done := make(chan *Run)
	go func() {
		changed, err := h.service.Get(t.Context(), "assistant", run.ID, 20*time.Second)
		if err != nil {
			close(done)
			return
		}
		done <- changed
	}()

	// Nothing changes for a few polls.
	for range 3 {
		Eventually(h.clock.HasWaiters).Should(BeTrue())
		h.clock.Advance(statusPoll)
	}
	Eventually(h.clock.HasWaiters).Should(BeTrue())
	Consistently(done, 50*time.Millisecond).ShouldNot(Receive())

	h.step(t, run.ID, StepAdmit)
	h.clock.Advance(statusPoll)
	var changed *Run
	Eventually(done).Should(Receive(&changed))
	Expect(changed.Status).To(Equal(StatusStarting))
}

func TestGetStopsWaitingAtTheDeadline(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	done := make(chan *Run)
	go func() {
		same, err := h.service.Get(t.Context(), "assistant", run.ID, 2*time.Second)
		if err == nil {
			done <- same
		}
	}()
	for range 2 {
		Eventually(h.clock.HasWaiters).Should(BeTrue())
		h.clock.Advance(statusPoll)
	}
	var same *Run
	Eventually(done).Should(Receive(&same))
	Expect(same.Status).To(Equal(StatusQueued))
}

func TestCancelDeletesTheJob(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()

	run := h.create(t, "assistant", "key")
	Expect(h.step(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.step(t, run.ID, StepCreateJob).done()).To(BeTrue())

	canceled, accepted, err := h.service.Cancel(ctx, "assistant", run.ID)
	Expect(err).NotTo(HaveOccurred())
	Expect(accepted).To(BeTrue())
	Expect(canceled.Status).To(Equal(StatusCanceled))
	Expect(h.hasJob(run.ID)).To(BeFalse())

	// The engine finalizes the cancel at its next fetch.
	h.engine.Update(h.workflowID(t, run.ID), func(w *engine.Workflow) { w.OverallStatus = engine.StatusCanceled })
	again, accepted, err := h.service.Cancel(ctx, "assistant", run.ID)
	Expect(err).NotTo(HaveOccurred())
	Expect(accepted).To(BeFalse())
	Expect(again.Status).To(Equal(StatusCanceled))

	_, _, err = h.service.Result(ctx, "assistant", run.ID)
	Expect(err).To(MatchError(ErrNoResult))
}

func TestUploadNeedsARunThatAwaitsItsArchive(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	Expect(h.uploadArchive(t, run.ID, "app")).To(MatchError(ErrNotAwaiting), "a queued run")
	Expect(h.step(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.step(t, run.ID, StepCreateJob).done()).To(BeTrue())
	Expect(h.uploadArchive(t, run.ID, "app")).To(MatchError(ErrNotAwaiting), "a starting run")
	h.readyPod(run.ID)
	Expect(h.step(t, run.ID, StepAwaitPod).done()).To(BeTrue())

	_, err := h.service.Upload(t.Context(), "assistant", run.ID, bytes.NewReader([]byte("PK")), 2)
	var refused *UploadError
	Expect(errors.As(err, &refused)).To(BeTrue())
	Expect(refused.Status).To(Equal(400))
	Expect(h.host.Claimed()).To(BeEmpty(), "the operator runner did not take the body")

	Expect(h.uploadArchive(t, run.ID, "app")).To(Succeed())
	Expect(h.uploadArchive(t, run.ID, "app")).To(Succeed(), "an upload that comes again")
}

// The result lives in the Job. Once the operator runner has exited, the result is gone, while the engine still has the
// run's status.
func TestResultExpiresWithTheJob(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()

	run := h.create(t, "assistant", "app")
	h.startCommand(t, run.ID)
	h.host.Finish(runner.Status{Status: runner.StatusCompleted, ExitCode: new(0)}, `{"status":"completed"}`)
	Expect(h.step(t, run.ID, StepAwaitResult).done()).To(BeTrue())

	h.host.Close()
	h.setPod(run.ID, sandbox.PodEnded, "")
	_, _, err := h.service.Result(ctx, "assistant", run.ID)
	Expect(err).To(MatchError(ErrExpired))
	completed := h.get(t, run.ID)
	Expect(completed.Status).To(Equal(StatusCompleted))
	Expect(completed.Kind).To(Equal(testKind))
}

// An operator runner that does not answer while its pod still runs may answer later, so the caller retries.
func TestResultIsUnavailableWhileTheRunnerDoesNotAnswer(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	h.startCommand(t, run.ID)
	h.host.Finish(runner.Status{Status: runner.StatusCompleted, ExitCode: new(0)}, `{"status":"completed"}`)
	Expect(h.step(t, run.ID, StepAwaitResult).done()).To(BeTrue())

	h.host.Close()
	_, _, err := h.service.Result(t.Context(), "assistant", run.ID)
	Expect(err).To(MatchError(ErrRunner))
}

func TestResultAsksTheEngineFirst(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	h.engine.FailReads = true
	_, _, err := h.service.Result(t.Context(), "assistant", run.ID)
	Expect(err).To(MatchError(ErrUnavailable), "only the engine knows whether the run has ended")
}

func TestKindsListsWhatTheCallerMayRun(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	upgrade := Kind{
		Name: testKind, Labels: appLabels, RequiresArchive: true, QueueTimeoutSeconds: 900,
		UploadTimeoutSeconds: 300,
		RunTimeoutSeconds:    660, ResultTimeoutSeconds: 300, MaxDurationSeconds: 4380,
	}
	// A kind without an archive waits for no upload, so its bound is run.await-archive's budget and retries shorter.
	noArchive := upgrade
	noArchive.Name = noArchiveKind
	noArchive.RequiresArchive = false
	noArchive.UploadTimeoutSeconds = 0
	noArchive.MaxDurationSeconds = 3740
	Expect(h.service.Kinds("assistant")).To(Equal([]Kind{noArchive, upgrade}))
	Expect(h.service.Kinds("other")).To(Equal([]Kind{upgrade}))
	Expect(h.service.Kinds("designer")).To(BeEmpty())
	Expect(h.service.Kinds("nobody")).To(BeEmpty())
}

func TestStatusOfAPodThatWasNeverReady(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	Expect(h.step(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.step(t, run.ID, StepCreateJob).done()).To(BeTrue())
	h.setPod(run.ID, sandbox.PodStarting, "")
	Expect(h.step(t, run.ID, StepAwaitPod).deferred()).To(BeTrue())
	Expect(h.get(t, run.ID).Status).To(Equal(StatusStarting))
}
