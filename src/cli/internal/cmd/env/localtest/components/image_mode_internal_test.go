package components

import (
	"testing"

	"altinn.studio/devenv/pkg/resource"
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
