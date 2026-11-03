package clock

import "time"

type realClock struct{}

type realTicker struct {
	ticker *time.Ticker
}

func NewRealClock() Clock {
	return realClock{}
}

func (realClock) Now() time.Time {
	return time.Now()
}

func (realClock) After(d time.Duration) <-chan time.Time {
	return time.After(d)
}

func (realClock) NewTicker(d time.Duration) Ticker {
	return &realTicker{ticker: time.NewTicker(d)}
}

func (t *realTicker) Chan() <-chan time.Time {
	return t.ticker.C
}

func (t *realTicker) Reset(d time.Duration) {
	t.ticker.Reset(d)
}

func (t *realTicker) Stop() {
	t.ticker.Stop()
}
