package clock

import (
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
