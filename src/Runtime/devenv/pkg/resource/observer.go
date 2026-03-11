package resource

import (
	"log"
	"runtime/debug"
)

// EventType identifies the kind of resource lifecycle event.
type EventType int

const (
	// EventApplyStart signals that apply has started for a resource.
	EventApplyStart EventType = iota
	// EventApplyDone signals that apply completed successfully.
	EventApplyDone
	// EventApplyFailed signals that apply failed.
	EventApplyFailed
	// EventDestroyStart signals that destroy has started for a resource.
	EventDestroyStart
	// EventDestroyDone signals that destroy completed successfully.
	EventDestroyDone
	// EventDestroyFailed signals that destroy failed.
	EventDestroyFailed
)

func (e EventType) String() string {
	switch e {
	case EventApplyStart:
		return "apply_start"
	case EventApplyDone:
		return "apply_done"
	case EventApplyFailed:
		return "apply_failed"
	case EventDestroyStart:
		return "destroy_start"
	case EventDestroyDone:
		return "destroy_done"
	case EventDestroyFailed:
		return "destroy_failed"
	default:
		return "unknown"
	}
}

// Event represents a resource lifecycle event.
type Event struct {
	Error    error
	Resource ResourceID
	Type     EventType
}

// Observer receives resource lifecycle events.
// Implementations must be safe for concurrent use.
type Observer interface {
	OnEvent(event Event)
}

// ObserverFunc is a function adapter for Observer.
type ObserverFunc func(Event)

// OnEvent forwards the event to the wrapped function.
func (f ObserverFunc) OnEvent(e Event) {
	f(e)
}

// MultiObserver broadcasts events to multiple observers.
type MultiObserver []Observer

// OnEvent forwards the event to all registered observers.
func (m MultiObserver) OnEvent(e Event) {
	var panicValue any

	for _, o := range m {
		func(observer Observer) {
			defer func() {
				if recovered := recover(); recovered != nil {
					log.Printf("resource observer panic: %v\n%s", recovered, debug.Stack())
					if panicValue == nil {
						panicValue = recovered
					}
				}
			}()
			observer.OnEvent(e)
		}(o)
	}

	if panicValue != nil {
		panic(panicValue)
	}
}
