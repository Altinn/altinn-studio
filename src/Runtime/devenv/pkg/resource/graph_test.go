package resource

import (
	"strings"
	"testing"
)

const testGraphID GraphID = "test"

// mockResource is a test implementation of Resource.
type mockResource struct {
	id      ResourceID
	enabled *bool
	deps    []ResourceRef
}

func (m *mockResource) ID() ResourceID              { return m.id }
func (m *mockResource) Dependencies() []ResourceRef { return m.deps }
func (m *mockResource) IsEnabled() bool             { return Enabled(m.enabled) }

func mustAddResource(t *testing.T, g *Graph, r Resource) {
	t.Helper()
	if err := g.Add(r); err != nil {
		t.Fatalf("Add() error = %v", err)
	}
}

func buildLinearGraph() (*Graph, []Resource) {
	a := &mockResource{id: "a"}
	b := &mockResource{id: "b", deps: DepIDs("a")}
	c := &mockResource{id: "c", deps: DepIDs("b")}

	g := NewGraph(testGraphID)
	return g, []Resource{a, b, c}
}

func TestGraph_Add(t *testing.T) {
	tests := []struct {
		add     Resource
		setup   func(*Graph)
		name    string
		wantErr bool
	}{
		{
			name:    "add valid resource",
			add:     &mockResource{id: "a"},
			wantErr: false,
		},
		{
			name:    "add nil resource",
			add:     nil,
			wantErr: true,
		},
		{
			name:    "add resource with empty ID",
			add:     &mockResource{id: ""},
			wantErr: true,
		},
		{
			name: "add duplicate ID",
			setup: func(g *Graph) {
				mustAddResource(t, g, &mockResource{id: "a"})
			},
			add:     &mockResource{id: "a"},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			g := NewGraph(testGraphID)
			if tt.setup != nil {
				tt.setup(g)
			}
			err := g.Add(tt.add)
			if (err != nil) != tt.wantErr {
				t.Errorf("Add() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestGraph_Get(t *testing.T) {
	g := NewGraph(testGraphID)
	r := &mockResource{id: "a"}
	mustAddResource(t, g, r)

	if got := g.Get("a"); got != r {
		t.Error("Get() should return the added resource")
	}
	if got := g.Get("nonexistent"); got != nil {
		t.Error("Get() should return nil for nonexistent ID")
	}
}

func TestGraph_All(t *testing.T) {
	g := NewGraph(testGraphID)
	mustAddResource(t, g, &mockResource{id: "b"})
	mustAddResource(t, g, &mockResource{id: "a"})

	all := g.All()
	if len(all) != 2 {
		t.Errorf("All() returned %d resources, want 2", len(all))
	}
	if all[0].ID() != "a" || all[1].ID() != "b" {
		t.Fatalf("All() order = [%s %s], want [a b]", all[0].ID(), all[1].ID())
	}
}

func TestGraph_Validate(t *testing.T) {
	tests := []struct {
		name      string
		errMsg    string
		resources []Resource
		wantErr   bool
	}{
		{
			name: "valid graph no deps",
			resources: []Resource{
				&mockResource{id: "a"},
				&mockResource{id: "b"},
			},
			wantErr: false,
		},
		{
			name: "valid graph with deps",
			resources: []Resource{
				&mockResource{id: "a"},
				&mockResource{id: "b", deps: DepIDs("a")},
			},
			wantErr: false,
		},
		{
			name: "missing dependency",
			resources: []Resource{
				&mockResource{id: "a", deps: DepIDs("nonexistent")},
			},
			wantErr: true,
			errMsg:  "non-existent resource",
		},
		{
			name: "enabled resource depends on disabled resource",
			resources: []Resource{
				&mockResource{id: "a", enabled: new(bool)},
				&mockResource{id: "b", deps: DepIDs("a")},
			},
			wantErr: true,
			errMsg:  "disabled resource",
		},
		{
			name: "disabled resource with missing dependency is ignored",
			resources: []Resource{
				&mockResource{id: "a", enabled: new(bool), deps: DepIDs("nonexistent")},
				&mockResource{id: "b"},
			},
			wantErr: false,
		},
		{
			name: "self cycle",
			resources: []Resource{
				&mockResource{id: "a", deps: DepIDs("a")},
			},
			wantErr: true,
			errMsg:  "cycle",
		},
		{
			name: "two node cycle",
			resources: []Resource{
				&mockResource{id: "a", deps: DepIDs("b")},
				&mockResource{id: "b", deps: DepIDs("a")},
			},
			wantErr: true,
			errMsg:  "cycle",
		},
		{
			name: "three node cycle",
			resources: []Resource{
				&mockResource{id: "a", deps: DepIDs("c")},
				&mockResource{id: "b", deps: DepIDs("a")},
				&mockResource{id: "c", deps: DepIDs("b")},
			},
			wantErr: true,
			errMsg:  "cycle",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			g := NewGraph(testGraphID)
			for _, r := range tt.resources {
				mustAddResource(t, g, r)
			}
			err := g.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
			if tt.wantErr && tt.errMsg != "" {
				if err == nil {
					t.Fatalf("Validate() expected error containing %q, got nil", tt.errMsg)
				}
				if !strings.Contains(err.Error(), tt.errMsg) {
					t.Fatalf("Validate() error = %q, want message containing %q", err.Error(), tt.errMsg)
				}
			}
		})
	}
}

func TestGraph_Enabled(t *testing.T) {
	g := NewGraph(testGraphID)
	mustAddResource(t, g, &mockResource{id: "c"})
	mustAddResource(t, g, &mockResource{id: "b", enabled: new(bool)})
	mustAddResource(t, g, &mockResource{id: "a"})

	enabled := g.Enabled()
	if len(enabled) != 2 {
		t.Fatalf("Enabled() returned %d resources, want 2", len(enabled))
	}
	if enabled[0].ID() != "a" || enabled[1].ID() != "c" {
		t.Fatalf("Enabled() order = [%s %s], want [a c]", enabled[0].ID(), enabled[1].ID())
	}
}

func TestGraph_TopologicalOrder(t *testing.T) {
	g, resources := buildLinearGraph()
	for _, r := range resources {
		mustAddResource(t, g, r)
	}

	levels, err := g.TopologicalOrder()
	if err != nil {
		t.Fatalf("TopologicalOrder() error = %v", err)
	}

	// Should be 3 levels: [a], [b], [c]
	if len(levels) != 3 {
		t.Fatalf("TopologicalOrder() returned %d levels, want 3", len(levels))
	}

	// Verify each level
	if len(levels[0]) != 1 || levels[0][0].ID() != "a" {
		t.Errorf("level 0 = %v, want [a]", levels[0])
	}
	if len(levels[1]) != 1 || levels[1][0].ID() != "b" {
		t.Errorf("level 1 = %v, want [b]", levels[1])
	}
	if len(levels[2]) != 1 || levels[2][0].ID() != "c" {
		t.Errorf("level 2 = %v, want [c]", levels[2])
	}
}

func TestGraph_TopologicalOrder_SkipsDisabledResources(t *testing.T) {
	a := &mockResource{id: "a"}
	b := &mockResource{id: "b", enabled: new(bool)}
	c := &mockResource{id: "c", deps: DepIDs("a")}

	g := NewGraph(testGraphID)
	mustAddResource(t, g, a)
	mustAddResource(t, g, b)
	mustAddResource(t, g, c)

	levels, err := g.TopologicalOrder()
	if err != nil {
		t.Fatalf("TopologicalOrder() error = %v", err)
	}
	if len(levels) != 2 {
		t.Fatalf("TopologicalOrder() returned %d levels, want 2", len(levels))
	}
	if levels[0][0].ID() != "a" || levels[1][0].ID() != "c" {
		t.Fatalf("TopologicalOrder() = %v, want a then c", levels)
	}
}

func TestGraph_TopologicalOrder_ParallelLevel(t *testing.T) {
	// a and b have no deps, c depends on both
	a := &mockResource{id: "a"}
	b := &mockResource{id: "b"}
	c := &mockResource{id: "c", deps: DepIDs("a", "b")}

	g := NewGraph(testGraphID)
	mustAddResource(t, g, a)
	mustAddResource(t, g, b)
	mustAddResource(t, g, c)

	levels, err := g.TopologicalOrder()
	if err != nil {
		t.Fatalf("TopologicalOrder() error = %v", err)
	}

	// Should be 2 levels: [a, b], [c]
	if len(levels) != 2 {
		t.Fatalf("TopologicalOrder() returned %d levels, want 2", len(levels))
	}

	// First level should have both a and b
	if len(levels[0]) != 2 {
		t.Errorf("level 0 has %d resources, want 2", len(levels[0]))
	}
	if levels[0][0].ID() != "a" || levels[0][1].ID() != "b" {
		t.Fatalf("level 0 order = [%s %s], want [a b]", levels[0][0].ID(), levels[0][1].ID())
	}

	// Second level should have c
	if len(levels[1]) != 1 || levels[1][0].ID() != "c" {
		t.Errorf("level 1 = %v, want [c]", levels[1])
	}
}

func TestGraph_ReverseTopologicalOrder(t *testing.T) {
	g, resources := buildLinearGraph()
	for _, r := range resources {
		mustAddResource(t, g, r)
	}

	levels, err := g.ReverseTopologicalOrder()
	if err != nil {
		t.Fatalf("ReverseTopologicalOrder() error = %v", err)
	}

	// Should be 3 levels: [c], [b], [a] (reverse of normal order)
	if len(levels) != 3 {
		t.Fatalf("ReverseTopologicalOrder() returned %d levels, want 3", len(levels))
	}

	if len(levels[0]) != 1 || levels[0][0].ID() != "c" {
		t.Errorf("level 0 = %v, want [c]", levels[0])
	}
	if len(levels[1]) != 1 || levels[1][0].ID() != "b" {
		t.Errorf("level 1 = %v, want [b]", levels[1])
	}
	if len(levels[2]) != 1 || levels[2][0].ID() != "a" {
		t.Errorf("level 2 = %v, want [a]", levels[2])
	}
}

func TestGraph_ReverseTopologicalOrderSubset_IgnoresDependenciesOutsideSubset(t *testing.T) {
	a := &mockResource{id: "a"}
	b := &mockResource{id: "b", deps: DepIDs("a")}
	c := &mockResource{id: "c", deps: DepIDs("b")}

	g := NewGraph(testGraphID)
	mustAddResource(t, g, a)
	mustAddResource(t, g, b)
	mustAddResource(t, g, c)

	levels, err := g.ReverseTopologicalOrderSubset([]ResourceID{"b", "c"})
	if err != nil {
		t.Fatalf("ReverseTopologicalOrderSubset() error = %v", err)
	}

	if len(levels) != 2 {
		t.Fatalf("ReverseTopologicalOrderSubset() returned %d levels, want 2", len(levels))
	}
	if levels[0][0].ID() != "c" || levels[1][0].ID() != "b" {
		t.Fatalf("ReverseTopologicalOrderSubset() = %v, want c then b", levels)
	}
}

func TestGraph_TopologicalOrder_WithDirectRefs(t *testing.T) {
	a := &mockResource{id: "a"}
	b := &mockResource{id: "b", deps: Deps(a)} // Direct ref
	c := &mockResource{id: "c", deps: DepIDs("b")}

	g := NewGraph(testGraphID)
	mustAddResource(t, g, a)
	mustAddResource(t, g, b)
	mustAddResource(t, g, c)

	levels, err := g.TopologicalOrder()
	if err != nil {
		t.Fatalf("TopologicalOrder() error = %v", err)
	}

	if len(levels) != 3 {
		t.Fatalf("TopologicalOrder() returned %d levels, want 3", len(levels))
	}
}

func TestGraph_TopologicalOrder_EmptyGraph(t *testing.T) {
	g := NewGraph(testGraphID)

	levels, err := g.TopologicalOrder()
	if err != nil {
		t.Fatalf("TopologicalOrder() error = %v", err)
	}

	if levels != nil {
		t.Errorf("TopologicalOrder() = %v, want nil for empty graph", levels)
	}
}

func TestGraph_TopologicalOrder_CycleError(t *testing.T) {
	a := &mockResource{id: "a", deps: DepIDs("b")}
	b := &mockResource{id: "b", deps: DepIDs("a")}

	g := NewGraph(testGraphID)
	mustAddResource(t, g, a)
	mustAddResource(t, g, b)

	_, err := g.TopologicalOrder()
	if err == nil {
		t.Error("TopologicalOrder() should return error for graph with cycle")
	}
}
