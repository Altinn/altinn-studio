package runs

import (
	"slices"
	"strings"
	"sync"
	"time"

	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/sandbox"
)

const (
	// AdmitRecheck is how long a queued run waits before the engine calls run.admit again.
	AdmitRecheck = 3 * time.Second
	// waitingTTL forgets a queued run that the engine stopped asking about, which happens when its workflow is
	// canceled. A forgotten run that asks again gets its place back, because its place is its reference time.
	waitingTTL = 4 * AdmitRecheck
	// admittedTTL forgets an admitted run whose Job does not appear. run.create-job renews the reservation while it
	// waits for quota, so this only frees the place of a run whose workflow stopped.
	admittedTTL = time.Minute
	// engineLatency is how late the engine may run a step that is due, when it has many to run.
	engineLatency = 10 * time.Second
	// warmup is how long a queue admits no one after the operator starts to serve callbacks. While the operator was
	// down, the engine's retry backoff grew up to retryMaxDelay, so a run may call again that much later, and then
	// defer once more. By the end of the warmup every queued run has asked again, and every admitted run without a Job
	// has renewed its reservation from run.create-job, so no run passes an older one and the kind's limit holds.
	warmup = retryMaxDelay + max(AdmitRecheck, quotaRecheck) + engineLatency
)

// Queue decides which runs may start. It lives in memory, and the engine rebuilds it after a restart: each queued run
// calls run.admit again, a run at run.create-job or waiting for its Job renews its reservation, and later runs have
// Jobs. The ResourceQuota cannot stand in for the queue: its KVM, CPU and memory limits apply to pods, not Jobs, so
// it lets the operator create a Job too many, whose pod then waits.
type Queue struct {
	started  time.Time
	clock    clock.Clock
	waiting  map[string]*waitingRun
	admitted map[string]*admittedRun
	mu       sync.Mutex
}

type waitingRun struct {
	ref    time.Time
	seen   time.Time
	runID  string
	kind   string
	caller string
}

type admittedRun struct {
	at     time.Time
	kind   string
	caller string
}

// NewQueue returns a queue that admits no one until Open.
func NewQueue(clk clock.Clock) *Queue {
	return &Queue{
		clock:    clk,
		waiting:  make(map[string]*waitingRun),
		admitted: make(map[string]*admittedRun),
	}
}

// Open starts the warmup. The operator calls it when it starts to serve callbacks, after its cache has synced, since
// the engine's retries reach the queue only from then.
func (q *Queue) Open() {
	q.mu.Lock()
	defer q.mu.Unlock()
	if q.started.IsZero() {
		q.started = q.clock.Now()
	}
}

// Admission is the answer to Admit: either admitted, or the 1-based position in the kind's queue.
type Admission struct {
	Position int
	Admitted bool
}

// Register puts a new run in the queue before its first run.admit, so the queue limit and the position count it at
// once.
func (q *Queue) Register(runID, kind, caller string, ref time.Time) {
	q.mu.Lock()
	defer q.mu.Unlock()
	if _, ok := q.admitted[runID]; ok {
		return
	}
	now := q.clock.Now()
	q.waiting[runID] = &waitingRun{runID: runID, kind: kind, caller: caller, ref: ref, seen: now}
}

// Admit registers a run with its place in line, ref, and admits it when it is among the oldest runs of the kind that
// fit under the limits. jobs are the kind's unfinished Jobs.
func (q *Queue) Admit(runID, kind, caller string, ref time.Time, limits config.Kind, jobs []sandbox.Ref) Admission {
	q.mu.Lock()
	defer q.mu.Unlock()
	now := q.clock.Now()
	q.forgetStaleLocked(now)

	if _, ok := q.admitted[runID]; ok {
		return Admission{Admitted: true}
	}
	if slices.ContainsFunc(jobs, func(job sandbox.Ref) bool { return job.RunID == runID }) {
		return Admission{Admitted: true}
	}

	entry, ok := q.waiting[runID]
	if !ok {
		entry = &waitingRun{runID: runID, kind: kind, caller: caller}
		q.waiting[runID] = entry
	}
	entry.ref = ref
	entry.seen = now

	candidates := q.waitingLocked(kind)
	if q.started.IsZero() || now.Sub(q.started) < warmup {
		return Admission{Position: slices.Index(candidates, entry) + 1}
	}
	active, perCaller := q.activeLocked(kind, jobs)
	for _, candidate := range candidates {
		if active >= limits.MaxActive {
			break
		}
		if perCaller[candidate.caller] >= limits.MaxActivePerCaller {
			continue
		}
		if candidate.runID == runID {
			delete(q.waiting, runID)
			q.admitted[runID] = &admittedRun{kind: kind, caller: caller, at: now}
			return Admission{Admitted: true}
		}
		// An older run fits. Its place is kept for it until it asks.
		active++
		perCaller[candidate.caller]++
	}

	return Admission{Position: slices.Index(candidates, entry) + 1}
}

// KeepAdmitted renews the reservation of an admitted run that has no Job yet.
func (q *Queue) KeepAdmitted(runID, kind, caller string) {
	q.mu.Lock()
	defer q.mu.Unlock()
	delete(q.waiting, runID)
	q.admitted[runID] = &admittedRun{kind: kind, caller: caller, at: q.clock.Now()}
}

// Forget removes a run that finished, was canceled or gave up waiting.
func (q *Queue) Forget(runID string) {
	q.mu.Lock()
	defer q.mu.Unlock()
	delete(q.waiting, runID)
	delete(q.admitted, runID)
}

// Position returns the 1-based position of a queued run in its kind's queue.
func (q *Queue) Position(runID string) (int, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()
	entry, ok := q.waiting[runID]
	if !ok {
		return 0, false
	}
	candidates := q.waitingLocked(entry.kind)
	return slices.Index(candidates, entry) + 1, true
}

// Waiting counts the queued runs of a caller for a kind.
func (q *Queue) Waiting(kind, caller string) int {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.forgetStaleLocked(q.clock.Now())
	count := 0
	for _, entry := range q.waiting {
		if entry.kind == kind && entry.caller == caller {
			count++
		}
	}
	return count
}

// WaitingByKind counts the queued runs of each kind, for the queue metric.
func (q *Queue) WaitingByKind() map[string]int {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.forgetStaleLocked(q.clock.Now())
	counts := make(map[string]int)
	for _, entry := range q.waiting {
		counts[entry.kind]++
	}
	return counts
}

func (q *Queue) forgetStaleLocked(now time.Time) {
	for id, entry := range q.waiting {
		if now.Sub(entry.seen) > waitingTTL {
			delete(q.waiting, id)
		}
	}
	for id, entry := range q.admitted {
		if now.Sub(entry.at) > admittedTTL {
			delete(q.admitted, id)
		}
	}
}

// activeLocked counts the runs that hold a place in the sandbox: Jobs, and admitted runs without a Job yet.
func (q *Queue) activeLocked(kind string, jobs []sandbox.Ref) (int, map[string]int) {
	perCaller := make(map[string]int)
	withJob := make(map[string]bool, len(jobs))
	for _, job := range jobs {
		withJob[job.RunID] = true
		perCaller[job.Caller]++
	}
	active := len(jobs)
	for id, entry := range q.admitted {
		if entry.kind == kind && !withJob[id] {
			active++
			perCaller[entry.caller]++
		}
	}
	return active, perCaller
}

// waitingLocked returns the kind's queued runs, oldest first. The run id breaks ties so the order is stable.
func (q *Queue) waitingLocked(kind string) []*waitingRun {
	var candidates []*waitingRun
	for _, entry := range q.waiting {
		if entry.kind == kind {
			candidates = append(candidates, entry)
		}
	}
	slices.SortFunc(candidates, func(a, b *waitingRun) int {
		if c := a.ref.Compare(b.ref); c != 0 {
			return c
		}
		return strings.Compare(a.runID, b.runID)
	})
	return candidates
}
