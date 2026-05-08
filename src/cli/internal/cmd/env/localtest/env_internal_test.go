package localtest

import (
	"testing"

	"altinn.studio/devenv/pkg/resource"
)

func TestApplyPlannedResourcesCombinesDestroyAndReconcile(t *testing.T) {
	t.Parallel()

	destroyed := plannedResource(resource.ContainerID("removed"))
	reconciled := plannedResource(resource.ContainerID("started"))

	got := applyPlannedResources(resource.ApplyPlan{
		Snapshot:  resource.Snapshot{},
		Destroy:   []resource.PlannedResource{destroyed},
		Reconcile: []resource.PlannedResource{reconciled},
	})

	assertPlannedResourceIDs(t, got, []resource.ResourceID{destroyed.ID, reconciled.ID})
}

func plannedResource(id resource.ResourceID) resource.PlannedResource {
	return resource.PlannedResource{
		Resource: nil,
		ID:       id,
	}
}

func assertPlannedResourceIDs(t *testing.T, got []resource.PlannedResource, want []resource.ResourceID) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("len(resources) = %d, want %d", len(got), len(want))
	}
	for i, id := range want {
		if got[i].ID != id {
			t.Fatalf("resources[%d].ID = %q, want %q", i, got[i].ID, id)
		}
	}
}
