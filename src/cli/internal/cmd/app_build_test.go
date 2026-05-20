package cmd_test

import (
	"testing"

	"altinn.studio/studioctl/internal/cmd"
	"altinn.studio/studioctl/internal/envtopology"
)

func TestAppBuildFrontendAssetBaseURLUsesTopologyFrontendDevServer(t *testing.T) {
	t.Parallel()

	got := cmd.AppBuildFrontendAssetBaseURL(true)
	want := envtopology.NewLocal(
		envtopology.DefaultIngressPortString(),
	).PublicBaseURL(envtopology.ComponentFrontendDevServer)
	if got != want {
		t.Fatalf("AppBuildFrontendAssetBaseURL() = %q, want %q", got, want)
	}
}
