package resource

import (
	"errors"
	"fmt"
	"slices"
	"sync"
)

// Graph manages a DAG of resources with dependency tracking.
// Graph is a pure data structure - use Executor to apply resources.
type Graph struct {
	mu        sync.RWMutex
	resources map[ResourceID]Resource
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
		return errors.New("resource is nil")
	}
	id := r.ID()
	if id == "" {
		return errors.New("resource ID is empty")
	}

	g.mu.Lock()
	defer g.mu.Unlock()

	if _, exists := g.resources[id]; exists {
		return fmt.Errorf("resource %q already exists", id)
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

// Validate checks the graph for errors:
// - All dependencies exist
// - No cycles
// - All resources pass validation (if they implement Validator)
func (g *Graph) Validate() error {
	g.mu.RLock()
	defer g.mu.RUnlock()

	// Check all dependencies exist
	for id, r := range g.resources {
		for _, ref := range r.Dependencies() {
			depID := ref.ID()
			if _, exists := g.resources[depID]; !exists {
				return fmt.Errorf("resource %q depends on non-existent resource %q", id, depID)
			}
		}
	}

	// Check for cycles
	if err := g.detectCycle(); err != nil {
		return err
	}

	// Validate individual resources
	for _, r := range g.resources {
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

	if err := g.detectCycle(); err != nil {
		return nil, err
	}

	return g.topologicalLevels()
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

// detectCycle uses DFS to find cycles. Caller must hold read lock.
func (g *Graph) detectCycle() error {
	const (
		white = iota // unvisited
		gray         // visiting (in current path)
		black        // visited (done)
	)

	colors := make(map[ResourceID]int, len(g.resources))
	var path []ResourceID

	var visit func(id ResourceID) error
	visit = func(id ResourceID) error {
		r, exists := g.resources[id]
		if !exists {
			return fmt.Errorf("internal error: resource %q not found in graph", id)
		}
		if r == nil {
			return fmt.Errorf("internal error: resource %q is nil", id)
		}

		colors[id] = gray
		path = append(path, id)

		for _, ref := range r.Dependencies() {
			depID := ref.ID()

			dep, exists := g.resources[depID]
			if !exists {
				return fmt.Errorf("resource %q depends on non-existent resource %q", id, depID)
			}
			if dep == nil {
				return fmt.Errorf("resource %q depends on nil resource %q", id, depID)
			}

			switch colors[depID] {
			case gray:
				// Found cycle - find where it starts in path
				cycleStart := slices.Index(path, depID)
				cyclePath := path[cycleStart:]
				cycle := make([]ResourceID, len(cyclePath)+1)
				copy(cycle, cyclePath)
				cycle[len(cyclePath)] = depID
				return fmt.Errorf("dependency cycle detected: %v", cycle)
			case white:
				if err := visit(depID); err != nil {
					return err
				}
			}
		}

		path = path[:len(path)-1]
		colors[id] = black
		return nil
	}

	for id := range g.resources {
		if colors[id] == white {
			if err := visit(id); err != nil {
				return err
			}
		}
	}
	return nil
}

// topologicalLevels returns resources grouped by dependency level.
// Level 0 has no dependencies, level 1 depends only on level 0, etc.
// Caller must hold read lock.
func (g *Graph) topologicalLevels() ([][]Resource, error) {
	if len(g.resources) == 0 {
		return nil, nil
	}

	// Calculate in-degree (number of dependencies)
	inDegree := make(map[ResourceID]int, len(g.resources))
	dependents := make(map[ResourceID][]ResourceID, len(g.resources))
	for id, resource := range g.resources {
		deps := resource.Dependencies()
		inDegree[id] = len(deps)
		for _, dep := range deps {
			depID := dep.ID()
			dependents[depID] = append(dependents[depID], id)
		}
	}

	var levels [][]Resource

	// Process until all resources are assigned to a level
	remaining := len(g.resources)
	for remaining > 0 {
		// Find all resources with in-degree 0
		var level []Resource
		for id, degree := range inDegree {
			if degree == 0 {
				level = append(level, g.resources[id])
			}
		}

		if len(level) == 0 {
			// Should not happen if cycle detection passed
			return nil, errors.New("internal error: no resources with zero in-degree")
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
