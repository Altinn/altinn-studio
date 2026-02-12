package clock

import (
	"sync"
	"time"
)

type timerEvent struct {
	id  int64
	at  time.Time
	ch  chan time.Time
	due bool
}

// FakeClock is a deterministic clock advanced explicitly by tests.
type FakeClock struct {
	mutex   sync.Mutex
	now     time.Time
	nextID  int64
	timers  []*timerEvent
	tickers map[*FakeTicker]struct{}
}

// FakeTicker is driven by FakeClock.Advance.
type FakeTicker struct {
	clock   *FakeClock
	id      int64
	channel chan time.Time
	period  time.Duration
	next    time.Time
	stopped bool
}

func NewFakeClock() *FakeClock {
	return NewFakeClockAt(time.Now().UTC())
}

func NewFakeClockAt(t time.Time) *FakeClock {
	return &FakeClock{
		now:     t,
		timers:  make([]*timerEvent, 0),
		tickers: make(map[*FakeTicker]struct{}),
	}
}

func (f *FakeClock) Now() time.Time {
	f.mutex.Lock()
	defer f.mutex.Unlock()
	return f.now
}

func (f *FakeClock) After(d time.Duration) <-chan time.Time {
	f.mutex.Lock()
	now := f.now
	if d <= 0 {
		f.mutex.Unlock()
		ch := make(chan time.Time, 1)
		ch <- now
		return ch
	}

	event := &timerEvent{
		id:  f.nextIDLocked(),
		at:  now.Add(d),
		ch:  make(chan time.Time, 1),
		due: false,
	}
	f.timers = append(f.timers, event)
	f.mutex.Unlock()

	return event.ch
}

func (f *FakeClock) NewTicker(d time.Duration) Ticker {
	if d <= 0 {
		panic("clock: non-positive interval for ticker")
	}

	f.mutex.Lock()
	defer f.mutex.Unlock()

	ticker := &FakeTicker{
		clock:   f,
		id:      f.nextIDLocked(),
		channel: make(chan time.Time, 1),
		period:  d,
		next:    f.now.Add(d),
		stopped: false,
	}
	f.tickers[ticker] = struct{}{}

	return ticker
}

func (f *FakeClock) Advance(d time.Duration) {
	if d < 0 {
		panic("clock: cannot advance by negative duration")
	}

	f.mutex.Lock()
	defer f.mutex.Unlock()

	target := f.now.Add(d)
	for {
		kind, timer, ticker, dueAt := f.nextDueEventLocked(target)
		if kind == eventNone {
			break
		}

		f.now = dueAt

		switch kind {
		case eventTimer:
			timer.due = true
			nonBlockingSend(timer.ch, dueAt)
		case eventTicker:
			nonBlockingSend(ticker.channel, dueAt)
			ticker.next = ticker.next.Add(ticker.period)
		}
	}

	f.now = target
	f.compactTimersLocked()
}

func (f *FakeClock) nextIDLocked() int64 {
	id := f.nextID
	f.nextID++
	return id
}

func nonBlockingSend(ch chan time.Time, value time.Time) {
	select {
	case ch <- value:
	default:
	}
}

type eventKind uint8

const (
	eventNone eventKind = iota
	eventTimer
	eventTicker
)

func (f *FakeClock) nextDueEventLocked(target time.Time) (eventKind, *timerEvent, *FakeTicker, time.Time) {
	bestKind := eventNone
	var bestTimer *timerEvent
	var bestTicker *FakeTicker
	var bestTime time.Time
	var bestID int64

	for _, timer := range f.timers {
		if timer == nil || timer.due || timer.at.After(target) {
			continue
		}
		if bestKind == eventNone || timer.at.Before(bestTime) || (timer.at.Equal(bestTime) && timer.id < bestID) {
			bestKind = eventTimer
			bestTimer = timer
			bestTicker = nil
			bestTime = timer.at
			bestID = timer.id
		}
	}

	for ticker := range f.tickers {
		if ticker.stopped || ticker.next.After(target) {
			continue
		}
		if bestKind == eventNone || ticker.next.Before(bestTime) || (ticker.next.Equal(bestTime) && ticker.id < bestID) {
			bestKind = eventTicker
			bestTimer = nil
			bestTicker = ticker
			bestTime = ticker.next
			bestID = ticker.id
		}
	}

	return bestKind, bestTimer, bestTicker, bestTime
}

func (f *FakeClock) compactTimersLocked() {
	if len(f.timers) == 0 {
		return
	}

	active := f.timers[:0]
	for _, timer := range f.timers {
		if timer == nil || timer.due {
			continue
		}
		active = append(active, timer)
	}
	f.timers = active
}

func (t *FakeTicker) Chan() <-chan time.Time {
	return t.channel
}

func (t *FakeTicker) Reset(d time.Duration) {
	if d <= 0 {
		panic("clock: non-positive interval for ticker reset")
	}

	t.clock.mutex.Lock()
	defer t.clock.mutex.Unlock()

	t.period = d
	t.next = t.clock.now.Add(d)
	if t.stopped {
		t.stopped = false
		t.clock.tickers[t] = struct{}{}
	}
}

func (t *FakeTicker) Stop() {
	t.clock.mutex.Lock()
	defer t.clock.mutex.Unlock()

	if t.stopped {
		return
	}

	t.stopped = true
	delete(t.clock.tickers, t)
}
