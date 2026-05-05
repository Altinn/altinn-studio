package resource

import "slices"

type resourceType uint8

const (
	resourceTypeUnknown resourceType = iota
	resourceTypeImage
	resourceTypeNetwork
	resourceTypeContainer
)

// ObservedResource describes actual runtime state for a desired or discovered resource.
type ObservedResource struct {
	Resource     Resource
	RuntimeID    string
	Dependencies []ResourceRef
	Status       Status
	Type         resourceType
	Managed      bool
}

// Snapshot is the observed state for a graph.
type Snapshot struct {
	Resources map[ResourceID]ObservedResource
	GraphID   GraphID
}

// Statuses returns the resource status map for callers that only need health state.
func (s Snapshot) Statuses() map[ResourceID]Status {
	statuses := make(map[ResourceID]Status, len(s.Resources))
	for id, res := range s.Resources {
		statuses[id] = res.Status
	}
	return statuses
}

type observedGraphResource struct {
	id   ResourceID
	deps []ResourceRef
}

func (r observedGraphResource) ID() ResourceID {
	return r.id
}

func (r observedGraphResource) Dependencies() []ResourceRef {
	return r.deps
}

func buildObservedGraph(snapshot Snapshot) (*Graph, error) {
	resources := snapshot.Resources
	graph := NewGraph(snapshot.GraphID)
	existing := existingResourceIDs(resources)

	for _, id := range sortedResourceIDSet(existing) {
		observed := resources[id]
		if err := graph.Add(observedGraphResource{
			id:   id,
			deps: observedDependencies(observed, existing),
		}); err != nil {
			return nil, err
		}
	}
	return graph, nil
}

func existingResourceIDs(resources map[ResourceID]ObservedResource) map[ResourceID]struct{} {
	existing := make(map[ResourceID]struct{}, len(resources))
	for id, observed := range resources {
		if observed.Status != StatusDestroyed && (observed.Managed || observed.Resource != nil) {
			existing[id] = struct{}{}
		}
	}
	return existing
}

func sortedResourceIDSet(resources map[ResourceID]struct{}) []ResourceID {
	ids := make([]ResourceID, 0, len(resources))
	for id := range resources {
		ids = append(ids, id)
	}
	slices.Sort(ids)
	return ids
}

func observedDependencies(
	observed ObservedResource,
	existing map[ResourceID]struct{},
) []ResourceRef {
	if observed.Resource != nil {
		return filterExistingDependencies(observed.Resource.Dependencies(), existing)
	}
	return filterExistingDependencies(observed.Dependencies, existing)
}

func filterExistingDependencies(dependencies []ResourceRef, existing map[ResourceID]struct{}) []ResourceRef {
	deps := make([]ResourceRef, 0, len(dependencies))
	for _, dep := range dependencies {
		if _, ok := existing[dep.ID()]; ok {
			deps = append(deps, RefID(dep.ID()))
		}
	}
	return deps
}
