package components

import (
	"reflect"
	"testing"

	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/config"
)

func TestLocalDevImageBuildsByDefault(t *testing.T) {
	built := &resource.BuiltImage{Tag: "example:dev", ContextPath: "/repo"}

	got := localDevImage(false, built)

	if got != built {
		t.Fatalf("localDevImage(false) = %T, want original built image", got)
	}
}

func TestLocalDevImageUsesPrebuiltTag(t *testing.T) {
	built := &resource.BuiltImage{Tag: "example:dev", ContextPath: "/repo"}

	got, ok := localDevImage(true, built).(*resource.PulledImage)
	if !ok {
		t.Fatalf("localDevImage(true) = %T, want *resource.PulledImage", got)
	}
	if got.Ref != built.Tag {
		t.Fatalf("prebuilt image ref = %q, want %q", got.Ref, built.Tag)
	}
	if got.PullPolicy != resource.PullNever {
		t.Fatalf("prebuilt image pull policy = %v, want PullNever", got.PullPolicy)
	}
}

func TestPullPolicyFor(t *testing.T) {
	if got := pullPolicyFor(config.ImageSpec{Image: "example", Tag: "tt_ring1", Floating: true}); got !=
		resource.PullAlwaysAllowStale {
		t.Errorf("pull policy for a floating image = %v, want PullAlwaysAllowStale", got)
	}
	if got := pullPolicyFor(config.ImageSpec{Image: "example", Tag: "18.3", Floating: false}); got !=
		resource.PullIfNotPresent {
		t.Errorf("pull policy for a pinned image = %v, want PullIfNotPresent", got)
	}
}

// TestManifestPullPolicies asserts the environment re-pulls exactly the images whose tag
// moves.
func TestManifestPullPolicies(t *testing.T) {
	images := config.DefaultImages()
	manifest := NewManifest(&Options{
		Paths:             NewPaths(t.TempDir()),
		Images:            images,
		IncludeMonitoring: true,
		IncludePgAdmin:    true,
	})

	floating := map[string]bool{}
	for _, res := range manifest.Resources {
		pulled, ok := res.(*resource.PulledImage)
		if !ok {
			continue
		}
		switch pulled.PullPolicy {
		case resource.PullAlwaysAllowStale:
			floating[pulled.Ref] = true
		case resource.PullIfNotPresent, resource.PullAlways, resource.PullNever:
		default:
			t.Errorf("unexpected pull policy %v for %q", pulled.PullPolicy, pulled.Ref)
		}
	}

	want := map[string]bool{
		images.Core.Localtest.Ref():      true,
		images.Core.PDF3.Ref():           true,
		images.Core.WorkflowEngine.Ref(): true,
	}
	if !reflect.DeepEqual(floating, want) {
		t.Errorf("re-pulled images = %v, want %v", floating, want)
	}
}
