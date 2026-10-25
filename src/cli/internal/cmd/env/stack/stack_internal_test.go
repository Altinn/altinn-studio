package stack

import (
	"context"
	"io"
	"testing"

	"altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
	containerbackend "altinn.studio/devenv/pkg/resource/executor/container"
	"altinn.studio/studioctl/internal/ui"
)

func TestApplyPlannedResourcesCombinesDestroyAndReconcile(t *testing.T) {
	t.Parallel()

	destroyed := plannedResource(resource.ContainerID("removed"))
	reconciled := plannedResource(resource.ContainerID("started"))

	got := applyPlannedResources(executor.ApplyPlan{
		Snapshot:  executor.Snapshot{},
		Destroy:   []executor.PlannedResource{destroyed},
		Reconcile: []executor.PlannedResource{reconciled},
	})

	assertPlannedResourceIDs(t, got, []resource.ResourceID{destroyed.ID, reconciled.ID})
}

func plannedResource(id resource.ResourceID) executor.PlannedResource {
	return executor.PlannedResource{
		Resource: nil,
		ID:       id,
	}
}

func assertPlannedResourceIDs(t *testing.T, got []executor.PlannedResource, want []resource.ResourceID) {
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

func TestActiveListsRunningContainersOfItsGraph(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		containers []types.ContainerInfo
		want       bool
	}{
		{name: "no containers", containers: nil, want: false},
		{
			name:       "a stopped container",
			containers: []types.ContainerInfo{{Name: "localtest", State: types.ContainerState{Running: false}}},
			want:       false,
		},
		{
			name:       "a running container",
			containers: []types.ContainerInfo{{Name: "localtest", State: types.ContainerState{Running: true}}},
			want:       true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			client := mock.New()
			var filter types.ContainerListFilter
			client.ListContainersFunc = func(_ context.Context, f types.ContainerListFilter) ([]types.ContainerInfo, error) {
				filter = f
				return tt.containers, nil
			}

			got, err := New(client, ui.NewOutput(io.Discard, io.Discard, false), "studioctl-test", false).
				Active(context.Background())
			if err != nil {
				t.Fatalf("Active() error = %v", err)
			}
			if got != tt.want {
				t.Fatalf("Active() = %v, want %v", got, tt.want)
			}
			if filter.Labels[containerbackend.GraphIDLabel] != "studioctl-test" {
				t.Fatalf("filter labels = %v, want the graph ID label", filter.Labels)
			}
		})
	}
}
