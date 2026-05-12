package resource

import (
	"fmt"
	"slices"
)

type applyPlan struct {
	destroy   []ResourceID
	conflict  []ResourceID
	reconcile []ResourceID
}

type destroyPlan struct {
	destroy []ResourceID
}

// PlannedResource is one resource operation selected by Apply or Destroy.
type PlannedResource struct {
	Resource Resource
	ID       ResourceID
}

// ApplyPlan describes the operations Apply selected before execution starts.
type ApplyPlan struct {
	Snapshot  Snapshot
	Destroy   []PlannedResource
	Reconcile []PlannedResource
}

// DestroyPlan describes the operations Destroy selected before execution starts.
type DestroyPlan struct {
	Snapshot Snapshot
	Destroy  []PlannedResource
}

// ApplyOption customizes Apply execution.
type ApplyOption func(*applyOptions)

type applyOptions struct {
	onPlan func(ApplyPlan) error
}

// WithApplyPlan observes the plan Apply selected before execution starts.
func WithApplyPlan(fn func(ApplyPlan) error) ApplyOption {
	return func(opts *applyOptions) {
		opts.onPlan = fn
	}
}

func newApplyOptions(opts []ApplyOption) applyOptions {
	options := applyOptions{onPlan: nil}
	for _, opt := range opts {
		opt(&options)
	}
	return options
}

func notifyApplyPlan(opts applyOptions, g *Graph, snapshot Snapshot, plan applyPlan) error {
	if opts.onPlan == nil {
		return nil
	}
	return opts.onPlan(ApplyPlan{
		Snapshot:  snapshot,
		Destroy:   plannedResources(g, plan.destroy),
		Reconcile: plannedResources(g, plan.reconcile),
	})
}

// DestroyOption customizes Destroy execution.
type DestroyOption func(*destroyOptions)

type destroyOptions struct {
	onPlan func(DestroyPlan) error
}

// WithDestroyPlan observes the plan Destroy selected before execution starts.
func WithDestroyPlan(fn func(DestroyPlan) error) DestroyOption {
	return func(opts *destroyOptions) {
		opts.onPlan = fn
	}
}

func newDestroyOptions(opts []DestroyOption) destroyOptions {
	options := destroyOptions{onPlan: nil}
	for _, opt := range opts {
		opt(&options)
	}
	return options
}

func notifyDestroyPlan(opts destroyOptions, g *Graph, snapshot Snapshot, plan destroyPlan) error {
	if opts.onPlan == nil {
		return nil
	}
	return opts.onPlan(DestroyPlan{
		Snapshot: snapshot,
		Destroy:  plannedResources(g, plan.destroy),
	})
}

func plannedResources(g *Graph, ids []ResourceID) []PlannedResource {
	resources := make([]PlannedResource, 0, len(ids))
	for _, id := range ids {
		resources = append(resources, PlannedResource{
			Resource: g.Get(id),
			ID:       id,
		})
	}
	return resources
}

func buildApplyPlan(g *Graph, actual Snapshot) applyPlan {
	plan := applyPlan{
		destroy:   make([]ResourceID, 0),
		conflict:  make([]ResourceID, 0),
		reconcile: make([]ResourceID, 0),
	}
	destroySet := make(map[ResourceID]struct{})

	for _, r := range g.All() {
		id := r.ID()
		observed, exists := actual.Resources[id]
		switch {
		case resourceEnabled(r):
			if exists && unmanagedCollisionBlocksApply(r, observed) {
				plan.conflict = append(plan.conflict, id)
				continue
			}
			plan.reconcile = append(plan.reconcile, id)
		case retainOnDestroy(r):
		case exists && observed.Managed && observed.Status != StatusDestroyed:
			addResourceID(&plan.destroy, destroySet, id)
		}
	}

	for id, observed := range actual.Resources {
		if g.Get(id) != nil {
			continue
		}
		if observed.Managed && observed.Status != StatusDestroyed {
			addResourceID(&plan.destroy, destroySet, id)
		}
	}

	slices.Sort(plan.destroy)
	slices.Sort(plan.conflict)
	slices.Sort(plan.reconcile)
	return plan
}

func unmanagedCollisionBlocksApply(r Resource, observed ObservedResource) bool {
	if observed.Status == StatusDestroyed || observed.Managed {
		return false
	}
	switch r.(type) {
	case *Container, *Network:
		return true
	default:
		return false
	}
}

func buildDestroyPlan(g *Graph, actual Snapshot) destroyPlan {
	plan := destroyPlan{
		destroy: make([]ResourceID, 0),
	}
	for id, observed := range actual.Resources {
		if observed.Status == StatusDestroyed {
			continue
		}
		if r := g.Get(id); r != nil {
			if observed.Managed && !retainOnDestroy(r) {
				plan.destroy = append(plan.destroy, id)
			}
			continue
		}
		if observed.Managed {
			plan.destroy = append(plan.destroy, id)
		}
	}
	slices.Sort(plan.destroy)
	return plan
}

func validateNoOwnershipConflicts(plan applyPlan, actual Snapshot) error {
	if len(plan.conflict) == 0 {
		return nil
	}
	id := plan.conflict[0]
	observed := actual.Resources[id]
	return fmt.Errorf("%w: %s (%s)", errResourceOwnershipConflict, id, observed.RuntimeID)
}

func addResourceID(ids *[]ResourceID, seen map[ResourceID]struct{}, id ResourceID) {
	if seen == nil {
		*ids = append(*ids, id)
		return
	}
	if _, ok := seen[id]; ok {
		return
	}
	seen[id] = struct{}{}
	*ids = append(*ids, id)
}
