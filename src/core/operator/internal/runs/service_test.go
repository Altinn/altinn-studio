package runs

import (
	"bytes"
	"errors"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/jobhost"
	"altinn.studio/core-operator/internal/sandbox"
)

// A create for a kind and source that the caller has in progress finds that run, so a retried create, or one from a
// caller that restarted, makes no second run.
func TestCreateFindsTheRunInProgress(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()

	first := h.create(t, "assistant", "app")

	again, created, err := h.service.Create(ctx, "assistant", CreateRequest{Kind: testKind, Source: testSource("app")})
	Expect(err).NotTo(HaveOccurred())
	Expect(created).To(BeFalse())
	Expect(again.ID).To(Equal(first.ID))
	Expect(h.engine.Workflows()).To(HaveLen(1))

	// Names are compared without case.
	upper := testSource("APP")
	upper.RepoOwner = "TTD"
	again, created, err = h.service.Create(ctx, "assistant", CreateRequest{Kind: testKind, Source: upper})
	Expect(err).NotTo(HaveOccurred())
	Expect(created).To(BeFalse())
	Expect(again.ID).To(Equal(first.ID))

	// Another caller, another commit and another kind are other runs.
	other := h.create(t, "other", "app")
	Expect(other.ID).NotTo(Equal(first.ID))
	nextCommit := testSource("app")
	nextCommit.Commit = strings.Repeat("f", 40)
	next, created, err := h.service.Create(ctx, "assistant", CreateRequest{Kind: testKind, Source: nextCommit})
	Expect(err).NotTo(HaveOccurred())
	Expect(created).To(BeTrue())
	Expect(next.ID).NotTo(Equal(first.ID))
}

// Once a run has ended, a create for the same kind and source makes a new run, and the next create finds that one.
func TestCreateAfterARunEndedMakesANewRun(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()
	request := CreateRequest{Kind: testKind, Source: testSource("app")}

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

// The engine keeps the run: its labels name it and its source, and its initial state has its kind.
func TestCreateStoresTheRunInTheEngine(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	Expect(run.ID).To(Equal(RunID("assistant", createKey(testKind, testSource("app"), ""))))
	Expect(run.Kind).To(Equal(testKind))
	Expect(run.Source).To(Equal(testSource("app")))
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

func TestCreateChecksTheKindTheSourceAndTheQueue(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()

	_, _, err := h.service.Create(ctx, "assistant", CreateRequest{Kind: "unknown", Source: testSource("app")})
	Expect(err).To(MatchError(ErrKindNotFound))
	_, _, err = h.service.Create(ctx, "designer", CreateRequest{Kind: testKind, Source: testSource("app")})
	Expect(err).To(MatchError(ErrKindForbidden))

	for name, change := range map[string]func(*Source){
		"source.commit must be": func(s *Source) { s.Commit = "main" },
		"source.repo must be":   func(s *Source) { s.Repo = "../app" },
		"source.org must be":    func(s *Source) { s.Org = "" },
		"source.app must be":    func(s *Source) { s.App = strings.Repeat("a", 101) },
	} {
		source := testSource("app")
		change(&source)
		_, _, err = h.service.Create(ctx, "assistant", CreateRequest{Kind: testKind, Source: source})
		var invalid *RequestError
		Expect(err).To(BeAssignableToTypeOf(invalid), name)
		Expect(err).To(MatchError(HavePrefix(name)))
	}

	// maxQueuedPerCaller is 2.
	h.create(t, "assistant", "a")
	h.create(t, "assistant", "b")
	_, _, err = h.service.Create(ctx, "assistant", CreateRequest{Kind: testKind, Source: testSource("c")})
	Expect(err).To(MatchError(ErrQueueFull))
	// A queued run is found, not made again.
	_, created, err := h.service.Create(ctx, "assistant", CreateRequest{Kind: testKind, Source: testSource("a")})
	Expect(err).NotTo(HaveOccurred())
	Expect(created).To(BeFalse())
	// Another caller has its own queue.
	h.create(t, "other", "c")
}

func TestCreateAnswersUnavailableWhenTheEngineIsDown(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()
	request := CreateRequest{Kind: testKind, Source: testSource("app")}

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
				CreateRequest{Kind: testKind, Source: testSource("app")})
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

	found, err := h.service.Find(ctx, "assistant", Filter{Source: Source{Org: "TTD"}})
	Expect(err).NotTo(HaveOccurred())
	Expect(found).To(HaveLen(2))
	Expect(found[0].ID).To(Equal(second.ID))
	Expect(found[1].ID).To(Equal(first.ID))

	found, err = h.service.Find(ctx, "assistant", Filter{
		Source: Source{RepoOwner: "ttd", Repo: "app", Commit: testCommit}, Kind: testKind,
	})
	Expect(err).NotTo(HaveOccurred())
	Expect(found).To(HaveLen(1))
	Expect(found[0].ID).To(Equal(first.ID))

	found, err = h.service.Find(ctx, "assistant", Filter{Source: Source{Repo: "nothing"}})
	Expect(err).NotTo(HaveOccurred())
	Expect(found).To(BeEmpty())

	var invalid *RequestError
	_, err = h.service.Find(ctx, "assistant", Filter{})
	Expect(err).To(BeAssignableToTypeOf(invalid))
	_, err = h.service.Find(ctx, "assistant", Filter{Source: Source{Commit: "main"}})
	Expect(err).To(MatchError(HavePrefix("commit must be")))
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
	Expect(h.host.Claimed()).To(BeEmpty(), "the job host did not take the body")

	Expect(h.uploadArchive(t, run.ID, "app")).To(Succeed())
	Expect(h.uploadArchive(t, run.ID, "app")).To(Succeed(), "an upload that comes again")
}

// The result lives in the Job. Once the job host has exited, the result is gone, while the engine still has the
// run's status.
func TestResultExpiresWithTheJob(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()

	run := h.create(t, "assistant", "app")
	h.startCommand(t, run.ID)
	h.host.Finish(jobhost.Status{Status: jobhost.StatusCompleted, ExitCode: new(0)}, `{"status":"completed"}`)
	Expect(h.step(t, run.ID, StepAwaitResult).done()).To(BeTrue())

	h.host.Close()
	h.setPod(run.ID, sandbox.PodEnded, "")
	_, _, err := h.service.Result(ctx, "assistant", run.ID)
	Expect(err).To(MatchError(ErrExpired))
	completed := h.get(t, run.ID)
	Expect(completed.Status).To(Equal(StatusCompleted))
	Expect(completed.Kind).To(Equal(testKind))
}

// A job host that does not answer while its pod still runs may answer later, so the caller retries.
func TestResultIsUnavailableWhileTheJobHostDoesNotAnswer(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	h.startCommand(t, run.ID)
	h.host.Finish(jobhost.Status{Status: jobhost.StatusCompleted, ExitCode: new(0)}, `{"status":"completed"}`)
	Expect(h.step(t, run.ID, StepAwaitResult).done()).To(BeTrue())

	h.host.Close()
	_, _, err := h.service.Result(t.Context(), "assistant", run.ID)
	Expect(err).To(MatchError(ErrJobHost))
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
		Name: testKind, Args: []string{}, QueueTimeoutSeconds: 900, UploadTimeoutSeconds: 300,
		RunTimeoutSeconds: 660, ResultTimeoutSeconds: 300, MaxDurationSeconds: 4380,
	}
	withArgs := upgrade
	withArgs.Name = argsKind
	withArgs.Args = []string{"mode", "target"}
	Expect(h.service.Kinds("assistant")).To(Equal([]Kind{upgrade, withArgs}))
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

func TestCreateKeepsTheArgumentsInTheInitialState(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	args := map[string]string{"target": "v9", "mode": "dry-run"}
	run, created, err := h.service.Create(t.Context(), "assistant",
		CreateRequest{Kind: argsKind, Source: testSource("app"), Args: args})
	Expect(err).NotTo(HaveOccurred())
	Expect(created).To(BeTrue())

	stored, ok := h.engine.Workflow(h.workflowID(t, run.ID))
	Expect(ok).To(BeTrue())
	state, err := parseState(stored.Request.Workflows[0].State)
	Expect(err).NotTo(HaveOccurred())
	Expect(state.Args).To(Equal(args))
}

func TestCreateRefusesArgumentsBeforeTheEngine(t *testing.T) {
	tooMany := make(map[string]string)
	for i := range 17 {
		tooMany["arg-"+strconv.Itoa(i)] = "x"
	}
	cases := map[string]struct {
		args    map[string]string
		kind    string
		message string
	}{
		"an argument the kind does not accept": {
			kind: argsKind, args: map[string]string{"target": "v9", "branch": "main"},
			message: "The kind with-args does not accept the argument branch.",
		},
		"an argument for a kind without arguments": {
			kind: testKind, args: map[string]string{"target": "v9"},
			message: "The kind upgrade-v9 does not accept the argument target.",
		},
		"a name that is no name": {
			kind: argsKind, args: map[string]string{"Target": "v9"},
			message: "An argument name must be a lowercase name of at most 63 characters.",
		},
		"too many arguments": {kind: argsKind, args: tooMany, message: "Send at most 16 arguments."},
		"a value over 1024 characters": {
			kind: argsKind, args: map[string]string{"target": strings.Repeat("x", 1025)},
			message: "The argument target is longer than 1024 characters.",
		},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			RegisterTestingT(t)
			h := newHarness(t)
			_, _, err := h.service.Create(t.Context(), "assistant",
				CreateRequest{Kind: c.kind, Source: testSource("app"), Args: c.args})
			var invalid *RequestError
			Expect(err).To(BeAssignableToTypeOf(invalid))
			Expect(err).To(MatchError(HavePrefix(c.message)))
			Expect(h.engine.Workflows()).To(BeEmpty())
		})
	}

	t.Run("1024 characters of more than one byte", func(t *testing.T) {
		RegisterTestingT(t)
		h := newHarness(t)
		_, created, err := h.service.Create(t.Context(), "assistant", CreateRequest{
			Kind: argsKind, Source: testSource("app"), Args: map[string]string{"target": strings.Repeat("æ", 1024)},
		})
		Expect(err).NotTo(HaveOccurred())
		Expect(created).To(BeTrue())
	})
}

// A run in progress has its arguments. A create with other ones is a conflict, not a second run.
func TestCreateComparesTheArgumentsOfTheRunInProgress(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	create := func(args map[string]string) (*Run, bool, error) {
		return h.service.Create(t.Context(), "assistant",
			CreateRequest{Kind: argsKind, Source: testSource("app"), Args: args})
	}

	first, created, err := create(map[string]string{"target": "v9", "mode": "dry-run"})
	Expect(err).NotTo(HaveOccurred())
	Expect(created).To(BeTrue())

	again, created, err := create(map[string]string{"mode": "dry-run", "target": "v9"})
	Expect(err).NotTo(HaveOccurred())
	Expect(created).To(BeFalse())
	Expect(again.ID).To(Equal(first.ID))

	for _, other := range []map[string]string{{"target": "v10", "mode": "dry-run"}, {"target": "v9"}, nil} {
		_, _, err = create(other)
		Expect(err).To(MatchError(ErrConflict), "%v", other)
	}
	Expect(h.engine.Workflows()).To(HaveLen(1))
}

// No arguments and an empty object are the same run.
func TestCreateTakesAbsentAndEmptyArgumentsAsTheSame(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	first := h.create(t, "assistant", "app")
	again, created, err := h.service.Create(t.Context(), "assistant",
		CreateRequest{Kind: testKind, Source: testSource("app"), Args: map[string]string{}})
	Expect(err).NotTo(HaveOccurred())
	Expect(created).To(BeFalse())
	Expect(again.ID).To(Equal(first.ID))
}
