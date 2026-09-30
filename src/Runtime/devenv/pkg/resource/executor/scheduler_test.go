package executor

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/resource"
)

const schedulerTestTimeout = 2 * time.Second

var errSchedulerTestApply = errors.New("apply failed")
var errSchedulerTestOutputMissing = errors.New("dependency output missing")

type schedulerTestResource struct {
	id   ResourceID
	deps []ResourceRef
}

func (r schedulerTestResource) ID() ResourceID {
	return r.id
}

func (r schedulerTestResource) Dependencies() []ResourceRef {
	return r.deps
}

type schedulerTestBackend struct {
	apply   func(context.Context, BackendContext, Resource) (Output, error)
	observe func(context.Context, BackendContext, Resource) (ObservedResource, error)
	destroy func(context.Context, ResourceID, ObservedResource) error
}

func (b schedulerTestBackend) Supports(r Resource) bool {
	_, ok := r.(schedulerTestResource)
	return ok
}

func (b schedulerTestBackend) Apply(ctx context.Context, backendCtx BackendContext, r Resource) (Output, error) {
	if b.apply == nil {
		return NoOutput{}, nil
	}
	return b.apply(ctx, backendCtx, r)
}

func (b schedulerTestBackend) Observe(
	ctx context.Context,
	backendCtx BackendContext,
	r Resource,
) (ObservedResource, error) {
	if b.observe != nil {
		return b.observe(ctx, backendCtx, r)
	}
	return ObservedResource{
		Resource:  r,
		RuntimeID: r.ID().String(),
		Status:    StatusDestroyed,
		Type:      ResourceTypeUnknown,
		Managed:   false,
	}, nil
}

func (b schedulerTestBackend) Destroy(ctx context.Context, id ResourceID, observed ObservedResource) error {
	if b.destroy == nil {
		return nil
	}
	return b.destroy(ctx, id, observed)
}

func TestExecutor_ApplySchedulesDependentsBeforeUnrelatedResourcesFinish(t *testing.T) {
	graph := NewGraph(testGraphID)
	a := schedulerTestResource{id: "a"}
	b := schedulerTestResource{id: "b", deps: []ResourceRef{Ref(a)}}
	c := schedulerTestResource{id: "c"}
	mustAddResource(t, graph, a)
	mustAddResource(t, graph, b)
	mustAddResource(t, graph, c)

	cStarted := make(chan struct{})
	releaseC := make(chan struct{})
	bStarted := make(chan struct{})
	releaseCClosed := false
	defer func() {
		if !releaseCClosed {
			close(releaseC)
		}
	}()

	executor := New()
	if err := executor.RegisterBackend(schedulerTestBackend{
		apply: func(ctx context.Context, backendCtx BackendContext, r Resource) (Output, error) {
			switch r.ID() {
			case "a":
				return ImageOutput{ImageID: "image-a"}, nil
			case "b":
				if _, ok := backendCtx.Outputs().Image(a.ID()); !ok {
					return nil, errSchedulerTestOutputMissing
				}
				close(bStarted)
			case "c":
				close(cStarted)
				if err := waitForSchedulerContext(ctx, releaseC); err != nil {
					return nil, err
				}
			}
			return NoOutput{}, nil
		},
	}); err != nil {
		t.Fatalf("RegisterBackend() error = %v", err)
	}

	errCh := make(chan error, 1)
	go func() {
		_, err := executor.Apply(t.Context(), graph)
		errCh <- err
	}()

	waitForSchedulerSignal(t.Context(), t, cStarted, "c start")
	waitForSchedulerSignal(t.Context(), t, bStarted, "b start")
	close(releaseC)
	releaseCClosed = true

	if err := receiveSchedulerError(t, errCh); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}
}

func TestExecutor_DestroySchedulesDependenciesBeforeUnrelatedResourcesFinish(t *testing.T) {
	graph := NewGraph(testGraphID)
	a := schedulerTestResource{id: "a"}
	b := schedulerTestResource{id: "b", deps: []ResourceRef{Ref(a)}}
	c := schedulerTestResource{id: "c"}
	mustAddResource(t, graph, a)
	mustAddResource(t, graph, b)
	mustAddResource(t, graph, c)

	cStarted := make(chan struct{})
	releaseC := make(chan struct{})
	aStarted := make(chan struct{})
	releaseCClosed := false
	defer func() {
		if !releaseCClosed {
			close(releaseC)
		}
	}()

	executor := New()
	if err := executor.RegisterBackend(schedulerTestBackend{
		observe: readyManagedResource,
		destroy: func(ctx context.Context, id ResourceID, _ ObservedResource) error {
			switch id {
			case "a":
				close(aStarted)
			case "c":
				close(cStarted)
				if err := waitForSchedulerContext(ctx, releaseC); err != nil {
					return err
				}
			}
			return nil
		},
	}); err != nil {
		t.Fatalf("RegisterBackend() error = %v", err)
	}

	errCh := make(chan error, 1)
	go func() {
		errCh <- executor.Destroy(t.Context(), graph)
	}()

	waitForSchedulerSignal(t.Context(), t, cStarted, "c destroy start")
	waitForSchedulerSignal(t.Context(), t, aStarted, "a destroy start")
	close(releaseC)
	releaseCClosed = true

	if err := receiveSchedulerError(t, errCh); err != nil {
		t.Fatalf("Destroy() error = %v", err)
	}
}

func TestExecutor_StatusObservesResourcesConcurrently(t *testing.T) {
	graph := NewGraph(testGraphID)
	mustAddResource(t, graph, schedulerTestResource{id: "a"})
	mustAddResource(t, graph, schedulerTestResource{id: "b"})
	mustAddResource(t, graph, schedulerTestResource{id: "c"})

	started := make(chan ResourceID, 3)
	release := make(chan struct{})
	releaseClosed := false
	defer func() {
		if !releaseClosed {
			close(release)
		}
	}()

	executor := New()
	if err := executor.RegisterBackend(schedulerTestBackend{
		observe: func(ctx context.Context, _ BackendContext, r Resource) (ObservedResource, error) {
			started <- r.ID()
			if err := waitForSchedulerContext(ctx, release); err != nil {
				return ObservedResource{}, err
			}
			return readyManagedResource(ctx, BackendContext{}, r)
		},
	}); err != nil {
		t.Fatalf("RegisterBackend() error = %v", err)
	}

	errCh := make(chan error, 1)
	go func() {
		_, err := executor.Status(t.Context(), graph)
		errCh <- err
	}()

	waitForSchedulerStarts(t, started, 3)
	close(release)
	releaseClosed = true

	if err := receiveSchedulerError(t, errCh); err != nil {
		t.Fatalf("Status() error = %v", err)
	}
}

func TestExecutor_ApplyDoesNotStartDependentsAfterDependencyFailure(t *testing.T) {
	graph := NewGraph(testGraphID)
	a := schedulerTestResource{id: "a"}
	b := schedulerTestResource{id: "b", deps: []ResourceRef{Ref(a)}}
	mustAddResource(t, graph, a)
	mustAddResource(t, graph, b)

	var mu sync.Mutex
	started := make(map[ResourceID]bool)

	executor := New()
	if err := executor.RegisterBackend(schedulerTestBackend{
		apply: func(_ context.Context, _ BackendContext, r Resource) (Output, error) {
			mu.Lock()
			started[r.ID()] = true
			mu.Unlock()

			if r.ID() == a.ID() {
				return nil, errSchedulerTestApply
			}
			return NoOutput{}, nil
		},
	}); err != nil {
		t.Fatalf("RegisterBackend() error = %v", err)
	}

	_, err := executor.Apply(t.Context(), graph)
	if !errors.Is(err, errSchedulerTestApply) {
		t.Fatalf("Apply() error = %v, want %v", err, errSchedulerTestApply)
	}

	mu.Lock()
	defer mu.Unlock()
	if started[b.ID()] {
		t.Fatalf("dependent %s started after dependency failure", b.ID())
	}
}

func readyManagedResource(_ context.Context, _ BackendContext, r Resource) (ObservedResource, error) {
	return ObservedResource{
		Resource:  r,
		RuntimeID: r.ID().String(),
		Status:    StatusReady,
		Type:      ResourceTypeUnknown,
		Managed:   true,
	}, nil
}

func waitForSchedulerStarts(t *testing.T, started <-chan ResourceID, count int) {
	t.Helper()
	seen := make(map[ResourceID]bool, count)
	for len(seen) < count {
		select {
		case id := <-started:
			seen[id] = true
		case <-time.After(schedulerTestTimeout):
			t.Fatalf("timed out waiting for %d status observations; saw %v", count, seen)
		}
	}
}

func waitForSchedulerSignal(ctx context.Context, t *testing.T, ch <-chan struct{}, name string) {
	t.Helper()
	select {
	case <-ch:
	case <-ctx.Done():
		t.Fatalf("context canceled waiting for %s: %v", name, ctx.Err())
	case <-time.After(schedulerTestTimeout):
		t.Fatalf("timed out waiting for %s", name)
	}
}

func waitForSchedulerContext(ctx context.Context, ch <-chan struct{}) error {
	select {
	case <-ch:
		return nil
	case <-ctx.Done():
		return fmt.Errorf("wait for scheduler signal: %w", ctx.Err())
	}
}

func receiveSchedulerError(t *testing.T, errCh <-chan error) error {
	t.Helper()
	select {
	case err := <-errCh:
		return err
	case <-time.After(schedulerTestTimeout):
		t.Fatal("timed out waiting for operation to finish")
		return nil
	}
}

var _ resource.Resource = schedulerTestResource{}
