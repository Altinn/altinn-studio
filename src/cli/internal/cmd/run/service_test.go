package run_test

import (
	"testing"

	runsvc "altinn.studio/studioctl/internal/cmd/run"
	repocontext "altinn.studio/studioctl/internal/context"
)

func TestBuildDockerRunSpec_AddsDockerLocaltestEnv(t *testing.T) {
	t.Parallel()

	spec, err := runsvc.NewService().BuildDockerRunSpec(repocontext.Detection{
		AppRoot:   t.TempDir(),
		InAppRepo: true,
	}, nil, runsvc.DockerRunOptions{})
	if err != nil {
		t.Fatalf("BuildDockerRunSpec() error = %v", err)
	}

	assertEnvContainsAll(t, spec.Config.Env, []string{
		"AppSettings__OpenIdWellKnownEndpoint=http://localtest:5101/authentication/api/v1/openid/",
		"OTEL_EXPORTER_OTLP_ENDPOINT=http://monitoring_otel_collector:4317",
		"PlatformSettings__ApiStorageEndpoint=http://localtest:5101/storage/api/v1/",
		"PlatformSettings__ApiPdf2Endpoint=http://localtest-pdf3:5031/pdf",
	})
}

func TestBuildDockerRunSpec_UsesImageTagOverride(t *testing.T) {
	t.Parallel()

	want := "ghcr.io/altinn/altinn-studio/app:frontend-test"

	spec, err := runsvc.NewService().BuildDockerRunSpec(repocontext.Detection{
		AppRoot:   t.TempDir(),
		InAppRepo: true,
	}, nil, runsvc.DockerRunOptions{ImageTag: want})
	if err != nil {
		t.Fatalf("BuildDockerRunSpec() error = %v", err)
	}

	if spec.Config.Image != want {
		t.Fatalf("Config.Image = %q, want %q", spec.Config.Image, want)
	}
}

func assertEnvContainsAll(t *testing.T, env, want []string) {
	t.Helper()

	seen := make(map[string]struct{}, len(env))
	for _, value := range env {
		seen[value] = struct{}{}
	}
	for _, expected := range want {
		if _, ok := seen[expected]; !ok {
			t.Fatalf("env does not contain %q\n%v", expected, env)
		}
	}
}
