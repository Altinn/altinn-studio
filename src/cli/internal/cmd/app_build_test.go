package cmd

import (
	"io"
	"testing"

	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/ui"
)

func TestParseAppBuildFlagsReadsDevFrontend(t *testing.T) {
	t.Parallel()

	cmd := &AppCommand{out: ui.NewOutput(io.Discard, io.Discard, false)}
	flags, _, err := cmd.parseAppBuildFlags([]string{"--dev-frontend"})
	if err != nil {
		t.Fatalf("parseAppBuildFlags() error = %v", err)
	}
	if !flags.devFrontend {
		t.Fatal("devFrontend = false, want true")
	}
}

func TestAppBuildFrontendAssetBaseURLUsesTopologyFrontendDevServer(t *testing.T) {
	t.Parallel()

	got := appBuildFrontendAssetBaseURL(appBuildFlags{devFrontend: true})
	want := envtopology.NewLocal(envtopology.DefaultIngressPortString()).PublicBaseURL(envtopology.ComponentFrontendDevServer)
	if got != want {
		t.Fatalf("appBuildFrontendAssetBaseURL() = %q, want %q", got, want)
	}
}
