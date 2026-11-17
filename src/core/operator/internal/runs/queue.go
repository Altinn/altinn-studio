package runs

import (
	"cmp"
	"context"
	"fmt"
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

// Queue decides which runs may start, and keeps a run's place from its create until its Job holds it. It reads the
// sandbox's slots, the kind's limits and the active Jobs on each admit, so it sees the sandbox as it is now. It lives
// in memory, and the engine's retries rebuild it after a restart. The ResourceQuota cannot replace it, because the
// quota's limits apply to pods and let one Job too many through.
type Queue struct {
	started time.Time
	clock   clock.Clock
	sandbox sandbox.Sandbox
	cfg     *config.Config
	places  map[string]*place
	mu      sync.Mutex
}

// place is a run's place in its kind's queue: in line while the run asks again, and then reserved while the run renews
// it, until the run's Job holds the place.
type place struct {
	ref      time.Time
	seen     time.Time
	runID    string
	kind     string
	caller   string
	admitted bool
}

// NewQueue returns a queue that admits no run until Open. The configuration's TimeScale shortens the warmup and the
// TTLs.
func NewQueue(cfg *config.Config, box sandbox.Sandbox, clk clock.Clock) *Queue {
	return &Queue{cfg: cfg, sandbox: box, clock: clk, places: make(map[string]*place)}
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

// Register puts a new run in line before its first run.admit, so the queue limit and the position count it at once.
func (q *Queue) Register(runID, kind, caller string, ref time.Time) {
	q.mu.Lock()
	defer q.mu.Unlock()
	if found, ok := q.places[runID]; !ok || !found.admitted {
		q.places[runID] = &place{runID: runID, kind: kind, caller: caller, ref: ref, seen: q.clock.Now()}
	}
}

// Admit admits a run when it is among the oldest runs of its kind that fit under the kind's limits, and otherwise keeps
// its place in line by ref, or by now when ref is zero. It ends the run when its kind has left the catalog.
func (q *Queue) Admit(ctx context.Context, run *stepRun, ref time.Time) (Admission, error) {
	limits, ok := q.cfg.Kinds[run.state.Kind]
	if !ok {
		return Admission{}, ends(ReasonStartFailed, "The run's kind is not configured anymore.", nil)
	}
	jobs, err := q.sandbox.ActiveJobs(ctx, run.state.Spec.Namespace, run.state.Kind)
	if err != nil {
		return Admission{}, fmt.Errorf("list the active Jobs: %w", err)
	}
	slots, err := q.sandbox.Slots(ctx, run.state.Spec.Namespace)
	if err != nil {
		return Admission{}, fmt.Errorf("read the sandbox's slots: %w", err)
	}
	q.mu.Lock()
	defer q.mu.Unlock()
	now := q.clock.Now()
	q.forgetStaleLocked(now)

	entry, ok := q.places[run.id]
	if ok && entry.admitted || slices.ContainsFunc(jobs, func(job sandbox.Ref) bool { return job.RunID == run.id }) {
		return Admission{Admitted: true}, nil
	}
	if !ok {
		entry = &place{runID: run.id, kind: run.state.Kind, caller: run.caller}
		q.places[run.id] = entry
	}
	entry.ref, entry.seen = cmp.Or(ref, now), now

	candidates := q.waitingLocked(run.state.Kind)
	if q.started.IsZero() || now.Sub(q.started) < scaled(warmup, q.cfg.TimeScale) {
		return Admission{Position: slices.Index(candidates, entry) + 1}, nil
	}
	active, perCaller := q.activeLocked(run.state.Kind, jobs)
	for _, candidate := range candidates {
		if active >= slots {
			break
		}
		if limits.MaxActivePerCaller > 0 && perCaller[candidate.caller] >= limits.MaxActivePerCaller {
			continue
		}
		if candidate == entry {
			entry.admitted = true
			return Admission{Admitted: true}, nil
		}
		// An older run fits. Its place is kept for it until it asks.
		active++
		perCaller[candidate.caller]++
	}

	return Admission{Position: slices.Index(candidates, entry) + 1}, nil
}

// KeepAdmitted renews the reservation of an admitted run that has no Job yet, also in a queue that has restarted since
// the run was admitted.
func (q *Queue) KeepAdmitted(run *stepRun) {
	q.mu.Lock()
	defer q.mu.Unlock()
	now := q.clock.Now()
	q.places[run.id] = &place{runID: run.id, kind: run.state.Kind, caller: run.caller, seen: now, admitted: true}
}

// Forget removes a run that finished, was canceled or gave up waiting.
func (q *Queue) Forget(runID string) {
	q.mu.Lock()
	defer q.mu.Unlock()
	delete(q.places, runID)
}

// Position returns the 1-based position of a queued run in its kind's queue.
func (q *Queue) Position(runID string) (int, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()
	entry, ok := q.places[runID]
	if !ok || entry.admitted {
		return 0, false
	}
	return slices.Index(q.waitingLocked(entry.kind), entry) + 1, true
}

// Waiting counts the queued runs of a caller for a kind.
func (q *Queue) Waiting(kind, caller string) int {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.forgetStaleLocked(q.clock.Now())
	count := 0
	for _, entry := range q.places {
		if !entry.admitted && entry.kind == kind && entry.caller == caller {
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
	for _, entry := range q.places {
		if !entry.admitted {
			counts[entry.kind]++
		}
	}
	return counts
}

func (q *Queue) forgetStaleLocked(now time.Time) {
	for id, entry := range q.places {
		ttl := waitingTTL
		if entry.admitted {
			ttl = admittedTTL
		}
		if now.Sub(entry.seen) > scaled(ttl, q.cfg.TimeScale) {
			delete(q.places, id)
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
	for id, entry := range q.places {
		if entry.admitted && entry.kind == kind && !withJob[id] {
			active++
			perCaller[entry.caller]++
		}
	}
	return active, perCaller
}

// waitingLocked returns the kind's queued runs, oldest first. The run id breaks ties so the order is stable.
func (q *Queue) waitingLocked(kind string) []*place {
	var candidates []*place
	for _, entry := range q.places {
		if !entry.admitted && entry.kind == kind {
			candidates = append(candidates, entry)
		}
	}
	slices.SortFunc(candidates, func(a, b *place) int {
		if c := a.ref.Compare(b.ref); c != 0 {
			return c
		}
		return strings.Compare(a.runID, b.runID)
	})
	return candidates
}
