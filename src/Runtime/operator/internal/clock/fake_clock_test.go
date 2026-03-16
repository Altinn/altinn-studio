package clock

import (
	"sync"
	"testing"
	"time"
)

func TestFakeClockNowAndAdvance(t *testing.T) {
	start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	c := NewFakeClockAt(start)

	if got := c.Now(); !got.Equal(start) {
		t.Fatalf("Now() mismatch, got %s want %s", got, start)
	}

	c.Advance(2 * time.Hour)
	want := start.Add(2 * time.Hour)
	if got := c.Now(); !got.Equal(want) {
		t.Fatalf("Now() mismatch after Advance, got %s want %s", got, want)
	}
}

func TestFakeClockAfter(t *testing.T) {
	start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	c := NewFakeClockAt(start)

	ch := c.After(10 * time.Second)

	select {
	case <-ch:
		t.Fatal("timer fired too early")
	default:
	}

	c.Advance(9 * time.Second)
	select {
	case <-ch:
		t.Fatal("timer fired too early")
	default:
	}

	c.Advance(1 * time.Second)
	select {
	case got := <-ch:
		want := start.Add(10 * time.Second)
		if !got.Equal(want) {
			t.Fatalf("timer value mismatch, got %s want %s", got, want)
		}
	default:
		t.Fatal("timer did not fire")
	}
}

func TestFakeClockAfterNonPositiveIsImmediate(t *testing.T) {
	start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	c := NewFakeClockAt(start)

	for _, d := range []time.Duration{0, -time.Second} {
		ch := c.After(d)
		select {
		case got := <-ch:
			if !got.Equal(start) {
				t.Fatalf("timer value mismatch, got %s want %s", got, start)
			}
		default:
			t.Fatalf("timer for duration %s did not fire immediately", d)
		}
	}
}

func TestFakeTickerAdvanceResetStop(t *testing.T) {
	start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	c := NewFakeClockAt(start)
	ticker := c.NewTicker(5 * time.Second)

	c.Advance(4 * time.Second)
	select {
	case <-ticker.Chan():
		t.Fatal("ticker fired too early")
	default:
	}

	c.Advance(1 * time.Second)
	select {
	case got := <-ticker.Chan():
		want := start.Add(5 * time.Second)
		if !got.Equal(want) {
			t.Fatalf("ticker value mismatch, got %s want %s", got, want)
		}
	default:
		t.Fatal("ticker did not fire")
	}

	ticker.Reset(2 * time.Second)
	c.Advance(2 * time.Second)
	select {
	case got := <-ticker.Chan():
		want := start.Add(7 * time.Second)
		if !got.Equal(want) {
			t.Fatalf("ticker value mismatch after reset, got %s want %s", got, want)
		}
	default:
		t.Fatal("ticker did not fire after reset")
	}

	ticker.Stop()
	c.Advance(10 * time.Second)
	select {
	case <-ticker.Chan():
		t.Fatal("ticker fired after stop")
	default:
	}
}

func TestFakeClockAfterSameInstantAndAdvanceZero(t *testing.T) {
	start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	c := NewFakeClockAt(start)

	channels := []<-chan time.Time{
		c.After(5 * time.Second),
		c.After(5 * time.Second),
		c.After(5 * time.Second),
	}

	c.Advance(4 * time.Second)
	for i, ch := range channels {
		select {
		case <-ch:
			t.Fatalf("timer %d fired too early", i)
		default:
		}
	}

	c.Advance(1 * time.Second)
	want := start.Add(5 * time.Second)
	for i, ch := range channels {
		select {
		case got := <-ch:
			if !got.Equal(want) {
				t.Fatalf("timer %d value mismatch, got %s want %s", i, got, want)
			}
		default:
			t.Fatalf("timer %d did not fire", i)
		}
	}

	c.Advance(0)
	for i, ch := range channels {
		select {
		case <-ch:
			t.Fatalf("timer %d fired unexpectedly after Advance(0)", i)
		default:
		}
	}
}

func TestFakeTickerDropsUnreadTicksOnLargeAdvance(t *testing.T) {
	start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	c := NewFakeClockAt(start)
	ticker := c.NewTicker(1 * time.Second)

	c.Advance(10 * time.Second)

	select {
	case got := <-ticker.Chan():
		want := start.Add(1 * time.Second)
		if !got.Equal(want) {
			t.Fatalf("first buffered tick mismatch, got %s want %s", got, want)
		}
	default:
		t.Fatal("expected a buffered tick after large advance")
	}

	select {
	case <-ticker.Chan():
		t.Fatal("expected only one buffered tick when receiver is behind")
	default:
	}

	c.Advance(1 * time.Second)
	select {
	case got := <-ticker.Chan():
		want := start.Add(11 * time.Second)
		if !got.Equal(want) {
			t.Fatalf("tick value mismatch after draining, got %s want %s", got, want)
		}
	default:
		t.Fatal("expected next tick after draining buffered tick")
	}
}

func TestFakeTickerStopIdempotentAndResetWithPendingTick(t *testing.T) {
	start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	c := NewFakeClockAt(start)
	ticker := c.NewTicker(1 * time.Second)

	c.Advance(1 * time.Second)
	ticker.Stop()
	ticker.Stop()

	ticker.Reset(2 * time.Second)

	select {
	case got := <-ticker.Chan():
		want := start.Add(1 * time.Second)
		if !got.Equal(want) {
			t.Fatalf("pending tick mismatch, got %s want %s", got, want)
		}
	default:
		t.Fatal("expected pending buffered tick to remain after Stop/Reset")
	}

	c.Advance(1 * time.Second)
	select {
	case <-ticker.Chan():
		t.Fatal("ticker fired too early after reset")
	default:
	}

	c.Advance(1 * time.Second)
	select {
	case got := <-ticker.Chan():
		want := start.Add(3 * time.Second)
		if !got.Equal(want) {
			t.Fatalf("tick after reset mismatch, got %s want %s", got, want)
		}
	default:
		t.Fatal("expected ticker to resume after reset")
	}

	ticker.Stop()
	c.Advance(10 * time.Second)
	select {
	case <-ticker.Chan():
		t.Fatal("ticker fired after final stop")
	default:
	}
}

func TestFakeClockTimezoneBehavior(t *testing.T) {
	location := time.FixedZone("UTC+01", 3600)
	start := time.Date(2024, 1, 1, 10, 0, 0, 0, location)
	cAt := NewFakeClockAt(start)

	gotAt := cAt.Now()
	gotName, gotOffset := gotAt.Zone()
	if gotName != "UTC+01" || gotOffset != 3600 {
		t.Fatalf("NewFakeClockAt location mismatch, got (%s, %d)", gotName, gotOffset)
	}

	c := NewFakeClock()
	got := c.Now()
	gotName, gotOffset = got.Zone()
	if gotName != "UTC" || gotOffset != 0 {
		t.Fatalf("NewFakeClock expected UTC, got (%s, %d)", gotName, gotOffset)
	}
}

func TestFakeClockConcurrentAccess(t *testing.T) {
	start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	c := NewFakeClockAt(start)
	ticker := c.NewTicker(1 * time.Millisecond)

	var wg sync.WaitGroup
	wg.Add(3)

	go func() {
		defer wg.Done()
		for i := range 1000 {
			_ = c.After(time.Duration(i%5+1) * time.Millisecond)
		}
	}()

	go func() {
		defer wg.Done()
		for range 1000 {
			c.Advance(1 * time.Millisecond)
		}
	}()

	go func() {
		defer wg.Done()
		for range 400 {
			ticker.Stop()
			ticker.Reset(1 * time.Millisecond)
		}
		ticker.Stop()
	}()

	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("concurrent operations timed out")
	}
}

func TestFakeClockPanicsOnInvalidInput(t *testing.T) {
	start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	c := NewFakeClockAt(start)

	assertPanics(t, func() { c.Advance(-time.Second) })
	assertPanics(t, func() { c.NewTicker(0) })
	assertPanics(t, func() { c.NewTicker(-time.Second) })

	ticker := c.NewTicker(time.Second)
	assertPanics(t, func() { ticker.Reset(0) })
	assertPanics(t, func() { ticker.Reset(-time.Second) })
}

func assertPanics(t *testing.T, fn func()) {
	t.Helper()
	defer func() {
		if recover() == nil {
			t.Fatal("expected panic")
		}
	}()
	fn()
}
