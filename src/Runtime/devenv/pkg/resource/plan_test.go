package resource

import (
	"slices"
	"testing"
)

func TestBuildApplyPlan_DestroysDisabledManagedResource(t *testing.T) {
	t.Parallel()

	disabled := false
	container := &Container{
		Name:    "localtest-workflow-engine",
		Image:   RefID("image:unused"),
		Enabled: &disabled,
	}
	graph := NewGraph(testGraphID)
	mustAddResource(t, graph, container)

	plan := buildApplyPlan(graph, Snapshot{
		GraphID: testGraphID,
		Resources: map[ResourceID]ObservedResource{
			container.ID(): {
				Type:    resourceTypeContainer,
				Status:  StatusReady,
				Managed: true,
			},
		},
	})

	if !slices.Contains(plan.destroy, container.ID()) {
		t.Fatalf("destroy = %v, want %s", plan.destroy, container.ID())
	}
}

func TestBuildApplyPlan_DestroysDisabledManagedResourceOnce(t *testing.T) {
	t.Parallel()

	disabled := false
	container := &Container{
		Name:    "localtest-workflow-engine",
		Image:   RefID("image:unused"),
		Enabled: &disabled,
	}
	graph := NewGraph(testGraphID)
	mustAddResource(t, graph, container)

	plan := buildApplyPlan(graph, Snapshot{
		GraphID: testGraphID,
		Resources: map[ResourceID]ObservedResource{
			container.ID(): {
				Type:    resourceTypeContainer,
				Status:  StatusReady,
				Managed: true,
			},
		},
	})

	if got := countResourceID(plan.destroy, container.ID()); got != 1 {
		t.Fatalf("destroy contains %s %d times, want 1: %v", container.ID(), got, plan.destroy)
	}
}

func TestBuildApplyPlan_DestroysManagedResourceRemovedFromGraph(t *testing.T) {
	t.Parallel()

	graph := NewGraph(testGraphID)
	staleID := ContainerID("stale")

	plan := buildApplyPlan(graph, Snapshot{
		GraphID: testGraphID,
		Resources: map[ResourceID]ObservedResource{
			staleID: {
				Type:    resourceTypeContainer,
				Status:  StatusReady,
				Managed: true,
			},
		},
	})

	if !slices.Contains(plan.destroy, staleID) {
		t.Fatalf("destroy = %v, want %s", plan.destroy, staleID)
	}
}

func TestBuildApplyPlan_ConflictsOnUnmanagedEnabledResource(t *testing.T) {
	t.Parallel()

	container := &Container{
		Name:  "localtest",
		Image: RefID("image:unused"),
	}
	graph := NewGraph(testGraphID)
	mustAddResource(t, graph, container)

	plan := buildApplyPlan(graph, Snapshot{
		GraphID: testGraphID,
		Resources: map[ResourceID]ObservedResource{
			container.ID(): {
				RuntimeID: "unmanaged-container-id",
				Type:      resourceTypeContainer,
				Status:    StatusReady,
				Managed:   false,
			},
		},
	})

	if !slices.Contains(plan.conflict, container.ID()) {
		t.Fatalf("conflict = %v, want %s", plan.conflict, container.ID())
	}
	if slices.Contains(plan.reconcile, container.ID()) {
		t.Fatalf("reconcile = %v, did not expect %s", plan.reconcile, container.ID())
	}
}

func countResourceID(ids []ResourceID, want ResourceID) int {
	count := 0
	for _, id := range ids {
		if id == want {
			count++
		}
	}
	return count
}

func TestBuildApplyPlan_RetainsDisabledResourceWithLifecycleOption(t *testing.T) {
	t.Parallel()

	disabled := false
	container := &Container{
		Name:    "retained",
		Image:   RefID("image:unused"),
		Enabled: &disabled,
		Lifecycle: ContainerLifecycleOptions{
			LifecycleOptions: LifecycleOptions{RetainOnDestroy: true},
		},
	}
	graph := NewGraph(testGraphID)
	mustAddResource(t, graph, container)

	plan := buildApplyPlan(graph, Snapshot{
		GraphID: testGraphID,
		Resources: map[ResourceID]ObservedResource{
			container.ID(): {
				Type:    resourceTypeContainer,
				Status:  StatusReady,
				Managed: true,
			},
		},
	})

	if slices.Contains(plan.destroy, container.ID()) {
		t.Fatalf("destroy = %v, did not expect %s", plan.destroy, container.ID())
	}
}

func TestBuildDestroyPlan_RetainsResourceWithLifecycleOption(t *testing.T) {
	t.Parallel()

	container := &Container{
		Name:  "retained",
		Image: RefID("image:unused"),
		Lifecycle: ContainerLifecycleOptions{
			LifecycleOptions: LifecycleOptions{RetainOnDestroy: true},
		},
	}
	graph := NewGraph(testGraphID)
	mustAddResource(t, graph, container)

	plan := buildDestroyPlan(graph, Snapshot{
		GraphID: testGraphID,
		Resources: map[ResourceID]ObservedResource{
			container.ID(): {
				Type:    resourceTypeContainer,
				Status:  StatusReady,
				Managed: true,
			},
		},
	})

	if slices.Contains(plan.destroy, container.ID()) {
		t.Fatalf("destroy = %v, did not expect %s", plan.destroy, container.ID())
	}
}

func TestBuildDestroyPlan_IgnoresUnmanagedResourceInGraph(t *testing.T) {
	t.Parallel()

	container := &Container{
		Name:  "localtest",
		Image: RefID("image:unused"),
	}
	graph := NewGraph(testGraphID)
	mustAddResource(t, graph, container)

	plan := buildDestroyPlan(graph, Snapshot{
		GraphID: testGraphID,
		Resources: map[ResourceID]ObservedResource{
			container.ID(): {
				Type:    resourceTypeContainer,
				Status:  StatusReady,
				Managed: false,
			},
		},
	})

	if slices.Contains(plan.destroy, container.ID()) {
		t.Fatalf("destroy = %v, did not expect %s", plan.destroy, container.ID())
	}
}

func TestBuildDestroyPlan_DestroysManagedResourceRemovedFromGraph(t *testing.T) {
	t.Parallel()

	graph := NewGraph(testGraphID)
	staleID := ContainerID("stale")

	plan := buildDestroyPlan(graph, Snapshot{
		GraphID: testGraphID,
		Resources: map[ResourceID]ObservedResource{
			staleID: {
				Type:    resourceTypeContainer,
				Status:  StatusReady,
				Managed: true,
			},
		},
	})

	if !slices.Contains(plan.destroy, staleID) {
		t.Fatalf("destroy = %v, want %s", plan.destroy, staleID)
	}
}
