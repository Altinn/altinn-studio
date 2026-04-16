package run_test

import (
	"os"
	"path/filepath"
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
		"GeneralSettings__ExternalAppBaseUrl=http://local.altinn.cloud:8000/{org}/{app}/",
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

func TestBuildDotnetRunSpec_BindsNativeAppPort(t *testing.T) {
	t.Parallel()

	spec := runsvc.NewService().BuildDotnetRunSpec(t.Context(), t.TempDir(), nil, nil)

	assertEnvContainsAll(t, spec.Env, []string{
		"Kestrel__EndPoints__Http__Url=http://127.0.0.1:5005",
	})
	if spec.BaseURL != "http://127.0.0.1:5005" {
		t.Fatalf("BaseURL = %q, want %q", spec.BaseURL, "http://127.0.0.1:5005")
	}
}

func TestResolveApp_ReadsAppID(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)

	target, err := runsvc.NewService().ResolveApp(t.Context(), appPath)
	if err != nil {
		t.Fatalf("ResolveApp() error = %v", err)
	}
	if target.AppID != "ttd/test-app" {
		t.Fatalf("AppID = %q, want %q", target.AppID, "ttd/test-app")
	}
	if target.Detection.AppRoot != appPath {
		t.Fatalf("AppRoot = %q, want %q", target.Detection.AppRoot, appPath)
	}
}

func TestResolveApp_RejectsInvalidAppID(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"invalid"}`)

	if _, err := runsvc.NewService().ResolveApp(t.Context(), appPath); err == nil {
		t.Fatal("ResolveApp() error = nil, want error")
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

func writeAppMetadata(t *testing.T, appPath, content string) {
	t.Helper()

	configDir := filepath.Join(appPath, "App", "config")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	metadataPath := filepath.Join(configDir, "applicationmetadata.json")
	if err := os.WriteFile(metadataPath, []byte(content), 0o644); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
}
