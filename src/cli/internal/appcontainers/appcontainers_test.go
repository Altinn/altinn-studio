package appcontainers_test

import (
	"context"
	"maps"
	"testing"

	"altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/appcontainers"
)

func TestLabels(t *testing.T) {
	t.Parallel()

	want := map[string]string{
		"altinn.studio/cli":      "app",
		"altinn.studio/app-path": "/apps/ttd/test",
	}
	if got := appcontainers.Labels("/apps/ttd/test"); !maps.Equal(got, want) {
		t.Fatalf("Labels() = %v, want %v", got, want)
	}
}

func TestDiscoveryFilter(t *testing.T) {
	t.Parallel()

	want := types.ContainerListFilter{
		Labels: map[string]string{"altinn.studio/cli": "app"},
		All:    false,
	}
	got := appcontainers.DiscoveryFilter()
	if !maps.Equal(got.Labels, want.Labels) || got.All != want.All {
		t.Fatalf("DiscoveryFilter() = %+v, want %+v", got, want)
	}
}

func TestDiscoverUsesMinimalFilter(t *testing.T) {
	t.Parallel()

	client := mock.New()
	client.ListContainersFunc = func(_ context.Context, filter types.ContainerListFilter) ([]types.ContainerInfo, error) {
		if !maps.Equal(filter.Labels, map[string]string{"altinn.studio/cli": "app"}) || filter.All {
			t.Fatalf("ListContainers filter = %+v", filter)
		}
		return []types.ContainerInfo{runningContainer("app", appcontainers.DefaultContainerPort, "5005")}, nil
	}

	candidates, err := appcontainers.Discover(context.Background(), client)
	if err != nil {
		t.Fatalf("Discover() error = %v", err)
	}
	if len(candidates) != 1 {
		t.Fatalf("len(candidates) = %d, want 1", len(candidates))
	}
}

func TestCandidateFromContainer(t *testing.T) {
	t.Parallel()

	assertCandidate(t, "running app on default port",
		runningContainer("app", appcontainers.DefaultContainerPort, "5005"),
		appcontainers.Candidate{
			ContainerID: "id",
			Name:        "app",
			HostPort:    5005,
			Description: "container app",
			Source:      "container",
		},
		true,
	)

	ctr := runningContainer("app", appcontainers.DefaultContainerPort, "5005")
	ctr.Labels = map[string]string{"altinn.studio/app-port": "5006"}
	assertCandidate(t, "ignores removed app-port label",
		ctr,
		appcontainers.Candidate{
			ContainerID: "id",
			Name:        "app",
			HostPort:    5005,
			Description: "container app",
			Source:      "container",
		},
		true,
	)

	assertCandidate(t, "uses id when name is missing",
		runningContainer("", appcontainers.DefaultContainerPort, "5005"),
		appcontainers.Candidate{
			ContainerID: "id",
			Name:        "id",
			HostPort:    5005,
			Description: "container id",
			Source:      "container",
		},
		true,
	)

	assertCandidate(t, "ignores stopped container",
		types.ContainerInfo{State: types.ContainerState{Running: false}},
		appcontainers.Candidate{},
		false,
	)

	assertCandidate(t, "ignores missing default port",
		runningContainer("app", "5006", "5006"),
		appcontainers.Candidate{},
		false,
	)
}

func assertCandidate(
	t *testing.T,
	name string,
	container types.ContainerInfo,
	want appcontainers.Candidate,
	wantOK bool,
) {
	t.Helper()

	t.Run(name, func(t *testing.T) {
		t.Parallel()

		got, ok := appcontainers.CandidateFromContainer(container)
		if ok != wantOK {
			t.Fatalf("CandidateFromContainer() ok = %v, want %v", ok, wantOK)
		}
		if got != want {
			t.Fatalf("CandidateFromContainer() = %+v, want %+v", got, want)
		}
	})
}

func runningContainer(name, containerPort, hostPort string) types.ContainerInfo {
	return types.ContainerInfo{
		ID:    "id",
		Name:  name,
		State: types.ContainerState{Running: true},
		Ports: []types.PublishedPort{
			{
				ContainerPort: containerPort,
				HostPort:      hostPort,
			},
		},
	}
}
