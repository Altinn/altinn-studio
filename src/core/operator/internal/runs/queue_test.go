package runs

import (
	"testing"
	"time"

	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
)

var (
	queueStart = time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC)
	limits     = config.Kind{MaxActive: 2, MaxActivePerCaller: 1}
)

func at(seconds int) time.Time {
	return queueStart.Add(time.Duration(seconds) * time.Second)
}

// newQueue returns a queue past its warmup.
func newQueue() (*Queue, *clock.FakeClock) {
	clk := clock.NewFakeClockAt(queueStart)
	q := NewQueue(clk)
	q.Open()
	clk.Advance(warmup)
	return q, clk
}

func TestQueueAdmitsTheOldestRunsThatFit(t *testing.T) {
	RegisterTestingT(t)
	q, _ := newQueue()

	// The assistant's younger run waits behind its older one, and the other caller's run passes both.
	q.Register("a", testKind, "assistant", at(1))
	Expect(q.Admit("c", testKind, "assistant", at(3), limits, nil)).To(Equal(Admission{Position: 2}))
	Expect(q.Admit("b", testKind, "other", at(2), limits, nil)).To(Equal(Admission{Admitted: true}))
	Expect(q.Admit("a", testKind, "assistant", at(1), limits, nil)).To(Equal(Admission{Admitted: true}))

	// The kind is full now.
	Expect(q.Admit("c", testKind, "assistant", at(3), limits, nil)).To(Equal(Admission{Position: 1}))
	Expect(q.Admit("d", testKind, "designer", at(4), limits, nil)).To(Equal(Admission{Position: 2}))
	position, ok := q.Position("d")
	Expect(ok).To(BeTrue())
	Expect(position).To(Equal(2))

	// An admitted run asking again stays admitted.
	Expect(q.Admit("a", testKind, "assistant", at(1), limits, nil).Admitted).To(BeTrue())

	// When a finishes, c is next, and it is the assistant's only active run.
	q.Forget("a")
	Expect(q.Admit("d", testKind, "designer", at(4), limits, nil)).To(Equal(Admission{Position: 2}))
	Expect(q.Admit("c", testKind, "assistant", at(3), limits, nil).Admitted).To(BeTrue())
}

func TestQueueSkipsACallerAtItsLimit(t *testing.T) {
	RegisterTestingT(t)
	q, _ := newQueue()
	jobs := []JobRef{{RunID: "running", Caller: "assistant"}}

	// The assistant's oldest waiting run cannot start, so the other caller's younger run goes first.
	Expect(q.Admit("a", testKind, "assistant", at(1), limits, jobs)).To(Equal(Admission{Position: 1}))
	Expect(q.Admit("b", testKind, "other", at(2), limits, jobs)).To(Equal(Admission{Admitted: true}))
}

func TestQueueCountsJobsAndReservations(t *testing.T) {
	RegisterTestingT(t)
	q, clk := newQueue()
	wide := config.Kind{MaxActive: 2, MaxActivePerCaller: 2}

	Expect(q.Admit("a", testKind, "assistant", at(1), wide, nil).Admitted).To(BeTrue())
	jobs := []JobRef{{RunID: "a", Caller: "assistant"}, {RunID: "x", Caller: "other"}}
	// a's Job and its reservation count once.
	Expect(q.Admit("b", testKind, "assistant", at(2), wide, jobs).Admitted).To(BeFalse())
	Expect(q.Admit("b", testKind, "assistant", at(2), wide, jobs[:1]).Admitted).To(BeTrue())

	// A reservation whose Job never appears is forgotten.
	clk.Advance(admittedTTL + time.Second)
	Expect(q.Admit("c", testKind, "assistant", at(3), wide, nil).Admitted).To(BeTrue())

	// Other kinds have their own limits.
	Expect(q.Admit("d", "other-kind", "assistant", at(4), config.Kind{MaxActive: 1, MaxActivePerCaller: 1}, nil).
		Admitted).To(BeTrue())
}

func TestQueueForgetsRunsThatStopAsking(t *testing.T) {
	RegisterTestingT(t)
	q, clk := newQueue()
	full := []JobRef{{RunID: "x", Caller: "other"}, {RunID: "y", Caller: "other"}}

	q.Admit("a", testKind, "assistant", at(1), limits, full)
	q.Admit("b", testKind, "assistant", at(2), limits, full)
	Expect(q.Waiting(testKind, "assistant")).To(Equal(2))

	// a's workflow was canceled, so the engine stops calling run.admit for it.
	clk.Advance(AdmitRecheck)
	q.Admit("b", testKind, "assistant", at(2), limits, full)
	clk.Advance(waitingTTL)
	q.Admit("b", testKind, "assistant", at(2), limits, full)
	Expect(q.Waiting(testKind, "assistant")).To(Equal(1))
	Expect(q.Admit("b", testKind, "assistant", at(2), limits, full)).To(Equal(Admission{Position: 1}))
	Expect(q.WaitingByKind()).To(Equal(map[string]int{testKind: 1}))
}

// After a restart the queue is empty. The engine calls run.admit for each waiting run again. The new queue admits no
// one until they all have asked, so the runs take their places by their reference times, whatever
// order they ask in.
func TestQueueRebuildsAfterARestart(t *testing.T) {
	RegisterTestingT(t)
	jobs := []JobRef{{RunID: "running", Caller: "other"}}
	wide := config.Kind{MaxActive: 2, MaxActivePerCaller: 2}

	clk := clock.NewFakeClockAt(queueStart.Add(time.Hour))
	after := NewQueue(clk)
	after.Open()
	Expect(after.Admit("c", testKind, "assistant", at(2), wide, jobs)).To(Equal(Admission{Position: 1}))
	Expect(after.Admit("b", testKind, "assistant", at(1), wide, jobs)).To(Equal(Admission{Position: 1}))
	Expect(after.Admit("a", testKind, "assistant", at(0), wide, jobs)).To(Equal(Admission{Position: 1}))
	position, ok := after.Position("c")
	Expect(ok).To(BeTrue())
	Expect(position).To(Equal(3))

	// The running run's Job counts at once, so it never waits.
	Expect(after.Admit("running", testKind, "other", at(0), wide, jobs).Admitted).To(BeTrue())

	// They ask again every recheck while the queue warms up.
	for range int(warmup/AdmitRecheck) - 1 {
		clk.Advance(AdmitRecheck)
		for i, id := range []string{"c", "b", "a"} {
			Expect(after.Admit(id, testKind, "assistant", at(2-i), wide, jobs).Admitted).To(BeFalse())
		}
	}
	clk.Advance(AdmitRecheck)
	Expect(after.Admit("c", testKind, "assistant", at(2), wide, jobs)).To(Equal(Admission{Position: 3}))
	Expect(after.Admit("b", testKind, "assistant", at(1), wide, jobs)).To(Equal(Admission{Position: 2}))
	Expect(after.Admit("a", testKind, "assistant", at(0), wide, jobs).Admitted).To(BeTrue())
	position, ok = after.Position("c")
	Expect(ok).To(BeTrue())
	Expect(position).To(Equal(2))
}

func TestRegisterCountsTowardsTheQueueLimit(t *testing.T) {
	RegisterTestingT(t)
	q, _ := newQueue()

	q.Register("a", testKind, "assistant", at(0))
	q.Register("b", testKind, "assistant", at(1))
	Expect(q.Waiting(testKind, "assistant")).To(Equal(2))
	Expect(q.Waiting(testKind, "other")).To(Equal(0))
	position, ok := q.Position("b")
	Expect(ok).To(BeTrue())
	Expect(position).To(Equal(2))

	q.KeepAdmitted("a", testKind, "assistant")
	q.Register("a", testKind, "assistant", at(0))
	Expect(q.Waiting(testKind, "assistant")).To(Equal(1), "an admitted run does not go back in line")
}

// After a restart, the engine calls back on its retry backoff, which can have grown while the operator was down. The
// queue admits no one until it serves callbacks and every run has had the time to call again.
func TestQueueWaitsForTheEngineToCallAgain(t *testing.T) {
	RegisterTestingT(t)
	clk := clock.NewFakeClockAt(queueStart)
	q := NewQueue(clk)
	wide := config.Kind{MaxActive: 1, MaxActivePerCaller: 1}

	// The operator waits for its cache before it serves.
	clk.Advance(20 * time.Second)
	Expect(q.Admit("b", testKind, "other", at(2), wide, nil).Admitted).To(BeFalse())

	q.Open()
	// a was admitted before the restart, and its run.create-job retries on the engine's longest backoff.
	clk.Advance(retryMaxDelay + quotaRecheck)
	q.KeepAdmitted("a", testKind, "assistant")
	Expect(q.Admit("b", testKind, "other", at(2), wide, nil).Admitted).To(BeFalse())

	clk.Advance(warmup)
	Expect(q.Admit("b", testKind, "other", at(2), wide, nil)).To(Equal(Admission{Position: 1}), "a holds the place")
	q.Forget("a")
	Expect(q.Admit("b", testKind, "other", at(2), wide, nil).Admitted).To(BeTrue())
	Expect(warmup).To(BeNumerically(">=", retryMaxDelay+quotaRecheck))
}
