// Package executor applies resource graphs through pluggable infrastructure backends.
package executor

import (
	"context"
	"errors"

	"altinn.studio/devenv/pkg/resource"
)

var (
	errResourceBackendNil  = errors.New("resource backend is nil")
	errResourceUnsupported = errors.New("resource is not supported by any backend")
)

// BackendContext exposes executor state needed by resource backends while applying resources.
type BackendContext struct {
	outputs Outputs
	notify  func(resource.ResourceID, Progress)
	GraphID resource.GraphID
}

// Outputs returns a snapshot of outputs produced by resources completed before the current resource started.
func (c BackendContext) Outputs() Outputs {
	return c.outputs
}

// NotifyProgress emits best-effort progress for a resource apply operation.
func (c BackendContext) NotifyProgress(id resource.ResourceID, progress Progress) {
	if c.notify == nil {
		return
	}
	c.notify(id, progress)
}

// Backend applies and observes resources for one infrastructure family.
type Backend interface {
	Supports(r resource.Resource) bool
	Apply(ctx context.Context, backendCtx BackendContext, r resource.Resource) (Output, error)
	Observe(ctx context.Context, backendCtx BackendContext, r resource.Resource) (ObservedResource, error)
	Destroy(ctx context.Context, id resource.ResourceID, observed ObservedResource) error
}

// ObservedBackend is implemented by backends that can destroy discovered resources
// that are no longer present in the desired graph.
type ObservedBackend interface {
	SupportsObserved(observed ObservedResource) bool
}

// Discoverer is implemented by backends that can discover managed resources absent from the desired graph.
type Discoverer interface {
	Discover(ctx context.Context, backendCtx BackendContext, snapshot *Snapshot) error
}

// RegisterBackend adds a resource backend to the executor.
func (e *Executor) RegisterBackend(backend Backend) error {
	if backend == nil {
		return errResourceBackendNil
	}
	e.backends = append(e.backends, backend)
	return nil
}

func (e *Executor) backendContext(graphID resource.GraphID) BackendContext {
	return BackendContext{
		GraphID: graphID,
		outputs: e.outputs.Snapshot(),
		notify:  e.notifyProgress,
	}
}

func (e *Executor) backendFor(r resource.Resource) (Backend, bool) {
	for _, backend := range e.backends {
		if backend.Supports(r) {
			return backend, true
		}
	}
	return nil, false
}

func (e *Executor) backendForObserved(observed ObservedResource) (Backend, bool) {
	if observed.Resource != nil {
		return e.backendFor(observed.Resource)
	}
	for _, backend := range e.backends {
		observedBackend, ok := backend.(ObservedBackend)
		if ok && observedBackend.SupportsObserved(observed) {
			return backend, true
		}
	}
	return nil, false
}
