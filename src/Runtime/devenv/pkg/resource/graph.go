package resource

import (
	"errors"
	"fmt"
	"slices"
	"sync"
)

var (
	errGraphNilResource        = errors.New("resource is nil")
	errGraphEmptyResourceID    = errors.New("resource ID is empty")
	errGraphNoZeroInDegree     = errors.New("internal error: no resources with zero in-degree")
	errGraphResourceNotFound   = errors.New("internal error: resource not found in graph")
	errGraphNilGraphResource   = errors.New("internal error: resource is nil in graph")
	errGraphDuplicateResource  = errors.New("resource already exists")
	errGraphMissingDependency  = errors.New("resource depends on non-existent resource")
	errGraphDisabledDependency = errors.New("enabled resource depends on disabled resource")
	errGraphNilDependency      = errors.New("resource depends on nil resource")
	errGraphDependencyCycle    = errors.New("dependency cycle detected")
	errGraphEmptyID            = errors.New("resource graph ID is empty")
)

// Graph manages a DAG of resources with dependency tracking.
// Graph is a pure data structure - use Executor to apply resources.
type Graph struct {
	resources map[ResourceID]Resource
	id        GraphID
	mu        sync.RWMutex
}

// NewGraph creates an empty resource graph.
func NewGraph(id GraphID) *Graph {
	return &Graph{
		id:        id,
		resources: make(map[ResourceID]Resource),
	}
}

// ID returns the stable graph identity.
func (g *Graph) ID() GraphID {
	if g == nil {
		return ""
	}
	return g.id
}

// Add registers a resource in the graph.
// Returns error if ID is empty or already exists.
func (g *Graph) Add(r Resource) error {
	if r == nil {
		return errGraphNilResource
	}
	id := r.ID()
	if id == "" {
		return errGraphEmptyResourceID
	}

	g.mu.Lock()
	defer g.mu.Unlock()

	if _, exists := g.resources[id]; exists {
		return fmt.Errorf("%w: %q", errGraphDuplicateResource, id)
	}
	g.resources[id] = r
	return nil
}

// Get returns a resource by ID, or nil if not found.
func (g *Graph) Get(id ResourceID) Resource {
	g.mu.RLock()
	defer g.mu.RUnlock()
	return g.resources[id]
}

// All returns all resources sorted by resource ID.
func (g *Graph) All() []Resource {
	g.mu.RLock()
	defer g.mu.RUnlock()

	return sortedResources(g.resources)
}

// Enabled returns all enabled resources sorted by resource ID.
func (g *Graph) Enabled() []Resource {
	g.mu.RLock()
	defer g.mu.RUnlock()

	return sortedResources(g.enabledResourcesLocked())
}

// Validate checks the graph for errors:
// - All enabled dependencies exist
// - Enabled resources only depend on enabled resources
// - No cycles
// - All enabled resources pass validation (if they implement Validator).
func (g *Graph) Validate() error {
	g.mu.RLock()
	defer g.mu.RUnlock()

	resources := g.enabledResourcesLocked()
	order := sortedResourceIDs(resources)

	if err := g.validateEnabledDependenciesLocked(resources, order); err != nil {
		return err
	}

	// Check for cycles
	if err := detectCycle(resources, order); err != nil {
		return err
	}

	// Validate individual enabled resources.
	for _, id := range order {
		r := resources[id]
		if v, ok := r.(Validator); ok {
			if err := v.Validate(); err != nil {
				return fmt.Errorf("resource %q validation failed: %w", r.ID(), err)
			}
		}
	}

	return nil
}

// TopologicalOrder returns resources in dependency order (dependencies first).
// Resources at the same level are grouped together and can be executed in parallel.
// Returns an error if the graph contains cycles.
func (g *Graph) TopologicalOrder() ([][]Resource, error) {
	g.mu.RLock()
	defer g.mu.RUnlock()

	resources := g.enabledResourcesLocked()
	order := sortedResourceIDs(resources)
	if err := g.validateEnabledDependenciesLocked(resources, order); err != nil {
		return nil, err
	}
	if err := detectCycle(resources, order); err != nil {
		return nil, err
	}

	return topologicalLevels(resources, order)
}

// TopologicalOrderSubset returns selected resources in dependency order.
// Dependencies outside the selected set are ignored.
func (g *Graph) TopologicalOrderSubset(ids []ResourceID) ([][]Resource, error) {
	g.mu.RLock()
	defer g.mu.RUnlock()

	resources, err := g.subsetLocked(ids)
	if err != nil {
		return nil, err
	}
	return topologicalLevels(resources, sortedResourceIDs(resources))
}

// ReverseTopologicalOrder returns resources in reverse dependency order.
// Used for destroy operations (dependents before dependencies).
func (g *Graph) ReverseTopologicalOrder() ([][]Resource, error) {
	levels, err := g.TopologicalOrder()
	if err != nil {
		return nil, err
	}
	slices.Reverse(levels)
	return levels, nil
}

// ReverseTopologicalOrderSubset returns selected resources in reverse dependency order.
func (g *Graph) ReverseTopologicalOrderSubset(ids []ResourceID) ([][]Resource, error) {
	levels, err := g.TopologicalOrderSubset(ids)
	if err != nil {
		return nil, err
	}
	slices.Reverse(levels)
	return levels, nil
}

func (g *Graph) enabledResourcesLocked() map[ResourceID]Resource {
	result := make(map[ResourceID]Resource, len(g.resources))
	for id, r := range g.resources {
		if resourceEnabled(r) {
			result[id] = r
		}
	}
	return result
}

func (g *Graph) subsetLocked(ids []ResourceID) (map[ResourceID]Resource, error) {
	resources := make(map[ResourceID]Resource, len(ids))
	for _, id := range ids {
		r, exists := g.resources[id]
		if !exists {
			return nil, fmt.Errorf("%w: %q", errGraphResourceNotFound, id)
		}
		resources[id] = r
	}
	return resources, nil
}

func sortedResources(resources map[ResourceID]Resource) []Resource {
	ids := sortedResourceIDs(resources)
	result := make([]Resource, 0, len(resources))
	for _, id := range ids {
		result = append(result, resources[id])
	}
	return result
}

func sortedResourceIDs(resources map[ResourceID]Resource) []ResourceID {
	ids := make([]ResourceID, 0, len(resources))
	for id := range resources {
		ids = append(ids, id)
	}
	slices.Sort(ids)
	return ids
}

func (g *Graph) validateEnabledDependenciesLocked(resources map[ResourceID]Resource, order []ResourceID) error {
	for _, id := range order {
		r := resources[id]
		for _, ref := range r.Dependencies() {
			depID := ref.ID()
			dep, exists := g.resources[depID]
			if !exists {
				return fmt.Errorf("%w: %q -> %q", errGraphMissingDependency, id, depID)
			}
			if !resourceEnabled(dep) {
				return fmt.Errorf("%w: %q -> %q", errGraphDisabledDependency, id, depID)
			}
		}
	}
	return nil
}

func resourceEnabled(r Resource) bool {
	return IsEnabled(r)
}

// detectCycle uses DFS to find cycles among enabled resources.
func detectCycle(resources map[ResourceID]Resource, order []ResourceID) error {
	const (
		white = iota // unvisited
		gray         // visiting (in current path)
		black        // visited (done)
	)

	colors := make(map[ResourceID]int, len(resources))
	var path []ResourceID

	var visit func(id ResourceID) error
	var visitDependency func(id, depID ResourceID) error
	visit = func(id ResourceID) error {
		r, err := cycleResource(resources, id)
		if err != nil {
			return err
		}

		colors[id] = gray
		path = append(path, id)

		for _, ref := range r.Dependencies() {
			if err := visitDependency(id, ref.ID()); err != nil {
				return err
			}
		}

		path = path[:len(path)-1]
		colors[id] = black
		return nil
	}
	visitDependency = func(id, depID ResourceID) error {
		if _, err := cycleDependency(resources, id, depID); err != nil {
			return err
		}

		switch colors[depID] {
		case gray:
			return cyclePathError(path, depID)
		case white:
			return visit(depID)
		default:
			return nil
		}
	}

	for _, id := range order {
		if colors[id] == white {
			if err := visit(id); err != nil {
				return err
			}
		}
	}
	return nil
}

func cycleResource(resources map[ResourceID]Resource, id ResourceID) (Resource, error) {
	r, exists := resources[id]
	if !exists {
		return nil, fmt.Errorf("%w: %q", errGraphResourceNotFound, id)
	}
	if r == nil {
		return nil, fmt.Errorf("%w: %q", errGraphNilGraphResource, id)
	}
	return r, nil
}

func cycleDependency(resources map[ResourceID]Resource, id, depID ResourceID) (Resource, error) {
	dep, exists := resources[depID]
	if !exists {
		return nil, fmt.Errorf("%w: %q -> %q", errGraphMissingDependency, id, depID)
	}
	if dep == nil {
		return nil, fmt.Errorf("%w: %q -> %q", errGraphNilDependency, id, depID)
	}
	return dep, nil
}

func cyclePathError(path []ResourceID, depID ResourceID) error {
	cycleStart := slices.Index(path, depID)
	cyclePath := path[cycleStart:]
	cycle := make([]ResourceID, len(cyclePath)+1)
	copy(cycle, cyclePath)
	cycle[len(cyclePath)] = depID
	return fmt.Errorf("%w: %v", errGraphDependencyCycle, cycle)
}

// topologicalLevels returns resources grouped by dependency level.
// Level 0 has no dependencies, level 1 depends only on level 0, etc.
// Caller must hold read lock.
//
//nolint:gocognit // Kahn's algorithm is simpler to follow inline.
func topologicalLevels(resources map[ResourceID]Resource, order []ResourceID) ([][]Resource, error) {
	if len(resources) == 0 {
		return nil, nil
	}

	// Calculate in-degree (number of dependencies)
	inDegree := make(map[ResourceID]int, len(resources))
	dependents := make(map[ResourceID][]ResourceID, len(resources))
	for _, id := range order {
		resource := resources[id]
		deps := resource.Dependencies()
		inDegree[id] = 0
		for _, dep := range deps {
			depID := dep.ID()
			if _, exists := resources[depID]; !exists {
				continue
			}
			inDegree[id]++
			dependents[depID] = append(dependents[depID], id)
		}
	}

	var levels [][]Resource

	// Process until all resources are assigned to a level
	remaining := len(resources)
	for remaining > 0 {
		// Find all resources with in-degree 0
		var level []Resource
		for _, id := range order {
			degree, ok := inDegree[id]
			if !ok {
				continue
			}
			if degree == 0 {
				level = append(level, resources[id])
			}
		}

		if len(level) == 0 {
			// Should not happen if cycle detection passed
			return nil, errGraphNoZeroInDegree
		}

		// Mark processed resources and update dependents
		for _, r := range level {
			id := r.ID()
			delete(inDegree, id)
			remaining--

			// Reduce in-degree for resources that depend on this one
			for _, dependentID := range dependents[id] {
				if _, exists := inDegree[dependentID]; exists {
					inDegree[dependentID]--
				}
			}
		}

		levels = append(levels, level)
	}

	return levels, nil
}
