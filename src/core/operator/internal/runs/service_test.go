package runs

import (
	"bytes"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/config"
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

	// The service compares label values without case.
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

// After a run ends, a create for the same kind and source makes a new run. The next create finds that new run.
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

// A canceled run is ended when the cancel answers, before the engine marks its workflow canceled at its next fetch.
func TestCreateRightAfterACancelMakesANewRun(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	first := h.create(t, "assistant", "app")
	_, canceled, err := h.service.Cancel(t.Context(), "assistant", first.ID)
	Expect(err).NotTo(HaveOccurred())
	Expect(canceled).To(BeTrue())
	Expect(h.create(t, "assistant", "app").ID).NotTo(Equal(first.ID))
}

// The engine keeps the run. Its labels name it and tell what it is for, and its initial state has its kind.
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
		"org": "ttd", "repoOwner": "ttd", "repo": "app", "commit": testCommit,
	}))
	state, err := parseState(stored.Request.Workflows[0].State)
	Expect(err).NotTo(HaveOccurred())
	Expect(state.Kind).To(Equal(testKind))
	Expect(state.Spec).To(Equal(specOf(h.cfg.Kinds[testKind], 0)))
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
		"The label repoOwner must be":                         func(l map[string]string) { l["repoOwner"] = strings.Repeat("a", 101) },
		"A run of the kind upgrade-v9 needs the label commit": func(l map[string]string) { delete(l, "commit") },
		"The kind upgrade-v9 has no label branch":             func(l map[string]string) { l["branch"] = "main" },
		"A label key must be":                                 func(l map[string]string) { l["runId"] = "x" },
		"Send at most 16 labels": func(l map[string]string) {
			for i := range 13 {
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
	// Create finds a queued run and does not make it again.
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
	Expect(h.service.Create(ctx, "assistant", request)).Error().To(MatchError(ErrUnavailable))
	Expect(h.queue.WaitingByKind()).To(BeEmpty(), "a run that the engine did not store leaves the line at once")
	h.engine.AtCapacity, h.engine.FailReads = false, true
	_, _, err := h.service.Create(ctx, "assistant", request)
	Expect(err).To(MatchError(ErrUnavailable), "the operator cannot tell whether the run exists")

	h.engine.FailReads = false
	Expect(h.create(t, "assistant", "app").Status).To(Equal(StatusQueued))
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

func TestUploadEndsWithTheUploadTimeout(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	run := h.create(t, "assistant", "app")
	Expect(h.call(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.call(t, run.ID, StepCreateJob).done()).To(BeTrue())
	h.readyPod(run.ID)
	Expect(h.call(t, run.ID, StepAwaitPod).done()).To(BeTrue())
	h.engine.Update(h.workflowID(t, run.ID), func(w *engine.Workflow) {
		for i := range 3 {
			w.Steps[i].Status, w.Steps[i].StateOut = engine.StatusCompleted, h.states[run.ID]
		}
	})
	h.clock.Advance(config.UploadTimeout)

	_, err := h.service.Upload(t.Context(), "assistant", run.ID, bytes.NewReader(gzipArchive(t, "app")), -1)
	Expect(err).To(MatchError(ErrNotAwaiting))
	Expect(h.call(t, run.ID, StepAwaitArchive).deferred()).To(BeTrue(), "the operator runner has no archive")
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

	h.engine.Update(h.workflowID(t, run.ID), func(w *engine.Workflow) {
		w.OverallStatus, w.Steps[0].Status = engine.StatusProcessing, engine.StatusCompleted
	})
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

// An operator runner that does not answer while its pod still runs can answer later, so the caller retries. After the
// pod is gone, the result is gone too.
func TestResultIsUnavailableWhileTheRunnerDoesNotAnswer(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	state := h.stateWith(t, run.ID, func(s *runState) { s.PodIP, s.Outcome = podIP, runner.StatusCompleted })
	h.engine.Update(h.workflowID(t, run.ID), func(w *engine.Workflow) {
		for i := range w.Steps {
			w.Steps[i].Status, w.Steps[i].StateOut = engine.StatusCompleted, state
		}
		w.OverallStatus, w.Steps[len(w.Steps)-1].Status = engine.StatusProcessing, engine.StatusWaiting
	})
	h.sandbox.Add(sandbox.Job{RunID: run.ID, Kind: testKind, Caller: "assistant", Namespace: testNamespace})
	h.readyPod(run.ID)

	h.host.Close()
	_, _, err := h.service.Result(t.Context(), "assistant", run.ID)
	Expect(err).To(MatchError(ErrRunner))

	Expect(h.sandbox.DeleteJob(t.Context(), testNamespace, run.ID)).To(Succeed())
	_, _, err = h.service.Result(t.Context(), "assistant", run.ID)
	Expect(err).To(MatchError(ErrExpired))
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
		Name: testKind, Labels: appLabels, QueueTimeoutSeconds: 900,
		UploadTimeoutSeconds: 300,
		RunTimeoutSeconds:    660, ResultTimeoutSeconds: 300, MaxDurationSeconds: 4380,
	}
	Expect(h.service.Kinds("assistant")).To(Equal([]Kind{upgrade}))
	Expect(h.service.Kinds("other")).To(Equal([]Kind{upgrade}))
	Expect(h.service.Kinds("designer")).To(BeEmpty())
	Expect(h.service.Kinds("nobody")).To(BeEmpty())
}
