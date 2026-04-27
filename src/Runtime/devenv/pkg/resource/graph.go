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
)

// Graph manages a DAG of resources with dependency tracking.
// Graph is a pure data structure - use Executor to apply resources.
type Graph struct {
	resources map[ResourceID]Resource
	mu        sync.RWMutex
}

// NewGraph creates an empty resource graph.
func NewGraph() *Graph {
	return &Graph{
		resources: make(map[ResourceID]Resource),
	}
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

// All returns all resources in the graph (unordered).
func (g *Graph) All() []Resource {
	g.mu.RLock()
	defer g.mu.RUnlock()

	result := make([]Resource, 0, len(g.resources))
	for _, r := range g.resources {
		result = append(result, r)
	}
	return result
}

// Enabled returns all enabled resources in the graph (unordered).
func (g *Graph) Enabled() []Resource {
	g.mu.RLock()
	defer g.mu.RUnlock()

	resources := g.enabledResourcesLocked()
	result := make([]Resource, 0, len(resources))
	for _, r := range resources {
		result = append(result, r)
	}
	return result
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

	if err := g.validateEnabledDependenciesLocked(resources); err != nil {
		return err
	}

	// Check for cycles
	if err := detectCycle(resources); err != nil {
		return err
	}

	// Validate individual enabled resources.
	for _, r := range resources {
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
	if err := g.validateEnabledDependenciesLocked(resources); err != nil {
		return nil, err
	}
	if err := detectCycle(resources); err != nil {
		return nil, err
	}

	return topologicalLevels(resources)
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

func (g *Graph) enabledResourcesLocked() map[ResourceID]Resource {
	result := make(map[ResourceID]Resource, len(g.resources))
	for id, r := range g.resources {
		if resourceEnabled(r) {
			result[id] = r
		}
	}
	return result
}

func (g *Graph) validateEnabledDependenciesLocked(resources map[ResourceID]Resource) error {
	for id, r := range resources {
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
	provider, ok := r.(EnablementProvider)
	return !ok || provider.IsEnabled()
}

// detectCycle uses DFS to find cycles among enabled resources.
func detectCycle(resources map[ResourceID]Resource) error {
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

	for id := range resources {
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
func topologicalLevels(resources map[ResourceID]Resource) ([][]Resource, error) {
	if len(resources) == 0 {
		return nil, nil
	}

	// Calculate in-degree (number of dependencies)
	inDegree := make(map[ResourceID]int, len(resources))
	dependents := make(map[ResourceID][]ResourceID, len(resources))
	for id, resource := range resources {
		deps := resource.Dependencies()
		inDegree[id] = len(deps)
		for _, dep := range deps {
			depID := dep.ID()
			dependents[depID] = append(dependents[depID], id)
		}
	}

	var levels [][]Resource

	// Process until all resources are assigned to a level
	remaining := len(resources)
	for remaining > 0 {
		// Find all resources with in-degree 0
		var level []Resource
		for id, degree := range inDegree {
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
