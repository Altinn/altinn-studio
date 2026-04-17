package app_test

import (
	"os"
	"path/filepath"
	"testing"

	appsvc "altinn.studio/studioctl/internal/cmd/app"
	repocontext "altinn.studio/studioctl/internal/context"
)

func TestBuildDockerRunSpec_AddsDockerLocaltestEnv(t *testing.T) {
	t.Parallel()

	spec, err := appsvc.NewService("").BuildDockerRunSpec(repocontext.Detection{
		AppRoot:   t.TempDir(),
		InAppRepo: true,
	}, nil, appsvc.DockerRunOptions{})
	if err != nil {
		t.Fatalf("BuildDockerRunSpec() error = %v", err)
	}

	assertEnvContainsAll(t, spec.Config.Env, []string{
		"AppSettings__OpenIdWellKnownEndpoint=http://localtest:5101/authentication/api/v1/openid/",
		"GeneralSettings__ExternalAppBaseUrl=http://local.altinn.cloud:8000/{org}/{app}/",
		"OTEL_EXPORTER_OTLP_ENDPOINT=http://monitoring_otel_collector:4317",
		"PlatformSettings__ApiStorageEndpoint=http://localtest:5101/storage/api/v1/",
		"PlatformSettings__ApiPdf2Endpoint=http://localtest-pdf3:5031/pdf",
		"PlatformSettings__ApiWorkflowEngineEndpoint=http://localtest-workflow-engine:8080/api/v1/",
	})
}

func TestBuildDockerRunSpec_UsesImageTagOverride(t *testing.T) {
	t.Parallel()

	want := "ghcr.io/altinn/altinn-studio/app:frontend-test"

	spec, err := appsvc.NewService("").BuildDockerRunSpec(repocontext.Detection{
		AppRoot:   t.TempDir(),
		InAppRepo: true,
	}, nil, appsvc.DockerRunOptions{ImageTag: want})
	if err != nil {
		t.Fatalf("BuildDockerRunSpec() error = %v", err)
	}

	if spec.Config.Image != want {
		t.Fatalf("Config.Image = %q, want %q", spec.Config.Image, want)
	}
}

func TestBuildDotnetRunSpec_BindsNativeAppPort(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	projectPath := writeAppProject(t, appPath)
	spec, err := appsvc.NewService("").BuildDotnetRunSpec(t.Context(), appPath, nil, nil, appsvc.DotnetRunOptions{})
	if err != nil {
		t.Fatalf("BuildDotnetRunSpec() error = %v", err)
	}

	assertEnvContainsAll(t, spec.Env, []string{
		"Kestrel__EndPoints__Http__Url=http://127.0.0.1:5005",
		"PlatformSettings__ApiStorageEndpoint=http://127.0.0.1:5101/storage/api/v1/",
		"PlatformSettings__ApiPdf2Endpoint=http://127.0.0.1:5300/pdf",
		"PlatformSettings__ApiWorkflowEngineEndpoint=http://workflow-engine.local.altinn.cloud:8000/api/v1/",
	})
	if spec.ProjectPath != projectPath {
		t.Fatalf("ProjectPath = %q, want %q", spec.ProjectPath, projectPath)
	}
	if spec.Dir != filepath.Dir(projectPath) {
		t.Fatalf("Dir = %q, want %q", spec.Dir, filepath.Dir(projectPath))
	}
	assertEqualStrings(t, "BuildArgs", spec.BuildArgs, []string{"build", projectPath})
	assertEqualStrings(t, "TargetPathArgs", spec.TargetPathArgs, []string{
		"msbuild",
		projectPath,
		"-getProperty:TargetPath",
	})
	if spec.BaseURL != "http://127.0.0.1:5005" {
		t.Fatalf("BaseURL = %q, want %q", spec.BaseURL, "http://127.0.0.1:5005")
	}
	if spec.Port != 5005 {
		t.Fatalf("Port = %d, want 5005", spec.Port)
	}
}

func TestBuildDotnetRunSpec_RandomHostPortAsksKestrelToSelectPort(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppProject(t, appPath)
	spec, err := appsvc.NewService("").BuildDotnetRunSpec(
		t.Context(),
		appPath,
		[]string{"--seed", "1"},
		nil,
		appsvc.DotnetRunOptions{RandomHostPort: true},
	)
	if err != nil {
		t.Fatalf("BuildDotnetRunSpec() error = %v", err)
	}

	assertEnvContainsAll(t, spec.Env, []string{
		"Kestrel__EndPoints__Http__Url=http://127.0.0.1:0",
	})
	assertEqualStrings(t, "AppArgs", spec.AppArgs, []string{"--seed", "1"})
	if spec.BaseURL != "http://127.0.0.1:0" {
		t.Fatalf("BaseURL = %q, want %q", spec.BaseURL, "http://127.0.0.1:0")
	}
	if spec.Port != 0 {
		t.Fatalf("Port = %d, want 0", spec.Port)
	}
}

func TestDotnetAppRunCommand(t *testing.T) {
	t.Parallel()

	command, args := appsvc.DotnetAppRunCommand("/apps/bin/App.dll", []string{"--seed", "1"})
	if command != "dotnet" {
		t.Fatalf("command = %q, want dotnet", command)
	}
	assertEqualStrings(t, "dll args", args, []string{"/apps/bin/App.dll", "--seed", "1"})

	command, args = appsvc.DotnetAppRunCommand("/apps/bin/App", []string{"--seed", "1"})
	if command != "/apps/bin/App" {
		t.Fatalf("command = %q, want /apps/bin/App", command)
	}
	assertEqualStrings(t, "executable args", args, []string{"--seed", "1"})
}

func TestResolveRunTarget_ReadsAppID(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)

	target, err := appsvc.NewService("").ResolveRunTarget(t.Context(), appPath)
	if err != nil {
		t.Fatalf("ResolveRunTarget() error = %v", err)
	}
	if target.AppID != "ttd/test-app" {
		t.Fatalf("AppID = %q, want %q", target.AppID, "ttd/test-app")
	}
	if target.Detection.AppRoot != appPath {
		t.Fatalf("AppRoot = %q, want %q", target.Detection.AppRoot, appPath)
	}
}

func TestResolveRunTarget_RejectsInvalidAppID(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"invalid"}`)

	if _, err := appsvc.NewService("").ResolveRunTarget(t.Context(), appPath); err == nil {
		t.Fatal("ResolveRunTarget() error = nil, want error")
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

func assertEqualStrings(t *testing.T, name string, got, want []string) {
	t.Helper()

	if len(got) != len(want) {
		t.Fatalf("%s = %v, want %v", name, got, want)
	}
	for i := range got {
		if got[i] != want[i] {
			t.Fatalf("%s = %v, want %v", name, got, want)
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

func writeAppProject(t *testing.T, appPath string) string {
	t.Helper()

	projectDir := filepath.Join(appPath, "App")
	if err := os.MkdirAll(projectDir, 0o755); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	projectPath := filepath.Join(projectDir, "App.csproj")
	if err := os.WriteFile(projectPath, []byte(`<Project Sdk="Microsoft.NET.Sdk.Web" />`), 0o644); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
	return projectPath
}
