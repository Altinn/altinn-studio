package resource

import (
	"log"
	"runtime/debug"
)

// EventType identifies the kind of resource lifecycle event.
type EventType int

const (
	EventApplyStart EventType = iota
	EventApplyDone
	EventApplyFailed
	EventDestroyStart
	EventDestroyDone
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
	Type     EventType
	Resource ResourceID
	Error    error
}

// Observer receives resource lifecycle events.
// Implementations must be safe for concurrent use.
type Observer interface {
	OnEvent(Event)
}

// ObserverFunc is a function adapter for Observer.
type ObserverFunc func(Event)

func (f ObserverFunc) OnEvent(e Event) {
	f(e)
}

// MultiObserver broadcasts events to multiple observers.
type MultiObserver []Observer

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
