package resource

import "testing"

func TestMultiObserver_OnEvent_ContinuesAfterPanicAndRepanics(t *testing.T) {
	t.Parallel()

	delivered := false
	observers := MultiObserver{
		ObserverFunc(func(Event) { panic("boom") }),
		ObserverFunc(func(Event) { delivered = true }),
	}

	defer func() {
		if recovered := recover(); recovered == nil {
			t.Fatal("OnEvent() expected panic, got nil")
		}
		if !delivered {
			t.Fatal("OnEvent() did not continue notifying observers after panic")
		}
	}()

	observers.OnEvent(Event{Type: EventApplyStart, Resource: "resource:1"})
}
