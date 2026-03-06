//nolint:testpackage // Same-package test keeps the destroy-render filtering helper test small and avoids test-only exports.
package localtest

import (
	"testing"

	"altinn.studio/devenv/pkg/resource"
)

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
