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

// newQueue returns an unopened queue of testKind and other-kind, whose warmup ends at queueStart if it opens now.
func newQueue(maxActive, maxActivePerCaller int) (*Queue, *clock.FakeClock, *sandboxtest.Sandbox) {
	kind := config.Kind{Namespace: testNamespace, MaxActivePerCaller: maxActivePerCaller}
	clk := clock.NewFakeClockAt(queueStart.Add(-warmup))
	box := sandboxtest.New()
	box.SlotCount = maxActive
	cfg := &config.Config{Kinds: map[string]config.Kind{testKind: kind, "other-kind": kind}}
	return NewQueue(cfg, box, clk), clk, box
}

// openQueue returns a queue past its warmup, for at most two active runs.
func openQueue(maxActivePerCaller int) (*Queue, *clock.FakeClock, *sandboxtest.Sandbox) {
	q, clk, box := newQueue(2, maxActivePerCaller)
	q.Open()
	clk.Advance(warmup)
	return q, clk, box
}

func queued(id, caller string) Work {
	return Work{ID: id, Kind: testKind, Caller: caller}
}

func addJob(box *sandboxtest.Sandbox, id, caller string) {
	box.Add(sandbox.Job{RunID: id, Kind: testKind, Caller: caller, Namespace: testNamespace})
}

func TestQueueAdmitsTheOldestRunsThatFit(t *testing.T) {
	RegisterTestingT(t)
	q, _, _ := openQueue(1)

	// The assistant's younger run waits behind its older one, and the other caller's run passes both.
	Expect(q.Join(queued("a", "assistant"), 2)).To(Succeed())
	Expect(q.Admit(t.Context(), queued("c", "assistant"), at(3))).To(Equal(Admission{Position: 2}))
	Expect(q.Admit(t.Context(), queued("b", "other"), at(2))).To(Equal(Admission{Admitted: true}))
	Expect(q.Admit(t.Context(), queued("a", "assistant"), at(1))).To(Equal(Admission{Admitted: true}))

	// The kind is full now.
	Expect(q.Admit(t.Context(), queued("c", "assistant"), at(3))).To(Equal(Admission{Position: 1}))
	Expect(q.Admit(t.Context(), queued("d", "designer"), at(4))).To(Equal(Admission{Position: 2}))
	position, ok := q.Position("d")
	Expect(ok).To(BeTrue())
	Expect(position).To(Equal(2))

	// An admitted run that asks again stays admitted.
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

	// The queue forgets a reservation whose Job does not appear.
	clk.Advance(admittedTTL + time.Second)
	Expect(q.Admit(t.Context(), queued("c", "assistant"), at(3))).To(Equal(Admission{Admitted: true}))

	// Other kinds count their own runs.
	other := Work{ID: "d", Kind: "other-kind", Caller: "assistant"}
	Expect(q.Admit(t.Context(), other, at(4))).To(Equal(Admission{Admitted: true}))
}

func TestQueueForgetsRunsThatStopAsking(t *testing.T) {
	RegisterTestingT(t)
	q, clk, box := openQueue(1)
	addJob(box, "x", "other")
	addJob(box, "y", "other")

	Expect(q.Admit(t.Context(), queued("a", "assistant"), at(1))).To(Equal(Admission{Position: 1}))
	Expect(q.Admit(t.Context(), queued("b", "assistant"), at(2))).To(Equal(Admission{Position: 2}))
	Expect(q.WaitingByKind()).To(Equal(map[string]int{testKind: 2}))

	// Someone canceled the workflow of a, so the engine stops its calls to run.admit for a.
	clk.Advance(AdmitRecheck)
	Expect(q.Admit(t.Context(), queued("b", "assistant"), at(2))).To(Equal(Admission{Position: 2}))
	clk.Advance(waitingTTL)
	Expect(q.Admit(t.Context(), queued("b", "assistant"), at(2))).To(Equal(Admission{Position: 1}))
	Expect(q.WaitingByKind()).To(Equal(map[string]int{testKind: 1}))
}

// After a restart, the runs take their places by their reference times, whatever order they ask in.
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

	// They ask again at each recheck during the warmup.
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

func TestJoinRefusesACallerAtItsQueueLimit(t *testing.T) {
	RegisterTestingT(t)
	q, _, _ := openQueue(1)

	Expect(q.Join(queued("a", "assistant"), 2)).To(Succeed())
	Expect(q.Join(queued("b", "assistant"), 2)).To(Succeed())
	Expect(q.Join(queued("c", "assistant"), 2)).To(MatchError(ErrQueueFull))
	Expect(q.Join(queued("a", "assistant"), 2)).To(Succeed(), "a run in line keeps its place")
	Expect(q.Join(queued("d", "other"), 2)).To(Succeed())

	q.Hold(queued("a", "assistant"))
	Expect(q.Join(queued("a", "assistant"), 2)).To(Succeed())
	_, ok := q.Position("a")
	Expect(ok).To(BeFalse(), "an admitted run does not go back in line")
	Expect(q.Join(queued("c", "assistant"), 2)).To(Succeed())
}

// The warmup starts when the operator serves callbacks, and outlasts the engine's longest retry backoff.
func TestQueueWaitsForTheEngineToCallAgain(t *testing.T) {
	RegisterTestingT(t)
	q, clk, _ := newQueue(1, 1)

	// The operator waits for its cache before it serves.
	clk.Advance(20 * time.Second)
	Expect(q.Admit(t.Context(), queued("b", "other"), at(2))).To(Equal(Admission{Position: 1}))

	q.Open()
	// The queue admitted a before the restart, and its run.create-job retries on the longest backoff of the engine.
	clk.Advance(retryMaxDelay + quotaRecheck)
	q.Hold(queued("a", "assistant"))
	Expect(q.Admit(t.Context(), queued("b", "other"), at(2))).To(Equal(Admission{Position: 1}))

	clk.Advance(warmup)
	Expect(q.Admit(t.Context(), queued("b", "other"), at(2))).To(Equal(Admission{Position: 1}), "a holds the place")
	q.Forget("a")
	Expect(q.Admit(t.Context(), queued("b", "other"), at(2))).To(Equal(Admission{Admitted: true}))
	Expect(warmup).To(BeNumerically(">=", retryMaxDelay+quotaRecheck))
}
