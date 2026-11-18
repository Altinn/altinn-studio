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
	// admittedTTL forgets an admitted run that no step holds anymore, which happens when its workflow stopped.
	admittedTTL = time.Minute
	// engineLatency is how late the engine may run a step that is due, when it has many to run.
	engineLatency = 10 * time.Second
	// warmup is how long a queue admits no one after the operator starts to serve callbacks. While the operator was
	// down, the engine's retry backoff grew up to retryMaxDelay, so a run may call again that much later, and then
	// defer once more. By the end of the warmup every queued run has asked again, and every admitted run without a Job
	// has held its place again from run.create-job or run.await-pod, so no run passes an older one and the kind's limit
	// holds.
	warmup = retryMaxDelay + max(AdmitRecheck, quotaRecheck) + engineLatency
)

// Queue decides which work may start, and keeps the place of the work from its create until something outside the
// queue holds it, such as a run's Job. It asks its room on each admit, so it sees the room as it is now. It lives in
// memory, and the engine's retries rebuild it after a restart.
type Queue struct {
	started   time.Time
	clock     clock.Clock
	room      func(ctx context.Context, kind string) (Room, error)
	places    map[string]*place
	timeScale float64
	mu        sync.Mutex
}

// Work is what waits in a queue: a run, or other work that a caller asked for.
type Work struct{ ID, Kind, Caller string }

// Room is how much work of a kind may go on at once, and how much of it one caller may, or zero for no limit. Held is
// the work that holds a place outside the queue.
type Room struct {
	Held               []Work
	Size, MaxPerCaller int
}

// place is the place of work in its kind's queue: in line while the work asks again, and then reserved while a step
// holds it, until something outside the queue holds the place.
type place struct {
	queuedAt time.Time
	seen     time.Time
	work     Work
	admitted bool
}

// NewQueue returns the queue of the runs, which admits no run until Open. Its room is the sandbox's slots, which the
// Jobs of the kind's runs hold. The ResourceQuota cannot replace it, because the quota's limits apply to pods and let
// one Job too many through. The configuration's TimeScale shortens the warmup and the TTLs.
func NewQueue(cfg *config.Config, box sandbox.Sandbox, clk clock.Clock) *Queue {
	room := func(ctx context.Context, kind string) (Room, error) {
		limits, ok := cfg.Kinds[kind]
		if !ok {
			return Room{}, ends(ReasonStartFailed, "The run's kind is not configured anymore.", nil)
		}
		jobs, err := box.ActiveJobs(ctx, limits.Namespace, kind)
		if err != nil {
			return Room{}, fmt.Errorf("list the active Jobs: %w", err)
		}
		slots, err := box.Slots(ctx, limits.Namespace)
		if err != nil {
			return Room{}, fmt.Errorf("read the sandbox's slots: %w", err)
		}
		held := make([]Work, 0, len(jobs))
		for _, job := range jobs {
			held = append(held, Work{ID: job.RunID, Kind: kind, Caller: job.Caller})
		}
		return Room{Held: held, Size: slots, MaxPerCaller: limits.MaxActivePerCaller}, nil
	}
	return &Queue{room: room, clock: clk, timeScale: cfg.TimeScale, places: make(map[string]*place)}
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

// Join puts new work in line before it first asks, so the position counts it at once, unless its caller has maxWaiting
// of the kind in line already. Work that has a place keeps it, and work that never asks leaves after the waitingTTL.
func (q *Queue) Join(work Work, maxWaiting int) error {
	q.mu.Lock()
	defer q.mu.Unlock()
	now := q.clock.Now()
	q.forgetStaleLocked(now)
	if _, ok := q.places[work.ID]; ok {
		return nil
	}
	others := func(entry *place) bool { return entry.work.Caller != work.Caller }
	if len(slices.DeleteFunc(q.waitingLocked(work.Kind), others)) >= maxWaiting {
		return ErrQueueFull
	}
	q.places[work.ID] = &place{work: work, queuedAt: now, seen: now}
	return nil
}

// Admit admits work when it is among the oldest work of its kind that fits in the kind's room, and otherwise keeps its
// place in line by queuedAt, or by now when queuedAt is zero.
func (q *Queue) Admit(ctx context.Context, work Work, queuedAt time.Time) (Admission, error) {
	room, err := q.room(ctx, work.Kind)
	if err != nil {
		return Admission{}, err
	}
	q.mu.Lock()
	defer q.mu.Unlock()
	now := q.clock.Now()
	q.forgetStaleLocked(now)

	entry, ok := q.places[work.ID]
	if ok && entry.admitted || slices.ContainsFunc(room.Held, func(held Work) bool { return held.ID == work.ID }) {
		return Admission{Admitted: true}, nil
	}
	if !ok {
		entry = &place{work: work}
		q.places[work.ID] = entry
	}
	entry.queuedAt, entry.seen = cmp.Or(queuedAt, now), now

	candidates := q.waitingLocked(work.Kind)
	if q.started.IsZero() || now.Sub(q.started) < scaled(warmup, q.timeScale) {
		return Admission{Position: slices.Index(candidates, entry) + 1}, nil
	}
	active, perCaller := q.activeLocked(work.Kind, room.Held)
	for _, candidate := range candidates {
		if active >= room.Size {
			break
		}
		if room.MaxPerCaller > 0 && perCaller[candidate.work.Caller] >= room.MaxPerCaller {
			continue
		}
		if candidate == entry {
			entry.admitted = true
			return Admission{Admitted: true}, nil
		}
		// Older work fits. Its place is kept for it until it asks.
		active++
		perCaller[candidate.work.Caller]++
	}

	return Admission{Position: slices.Index(candidates, entry) + 1}, nil
}

// Hold keeps the place of admitted work that nothing outside the queue holds yet, also in a queue that has restarted
// since the work was admitted.
func (q *Queue) Hold(work Work) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.places[work.ID] = &place{work: work, seen: q.clock.Now(), admitted: true}
}

// Forget removes work that finished, was canceled or gave up waiting.
func (q *Queue) Forget(id string) {
	q.mu.Lock()
	defer q.mu.Unlock()
	delete(q.places, id)
}

// Position returns the 1-based position of queued work in its kind's queue.
func (q *Queue) Position(id string) (int, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()
	entry, ok := q.places[id]
	if !ok || entry.admitted {
		return 0, false
	}
	return slices.Index(q.waitingLocked(entry.work.Kind), entry) + 1, true
}

// WaitingByKind counts the queued work of each kind, for the queue metric.
func (q *Queue) WaitingByKind() map[string]int {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.forgetStaleLocked(q.clock.Now())
	counts := make(map[string]int)
	for _, entry := range q.places {
		if !entry.admitted {
			counts[entry.work.Kind]++
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
		if now.Sub(entry.seen) > scaled(ttl, q.timeScale) {
			delete(q.places, id)
		}
	}
}

// activeLocked counts the work that holds a place in the kind's room: work held outside the queue, and admitted work
// that the queue holds.
func (q *Queue) activeLocked(kind string, held []Work) (int, map[string]int) {
	perCaller := make(map[string]int)
	outside := make(map[string]bool, len(held))
	for _, work := range held {
		outside[work.ID] = true
		perCaller[work.Caller]++
	}
	active := len(held)
	for id, entry := range q.places {
		if entry.admitted && entry.work.Kind == kind && !outside[id] {
			active++
			perCaller[entry.work.Caller]++
		}
	}
	return active, perCaller
}

// waitingLocked returns the kind's queued work, oldest first. The id breaks ties so the order is stable.
func (q *Queue) waitingLocked(kind string) []*place {
	var candidates []*place
	for _, entry := range q.places {
		if !entry.admitted && entry.work.Kind == kind {
			candidates = append(candidates, entry)
		}
	}
	slices.SortFunc(candidates, func(a, b *place) int {
		if c := a.queuedAt.Compare(b.queuedAt); c != 0 {
			return c
		}
		return strings.Compare(a.work.ID, b.work.ID)
	})
	return candidates
}
