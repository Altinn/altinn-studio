package executor

import (
	"fmt"
	"slices"

	"altinn.studio/devenv/pkg/resource"
)

// ResourceType classifies runtime resources observed by executor backends.
type ResourceType uint8

const (
	// ResourceTypeUnknown is used when a discovered runtime resource cannot be classified.
	ResourceTypeUnknown ResourceType = iota
	// ResourceTypeImage identifies an image runtime resource.
	ResourceTypeImage
	// ResourceTypeNetwork identifies a network runtime resource.
	ResourceTypeNetwork
	// ResourceTypeContainer identifies a container runtime resource.
	ResourceTypeContainer
)

// ObservedResource describes actual runtime state for a desired or discovered resource.
type ObservedResource struct {
	Resource     resource.Resource
	RuntimeID    string
	Dependencies []resource.ResourceRef
	Status       Status
	Type         ResourceType
	Managed      bool
}

// Snapshot is the observed state for a graph.
type Snapshot struct {
	Resources map[resource.ResourceID]ObservedResource
	GraphID   resource.GraphID
}

// Statuses returns the resource status map for callers that only need health state.
func (s Snapshot) Statuses() map[resource.ResourceID]Status {
	statuses := make(map[resource.ResourceID]Status, len(s.Resources))
	for id, res := range s.Resources {
		statuses[id] = res.Status
	}
	return statuses
}

type observedGraphResource struct {
	id   resource.ResourceID
	deps []resource.ResourceRef
}

func (r observedGraphResource) ID() resource.ResourceID {
	return r.id
}

func (r observedGraphResource) Dependencies() []resource.ResourceRef {
	return r.deps
}

func buildObservedGraph(snapshot Snapshot) (*resource.Graph, error) {
	resources := snapshot.Resources
	graph := resource.NewGraph(snapshot.GraphID)
	existing := existingResourceIDs(resources)

	for _, id := range sortedResourceIDSet(existing) {
		observed := resources[id]
		if err := graph.Add(observedGraphResource{
			id:   id,
			deps: observedDependencies(observed, existing),
		}); err != nil {
			return nil, fmt.Errorf("add observed resource %s: %w", id, err)
		}
	}
	return graph, nil
}

func existingResourceIDs(resources map[resource.ResourceID]ObservedResource) map[resource.ResourceID]struct{} {
	existing := make(map[resource.ResourceID]struct{}, len(resources))
	for id, observed := range resources {
		if observed.Status != StatusDestroyed && (observed.Managed || observed.Resource != nil) {
			existing[id] = struct{}{}
		}
	}
	return existing
}

func sortedResourceIDSet(resources map[resource.ResourceID]struct{}) []resource.ResourceID {
	ids := make([]resource.ResourceID, 0, len(resources))
	for id := range resources {
		ids = append(ids, id)
	}
	slices.Sort(ids)
	return ids
}

func observedDependencies(
	observed ObservedResource,
	existing map[resource.ResourceID]struct{},
) []resource.ResourceRef {
	if observed.Resource != nil {
		return filterExistingDependencies(observed.Resource.Dependencies(), existing)
	}
	return filterExistingDependencies(observed.Dependencies, existing)
}

func filterExistingDependencies(
	dependencies []resource.ResourceRef,
	existing map[resource.ResourceID]struct{},
) []resource.ResourceRef {
	deps := make([]resource.ResourceRef, 0, len(dependencies))
	for _, dep := range dependencies {
		if _, ok := existing[dep.ID()]; ok {
			deps = append(deps, resource.RefID(dep.ID()))
		}
	}
	return deps
}
