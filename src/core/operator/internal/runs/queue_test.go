package runs

import (
	"testing"
	"time"

	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/sandbox"
	"altinn.studio/core-operator/internal/sandbox/sandboxtest"
)

var queueStart = time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC)

func at(seconds int) time.Time {
	return queueStart.Add(time.Duration(seconds) * time.Second)
}

// newQueue returns a queue for testKind with these limits, over a sandbox without Jobs. The queue has not opened.
func newQueue(maxActive, maxActivePerCaller int) (*Queue, *clock.FakeClock, *sandboxtest.Sandbox) {
	kind := config.Kind{Namespace: testNamespace, MaxActive: maxActive, MaxActivePerCaller: maxActivePerCaller}
	clk := clock.NewFakeClockAt(queueStart)
	box := sandboxtest.New()
	return NewQueue(&config.Config{Kinds: map[string]config.Kind{testKind: kind}}, box, clk), clk, box
}

// openQueue returns a queue past its warmup, for at most two active runs.
func openQueue(maxActivePerCaller int) (*Queue, *clock.FakeClock, *sandboxtest.Sandbox) {
	q, clk, box := newQueue(2, maxActivePerCaller)
	q.Open()
	clk.Advance(warmup)
	return q, clk, box
}

// queued is a run of testKind.
func queued(id, caller string) *stepRun {
	return &stepRun{id: id, caller: caller, state: &runState{Kind: testKind, Spec: KindSpec{Namespace: testNamespace}}}
}

func addJob(box *sandboxtest.Sandbox, id, caller string) {
	box.Add(sandbox.Job{RunID: id, Kind: testKind, Caller: caller, Namespace: testNamespace})
}

func TestQueueAdmitsTheOldestRunsThatFit(t *testing.T) {
	RegisterTestingT(t)
	q, _, _ := openQueue(1)

	// The assistant's younger run waits behind its older one, and the other caller's run passes both.
	q.Register("a", testKind, "assistant", at(1))
	Expect(q.Admit(t.Context(), queued("c", "assistant"), at(3))).To(Equal(Admission{Position: 2}))
	Expect(q.Admit(t.Context(), queued("b", "other"), at(2))).To(Equal(Admission{Admitted: true}))
	Expect(q.Admit(t.Context(), queued("a", "assistant"), at(1))).To(Equal(Admission{Admitted: true}))

	// The kind is full now.
	Expect(q.Admit(t.Context(), queued("c", "assistant"), at(3))).To(Equal(Admission{Position: 1}))
	Expect(q.Admit(t.Context(), queued("d", "designer"), at(4))).To(Equal(Admission{Position: 2}))
	position, ok := q.Position("d")
	Expect(ok).To(BeTrue())
	Expect(position).To(Equal(2))

	// An admitted run asking again stays admitted.
	Expect(q.Admit(t.Context(), queued("a", "assistant"), at(1))).To(Equal(Admission{Admitted: true}))

	// When a finishes, c is next, and it is the assistant's only active run.
	q.Forget("a")
	Expect(q.Admit(t.Context(), queued("d", "designer"), at(4))).To(Equal(Admission{Position: 2}))
	Expect(q.Admit(t.Context(), queued("c", "assistant"), at(3))).To(Equal(Admission{Admitted: true}))
}

func TestQueueSkipsACallerAtItsLimit(t *testing.T) {
	RegisterTestingT(t)
	q, _, box := openQueue(1)
	addJob(box, "running", "assistant")

	// The assistant's oldest waiting run cannot start, so the other caller's younger run goes first.
	Expect(q.Admit(t.Context(), queued("a", "assistant"), at(1))).To(Equal(Admission{Position: 1}))
	Expect(q.Admit(t.Context(), queued("b", "other"), at(2))).To(Equal(Admission{Admitted: true}))
}

func TestQueueCountsJobsAndReservations(t *testing.T) {
	RegisterTestingT(t)
	q, clk, box := openQueue(2)

	Expect(q.Admit(t.Context(), queued("a", "assistant"), at(1))).To(Equal(Admission{Admitted: true}))
	addJob(box, "a", "assistant")
	addJob(box, "x", "other")
	// a's Job and its reservation count once.
	Expect(q.Admit(t.Context(), queued("b", "assistant"), at(2))).To(Equal(Admission{Position: 1}))
	Expect(box.DeleteJob(t.Context(), testNamespace, "x")).To(Succeed())
	Expect(q.Admit(t.Context(), queued("b", "assistant"), at(2))).To(Equal(Admission{Admitted: true}))

	// A reservation whose Job never appears is forgotten.
	clk.Advance(admittedTTL + time.Second)
	Expect(q.Admit(t.Context(), queued("c", "assistant"), at(3))).To(Equal(Admission{Admitted: true}))

	// Other kinds have their own limits.
	q.cfg.Kinds["other-kind"] = config.Kind{Namespace: testNamespace, MaxActive: 1, MaxActivePerCaller: 1}
	other := queued("d", "assistant")
	other.state.Kind = "other-kind"
	Expect(q.Admit(t.Context(), other, at(4))).To(Equal(Admission{Admitted: true}))
}

func TestQueueForgetsRunsThatStopAsking(t *testing.T) {
	RegisterTestingT(t)
	q, clk, box := openQueue(1)
	addJob(box, "x", "other")
	addJob(box, "y", "other")

	Expect(q.Admit(t.Context(), queued("a", "assistant"), at(1))).To(Equal(Admission{Position: 1}))
	Expect(q.Admit(t.Context(), queued("b", "assistant"), at(2))).To(Equal(Admission{Position: 2}))
	Expect(q.Waiting(testKind, "assistant")).To(Equal(2))

	// a's workflow was canceled, so the engine stops calling run.admit for it.
	clk.Advance(AdmitRecheck)
	Expect(q.Admit(t.Context(), queued("b", "assistant"), at(2))).To(Equal(Admission{Position: 2}))
	clk.Advance(waitingTTL)
	Expect(q.Admit(t.Context(), queued("b", "assistant"), at(2))).To(Equal(Admission{Position: 1}))
	Expect(q.Waiting(testKind, "assistant")).To(Equal(1))
	Expect(q.WaitingByKind()).To(Equal(map[string]int{testKind: 1}))
}

// After a restart the queue is empty, over the same sandbox. The engine calls run.admit for each waiting run again. The
// new queue admits no one until they all have asked, so the runs take their places by their reference times, whatever
// order they ask in.
func TestQueueRebuildsAfterARestart(t *testing.T) {
	RegisterTestingT(t)
	after, clk, box := newQueue(2, 2)
	addJob(box, "running", "other")
	clk.Advance(time.Hour)
	after.Open()
	Expect(after.Admit(t.Context(), queued("c", "assistant"), at(2))).To(Equal(Admission{Position: 1}))
	Expect(after.Admit(t.Context(), queued("b", "assistant"), at(1))).To(Equal(Admission{Position: 1}))
	Expect(after.Admit(t.Context(), queued("a", "assistant"), at(0))).To(Equal(Admission{Position: 1}))
	position, ok := after.Position("c")
	Expect(ok).To(BeTrue())
	Expect(position).To(Equal(3))

	// The running run's Job counts at once, so it never waits.
	Expect(after.Admit(t.Context(), queued("running", "other"), at(0))).To(Equal(Admission{Admitted: true}))

	// They ask again every recheck while the queue warms up.
	for range int(warmup/AdmitRecheck) - 1 {
		clk.Advance(AdmitRecheck)
		for i, id := range []string{"c", "b", "a"} {
			Expect(after.Admit(t.Context(), queued(id, "assistant"), at(2-i))).To(Equal(Admission{Position: 3 - i}))
		}
	}
	clk.Advance(AdmitRecheck)
	Expect(after.Admit(t.Context(), queued("c", "assistant"), at(2))).To(Equal(Admission{Position: 3}))
	Expect(after.Admit(t.Context(), queued("b", "assistant"), at(1))).To(Equal(Admission{Position: 2}))
	Expect(after.Admit(t.Context(), queued("a", "assistant"), at(0))).To(Equal(Admission{Admitted: true}))
	position, ok = after.Position("c")
	Expect(ok).To(BeTrue())
	Expect(position).To(Equal(2))
}

func TestRegisterCountsTowardsTheQueueLimit(t *testing.T) {
	RegisterTestingT(t)
	q, _, _ := openQueue(1)

	q.Register("a", testKind, "assistant", at(0))
	q.Register("b", testKind, "assistant", at(1))
	Expect(q.Waiting(testKind, "assistant")).To(Equal(2))
	Expect(q.Waiting(testKind, "other")).To(Equal(0))
	position, ok := q.Position("b")
	Expect(ok).To(BeTrue())
	Expect(position).To(Equal(2))

	q.KeepAdmitted(queued("a", "assistant"))
	q.Register("a", testKind, "assistant", at(0))
	Expect(q.Waiting(testKind, "assistant")).To(Equal(1), "an admitted run does not go back in line")
}

// After a restart, the engine calls back on its retry backoff, which can have grown while the operator was down. The
// queue admits no one until it serves callbacks and every run has had the time to call again.
func TestQueueWaitsForTheEngineToCallAgain(t *testing.T) {
	RegisterTestingT(t)
	q, clk, _ := newQueue(1, 1)

	// The operator waits for its cache before it serves.
	clk.Advance(20 * time.Second)
	Expect(q.Admit(t.Context(), queued("b", "other"), at(2))).To(Equal(Admission{Position: 1}))

	q.Open()
	// a was admitted before the restart, and its run.create-job retries on the engine's longest backoff.
	clk.Advance(retryMaxDelay + quotaRecheck)
	q.KeepAdmitted(queued("a", "assistant"))
	Expect(q.Admit(t.Context(), queued("b", "other"), at(2))).To(Equal(Admission{Position: 1}))

	clk.Advance(warmup)
	Expect(q.Admit(t.Context(), queued("b", "other"), at(2))).To(Equal(Admission{Position: 1}), "a holds the place")
	q.Forget("a")
	Expect(q.Admit(t.Context(), queued("b", "other"), at(2))).To(Equal(Admission{Admitted: true}))
	Expect(warmup).To(BeNumerically(">=", retryMaxDelay+quotaRecheck))
}
