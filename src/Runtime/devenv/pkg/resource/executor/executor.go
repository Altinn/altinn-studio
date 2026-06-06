package executor

import (
	"context"
	"errors"
	"fmt"

	"golang.org/x/sync/errgroup"

	"altinn.studio/devenv/pkg/resource"
)

// Executor applies resources to infrastructure using registered backends.
// It stores runtime outputs while applying resources.
//
//nolint:govet // Field order favors constructor readability over marginal padding changes.
type Executor struct {
	backends []Backend
	observer Observer
	outputs  *outputStore
}

var (
	// ErrResourceOwnershipConflict means a runtime resource exists but is not owned by the current graph.
	ErrResourceOwnershipConflict = errors.New("resource exists but is not managed by this graph")
	errGraphEmptyID              = errors.New("resource graph ID is empty")
	errGraphResourceNotFound     = errors.New("internal error: resource not found in graph")
)

// New creates an executor with no registered resource backends.
func New() *Executor {
	return &Executor{
		outputs: newOutputStore(),
	}
}

// SetObserver sets the observer for resource lifecycle events.
func (e *Executor) SetObserver(o Observer) {
	e.observer = o
}

// Apply creates/updates all resources in the graph in dependency order.
// Resources at the same dependency level are applied in parallel.
func (e *Executor) Apply(ctx context.Context, g *resource.Graph, opts ...ApplyOption) (Outputs, error) {
	if err := validateGraphID(g); err != nil {
		return Outputs{}, err
	}
	options := newApplyOptions(opts)
	levels, err := g.TopologicalOrder()
	if err != nil {
		return Outputs{}, fmt.Errorf("sort graph resources: %w", err)
	}
	actual, err := e.Status(ctx, g)
	if err != nil {
		return Outputs{}, err
	}
	plan := buildApplyPlan(g, actual)
	if err := validateNoOwnershipConflicts(plan, actual); err != nil {
		return Outputs{}, err
	}
	if err := notifyApplyPlan(options, g, actual, plan); err != nil {
		return Outputs{}, err
	}
	if err := e.executeDestroyPlan(ctx, actual, plan.destroy); err != nil {
		return Outputs{}, err
	}

	return e.executeApplyPlan(ctx, g, levels, plan)
}

// Destroy removes all resources in the graph in reverse dependency order.
// Resources at the same dependency level are destroyed in parallel.
func (e *Executor) Destroy(ctx context.Context, g *resource.Graph, opts ...DestroyOption) error {
	if err := validateGraphID(g); err != nil {
		return err
	}
	options := newDestroyOptions(opts)

	actual, err := e.Status(ctx, g)
	if err != nil {
		return err
	}
	plan := buildDestroyPlan(g, actual)
	if err := notifyDestroyPlan(options, g, actual, plan); err != nil {
		return err
	}
	return e.executeDestroyPlan(ctx, actual, plan.destroy)
}

// Status returns observed state for the requested graph and any labelled runtime resources it owns.
func (e *Executor) Status(ctx context.Context, g *resource.Graph, opts ...StatusOption) (Snapshot, error) {
	if err := validateGraphID(g); err != nil {
		return Snapshot{}, err
	}

	options := newStatusOptions(opts)
	resources := g.All()
	snapshot := Snapshot{
		GraphID:   g.ID(),
		Resources: make(map[resource.ResourceID]ObservedResource, len(resources)),
	}

	for _, r := range resources {
		if options.skipResource(r) {
			continue
		}
		observed, err := e.observeResource(ctx, g.ID(), r)
		if err != nil {
			return Snapshot{}, fmt.Errorf("status %s: %w", r.ID(), err)
		}
		snapshot.Resources[r.ID()] = observed
	}

	if err := e.discoverGraphResources(ctx, &snapshot); err != nil {
		return Snapshot{}, err
	}

	return snapshot, nil
}

func (e *Executor) executeApplyPlan(
	ctx context.Context,
	g *resource.Graph,
	levels [][]resource.Resource,
	plan applyPlan,
) (Outputs, error) {
	applyIDs := resourceIDSet(plan.reconcile)

	e.outputs.Reset()

	for _, level := range levels {
		eg, groupCtx := errgroup.WithContext(ctx)
		for _, r := range level {
			if _, ok := applyIDs[r.ID()]; !ok {
				continue
			}
			eg.Go(func() error {
				e.notify(EventApplyStart, r.ID(), nil)
				output, err := e.applyResource(groupCtx, g.ID(), r)
				if err != nil {
					e.notify(EventApplyFailed, r.ID(), err)
					return fmt.Errorf("apply %s: %w", r.ID(), err)
				}
				if output != nil && !isNoOutput(output) {
					e.outputs.Set(r.ID(), output)
				}
				e.notify(EventApplyDone, r.ID(), nil)
				return nil
			})
		}
		if err := eg.Wait(); err != nil {
			return Outputs{}, fmt.Errorf("apply level: %w", err)
		}
	}
	return e.outputs.Snapshot(), nil
}

func (e *Executor) executeDestroyPlan(ctx context.Context, actual Snapshot, ids []resource.ResourceID) error {
	if len(ids) == 0 {
		return nil
	}
	graph, err := buildObservedGraph(actual)
	if err != nil {
		return err
	}
	levels, err := graph.ReverseTopologicalOrderSubset(ids)
	if err != nil {
		return fmt.Errorf("sort observed graph resources: %w", err)
	}
	for _, level := range levels {
		eg, groupCtx := errgroup.WithContext(ctx)
		for _, r := range level {
			eg.Go(func() error {
				observed, ok := actual.Resources[r.ID()]
				if !ok {
					return fmt.Errorf("%w: %q", errGraphResourceNotFound, r.ID())
				}
				return e.destroyObservedResource(groupCtx, r.ID(), observed)
			})
		}
		if err := eg.Wait(); err != nil {
			return fmt.Errorf("destroy level: %w", err)
		}
	}
	return nil
}

func resourceIDSet(ids []resource.ResourceID) map[resource.ResourceID]struct{} {
	set := make(map[resource.ResourceID]struct{}, len(ids))
	for _, id := range ids {
		set[id] = struct{}{}
	}
	return set
}

func validateGraphID(g *resource.Graph) error {
	if g == nil || g.ID() == "" {
		return errGraphEmptyID
	}
	return nil
}

func (e *Executor) discoverGraphResources(ctx context.Context, snapshot *Snapshot) error {
	for _, backend := range e.backends {
		discoverer, ok := backend.(Discoverer)
		if !ok {
			continue
		}
		if err := discoverer.Discover(ctx, e.backendContext(snapshot.GraphID), snapshot); err != nil {
			return fmt.Errorf("discover graph resources: %w", err)
		}
	}
	return nil
}

func (e *Executor) destroyObservedRuntimeResource(
	ctx context.Context,
	id resource.ResourceID,
	observed ObservedResource,
) error {
	backend, ok := e.backendForObserved(observed)
	if !ok {
		return fmt.Errorf("%w: %v", errResourceUnsupported, observed.Type)
	}
	if err := backend.Destroy(ctx, id, observed); err != nil {
		return fmt.Errorf("destroy backend resource: %w", err)
	}
	return nil
}

func (e *Executor) destroyObservedResource(
	ctx context.Context,
	id resource.ResourceID,
	observed ObservedResource,
) error {
	e.notify(EventDestroyStart, id, nil)
	if err := e.destroyObservedRuntimeResource(ctx, id, observed); err != nil {
		if observed.Resource != nil && handleDestroyError(observed.Resource, err) == resource.ErrorDecisionIgnore {
			e.notify(EventDestroyDone, id, nil)
			return nil
		}
		e.notify(EventDestroyFailed, id, err)
		return fmt.Errorf("destroy %s: %w", id, err)
	}
	e.notify(EventDestroyDone, id, nil)
	return nil
}

func (e *Executor) applyResource(ctx context.Context, graphID resource.GraphID, r resource.Resource) (Output, error) {
	backend, ok := e.backendFor(r)
	if !ok {
		return nil, fmt.Errorf("%w: %T", errResourceUnsupported, r)
	}
	output, err := backend.Apply(ctx, e.backendContext(graphID), r)
	if err != nil {
		return nil, fmt.Errorf("apply backend resource: %w", err)
	}
	return output, nil
}

func (e *Executor) observeResource(
	ctx context.Context,
	graphID resource.GraphID,
	r resource.Resource,
) (ObservedResource, error) {
	backend, ok := e.backendFor(r)
	if !ok {
		return ObservedResource{}, fmt.Errorf("%w: %T", errResourceUnsupported, r)
	}
	observed, err := backend.Observe(ctx, e.backendContext(graphID), r)
	if err != nil {
		return ObservedResource{}, fmt.Errorf("observe backend resource: %w", err)
	}
	return observed, nil
}

func handleDestroyError(r resource.Resource, err error) resource.ErrorDecision {
	provider, ok := r.(resource.LifecycleOptionsProvider)
	if !ok {
		return resource.ErrorDecisionDefault
	}

	options := provider.LifecycleOptions()
	if options.HandleDestroyError == nil {
		return resource.ErrorDecisionDefault
	}

	return options.HandleDestroyError(err)
}

func retainOnDestroy(r resource.Resource) bool {
	provider, ok := r.(resource.LifecycleOptionsProvider)
	if !ok {
		return defaultRetainOnDestroy(r)
	}
	return provider.LifecycleOptions().RetainOnDestroy
}

func defaultRetainOnDestroy(r resource.Resource) bool {
	switch r.(type) {
	case *resource.RemoteImage, *resource.LocalImage:
		return true
	default:
		return false
	}
}

func (e *Executor) notify(event EventType, id resource.ResourceID, err error) {
	if e.observer != nil {
		e.observer.OnEvent(Event{
			Type:     event,
			Resource: id,
			Error:    err,
		})
	}
}

func (e *Executor) notifyProgress(id resource.ResourceID, progress Progress) {
	if e.observer != nil {
		e.observer.OnEvent(Event{
			Type:     EventApplyProgress,
			Resource: id,
			Progress: &progress,
		})
	}
}
