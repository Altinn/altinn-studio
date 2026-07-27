package executor

import (
	"context"
	"errors"
	"testing"
)

type testBackendResource struct {
	id ResourceID
}

func (r testBackendResource) ID() ResourceID {
	return r.id
}

func (r testBackendResource) Dependencies() []ResourceRef {
	return nil
}

type testBackend struct {
	applied   map[ResourceID]struct{}
	destroyed []ResourceID
}

func newTestBackend() *testBackend {
	return &testBackend{applied: make(map[ResourceID]struct{})}
}

func (b *testBackend) Supports(r Resource) bool {
	_, ok := r.(testBackendResource)
	return ok
}

func (b *testBackend) Apply(_ context.Context, _ BackendContext, r Resource) (Output, error) {
	b.applied[r.ID()] = struct{}{}
	return noOutput{}, nil
}

func (b *testBackend) Observe(_ context.Context, _ BackendContext, r Resource) (ObservedResource, error) {
	status := StatusDestroyed
	managed := false
	if _, ok := b.applied[r.ID()]; ok {
		status = StatusReady
		managed = true
	}
	return ObservedResource{
		Resource:  r,
		RuntimeID: r.ID().String(),
		Status:    status,
		Managed:   managed,
	}, nil
}

func (b *testBackend) Destroy(_ context.Context, id ResourceID, _ ObservedResource) error {
	b.destroyed = append(b.destroyed, id)
	delete(b.applied, id)
	return nil
}

func TestExecutor_CustomBackendApplyStatusDestroy(t *testing.T) {
	t.Parallel()

	backend := newTestBackend()
	executor := New()
	if err := executor.RegisterBackend(backend); err != nil {
		t.Fatalf("RegisterBackend() error = %v", err)
	}

	resource := testBackendResource{id: "test:resource"}
	graph := NewGraph(testGraphID)
	if err := graph.Add(resource); err != nil {
		t.Fatalf("Add() error = %v", err)
	}

	if _, err := executor.Apply(t.Context(), graph); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	snapshot, err := executor.Status(t.Context(), graph)
	if err != nil {
		t.Fatalf("Status() error = %v", err)
	}
	if got := snapshot.Resources[resource.ID()].Status; got != StatusReady {
		t.Fatalf("status = %s, want %s", got, StatusReady)
	}

	if err := executor.Destroy(t.Context(), graph); err != nil {
		t.Fatalf("Destroy() error = %v", err)
	}
	if len(backend.destroyed) != 1 || backend.destroyed[0] != resource.ID() {
		t.Fatalf("destroyed = %v, want [%s]", backend.destroyed, resource.ID())
	}
}

func TestExecutor_RegisterBackendValidation(t *testing.T) {
	t.Parallel()

	executor := New()
	if err := executor.RegisterBackend(nil); !errors.Is(err, errResourceBackendNil) {
		t.Fatalf("RegisterBackend(nil) error = %v, want %v", err, errResourceBackendNil)
	}
}

func TestExecutor_UnsupportedResource(t *testing.T) {
	t.Parallel()

	graph := NewGraph(testGraphID)
	resource := testBackendResource{id: "test:resource"}
	if err := graph.Add(resource); err != nil {
		t.Fatalf("Add() error = %v", err)
	}

	_, err := New().Apply(t.Context(), graph)
	if !errors.Is(err, errResourceUnsupported) {
		t.Fatalf("Apply() error = %v, want %v", err, errResourceUnsupported)
	}
}
