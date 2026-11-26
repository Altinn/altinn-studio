package clock

import "time"

// Clock abstracts wall-clock time, so that tests are deterministic.
type Clock interface {
	Now() time.Time
	After(d time.Duration) <-chan time.Time
	NewTicker(d time.Duration) Ticker
}

// Ticker abstracts periodic ticks, so that tests are deterministic.
type Ticker interface {
	Chan() <-chan time.Time
	Reset(d time.Duration)
	Stop()
}
