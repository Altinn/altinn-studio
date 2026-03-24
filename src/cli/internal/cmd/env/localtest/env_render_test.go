//nolint:testpackage // Same-package test keeps the destroy-render filtering helper test small and avoids test-only exports.
package localtest

import (
	"context"
	"errors"
	"io"
	"sync/atomic"
	"testing"

	containermock "altinn.studio/devenv/pkg/container/mock"
	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

var errStatusProbeFailed = errors.New("status probe failed")

func TestFilterRenderResources_SkipsDestroyedResources(t *testing.T) {
	image := &resource.RemoteImage{Ref: "ghcr.io/altinn/test:latest"}
	containerA := &resource.Container{Name: "localtest", Image: resource.Ref(image)}
	containerB := &resource.Container{Name: "grafana", Image: resource.Ref(image)}

	filtered := filterRenderResources(
		[]resource.Resource{image, containerA, containerB},
		map[resource.ResourceID]resource.Status{
			image.ID():      resource.StatusReady,
			containerA.ID(): resource.StatusReady,
			containerB.ID(): resource.StatusDestroyed,
		},
	)

	if len(filtered) != 2 {
		t.Fatalf("len(filtered) = %d, want 2", len(filtered))
	}
	if filtered[0].ID() != image.ID() || filtered[1].ID() != containerA.ID() {
		t.Fatalf("unexpected filtered resources: %s, %s", filtered[0].ID(), filtered[1].ID())
	}
}

func TestDestroyResources_ContinuesWhenRenderStatusProbeFails(t *testing.T) {
	client := containermock.New()
	client.ImageInspectFunc = func(context.Context, string) (containertypes.ImageInfo, error) {
		return containertypes.ImageInfo{}, errStatusProbeFailed
	}

	var removeCalls atomic.Int32
	client.ContainerStopFunc = func(context.Context, string, *int) error { return nil }
	client.ContainerRemoveFunc = func(context.Context, string, bool) error {
		removeCalls.Add(1)
		return nil
	}
	client.NetworkRemoveFunc = func(context.Context, string) error { return nil }

	env := NewEnv(&config.Config{}, ui.NewOutput(io.Discard, io.Discard, false), client)
	err := env.destroyResources(context.Background(), ResourceDestroyOptions{
		Images: config.ImagesConfig{
			Core: config.CoreImages{
				Localtest: config.ImageSpec{Image: "ghcr.io/altinn/test-localtest", Tag: "latest"},
				PDF3:      config.ImageSpec{Image: "ghcr.io/altinn/test-pdf3", Tag: "latest"},
			},
		},
		IncludeMonitoring: false,
	}, stoppingEnvironmentMessage)
	if err != nil {
		t.Fatalf("destroyResources() error = %v, want nil", err)
	}
	if removeCalls.Load() == 0 {
		t.Fatal("destroyResources() did not attempt container removal after status probe failure")
	}
}
