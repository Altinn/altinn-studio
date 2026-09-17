package app_test

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/appsecrets"
	appsvc "altinn.studio/studioctl/internal/cmd/app"
	"altinn.studio/studioctl/internal/config"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/envtopology"
)

func defaultTopology() envtopology.Local {
	return envtopology.NewLocal("8000")
}

func testService() *appsvc.Service {
	return appsvc.NewService(&config.Config{Version: config.NewVersion("test-version")})
}

// testRunService is a service that can place an app's secrets directory. Building a run or env spec creates
// that directory, so every spec test needs a home to place it under.
func testRunService(t *testing.T) *appsvc.Service {
	t.Helper()

	return appsvc.NewService(&config.Config{Home: t.TempDir(), Version: config.NewVersion("test-version")})
}

// assertIsDir checks that a directory the app is about to be pointed at is there already.
func assertIsDir(t *testing.T, dir string) {
	t.Helper()

	info, err := os.Stat(dir)
	if err != nil || !info.IsDir() {
		t.Fatalf("%s is not a directory: %v", dir, err)
	}
}

func TestBuildDockerRunSpec_AddsDockerLocaltestEnv(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)

	spec, err := testRunService(t).BuildDockerRunSpec(repocontext.Detection{
		AppRoot:   appPath,
		InAppRepo: true,
	}, nil, defaultTopology(), appsvc.DockerRunOptions{})
	if err != nil {
		t.Fatalf("BuildDockerRunSpec() error = %v", err)
	}

	assertEnvContainsAll(t, spec.Config.Env, []string{
		"AppSettings__OpenIdWellKnownEndpoint=http://local.altinn.cloud:8000/authentication/api/v1/openid/",
		"GeneralSettings__ExternalAppBaseUrl=http://local.altinn.cloud:8000/{org}/{app}/",
		"GeneralSettings__HostName=local.altinn.cloud",
		"OTEL_EXPORTER_OTLP_ENDPOINT=http://otel.local.altinn.cloud:4317",
		"PlatformSettings__ApiStorageEndpoint=http://local.altinn.cloud:8000/storage/api/v1/",
		"PlatformSettings__ApiPdf2Endpoint=http://pdf.local.altinn.cloud:8000/pdf",
		"PlatformSettings__ApiWorkflowEngineEndpoint=http://workflow-engine.local.altinn.cloud:8000/api/v1/",
	})
}

func TestBuildDockerRunSpec_DoesNotAddAppFrontendAssetBaseUrlByDefault(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)

	spec, err := testRunService(t).BuildDockerRunSpec(repocontext.Detection{
		AppRoot:   appPath,
		InAppRepo: true,
	}, nil, defaultTopology(), appsvc.DockerRunOptions{})
	if err != nil {
		t.Fatalf("BuildDockerRunSpec() error = %v", err)
	}

	assertEnvMissing(t, spec.Config.Env, "AppSettings__AppFrontendAssetBaseUrl")
}

func TestBuildDockerRunSpec_UsesAppFrontendAssetBaseUrlOverride(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)
	want := "http://app-frontend.local.altinn.cloud:8000"

	spec, err := testRunService(t).BuildDockerRunSpec(repocontext.Detection{
		AppRoot:   appPath,
		InAppRepo: true,
	}, nil, defaultTopology(), appsvc.DockerRunOptions{AppFrontendAssetBaseUrl: want})
	if err != nil {
		t.Fatalf("BuildDockerRunSpec() error = %v", err)
	}

	if got := envValue(t, spec.Config.Env, "AppSettings__AppFrontendAssetBaseUrl"); got != want {
		t.Fatalf("AppSettings__AppFrontendAssetBaseUrl = %q, want app frontend asset base URL override", got)
	}
}

func TestBuildDockerRunSpec_UsesImageTagOverride(t *testing.T) {
	t.Parallel()

	want := "ghcr.io/altinn/altinn-studio/app:frontend-test"

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)

	spec, err := testRunService(t).BuildDockerRunSpec(repocontext.Detection{
		AppRoot:   appPath,
		InAppRepo: true,
	}, nil, defaultTopology(), appsvc.DockerRunOptions{ImageTag: want})
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
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)
	projectPath := writeAppProject(t, appPath)
	spec, err := testRunService(t).BuildDotnetRunSpec(
		t.Context(),
		appPath,
		nil,
		nil,
		defaultTopology(),
		appsvc.DotnetRunOptions{},
	)
	if err != nil {
		t.Fatalf("BuildDotnetRunSpec() error = %v", err)
	}

	assertEnvContainsAll(t, spec.Env, []string{
		"Kestrel__EndPoints__Http__Url=http://127.0.0.1:5005",
		"PlatformSettings__ApiStorageEndpoint=http://local.altinn.cloud:8000/storage/api/v1/",
		"PlatformSettings__ApiPdf2Endpoint=http://pdf.local.altinn.cloud:8000/pdf",
		"PlatformSettings__ApiWorkflowEngineEndpoint=http://workflow-engine.local.altinn.cloud:8000/api/v1/",
	})
	// The app's callback verification codes are provisioned as a file, the way a deployed app gets them, and
	// are not configuration the app run hands over.
	for _, entry := range spec.Env {
		if strings.HasPrefix(entry, "AppCodes__") {
			t.Fatalf("env carries %q, want the app codes provisioned as a file instead", entry)
		}
	}
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

func TestBuildDotnetRunSpec_DoesNotAddAppFrontendAssetBaseUrlByDefault(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppProject(t, appPath)
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)

	spec, err := testRunService(t).BuildDotnetRunSpec(
		t.Context(),
		appPath,
		nil,
		nil,
		defaultTopology(),
		appsvc.DotnetRunOptions{},
	)
	if err != nil {
		t.Fatalf("BuildDotnetRunSpec() error = %v", err)
	}

	assertEnvMissing(t, spec.Env, "AppSettings__AppFrontendAssetBaseUrl")
}

func TestBuildDotnetRunSpec_PreservesCurrentEnv(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)
	writeAppProject(t, appPath)
	spec, err := testRunService(t).BuildDotnetRunSpec(
		t.Context(),
		appPath,
		nil,
		[]string{
			"ASPNETCORE_ENVIRONMENT=Custom",
			"GeneralSettings__HostName=custom.altinn.example",
			"PlatformSettings__ApiStorageEndpoint=http://example.test/storage",
		},
		defaultTopology(),
		appsvc.DotnetRunOptions{},
	)
	if err != nil {
		t.Fatalf("BuildDotnetRunSpec() error = %v", err)
	}

	if got := envValue(t, spec.Env, "ASPNETCORE_ENVIRONMENT"); got != "Custom" {
		t.Fatalf("ASPNETCORE_ENVIRONMENT = %q, want Custom", got)
	}
	if got := envValue(t, spec.Env, "GeneralSettings__HostName"); got != "custom.altinn.example" {
		t.Fatalf("GeneralSettings__HostName = %q, want current env value", got)
	}
	if got := envValue(t, spec.Env, "PlatformSettings__ApiStorageEndpoint"); got != "http://example.test/storage" {
		t.Fatalf("PlatformSettings__ApiStorageEndpoint = %q, want current env value", got)
	}
}

func TestBuildDotnetRunSpec_PreservesAppFrontendAssetBaseUrlOverride(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppProject(t, appPath)
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)

	spec, err := testRunService(t).BuildDotnetRunSpec(
		t.Context(),
		appPath,
		nil,
		[]string{"AppSettings__AppFrontendAssetBaseUrl=http://localhost:5173"},
		defaultTopology(),
		appsvc.DotnetRunOptions{},
	)
	if err != nil {
		t.Fatalf("BuildDotnetRunSpec() error = %v", err)
	}

	if got := envValue(t, spec.Env, "AppSettings__AppFrontendAssetBaseUrl"); got != "http://localhost:5173" {
		t.Fatalf("AppSettings__AppFrontendAssetBaseUrl = %q, want current env value", got)
	}
}

func TestBuildDotnetRunSpec_UsesAppFrontendAssetBaseUrlOptionOverCurrentEnv(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppProject(t, appPath)
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)
	want := "http://app-frontend.local.altinn.cloud:8000"

	spec, err := testRunService(t).BuildDotnetRunSpec(
		t.Context(),
		appPath,
		nil,
		[]string{"AppSettings__AppFrontendAssetBaseUrl=http://localhost:5173"},
		defaultTopology(),
		appsvc.DotnetRunOptions{AppFrontendAssetBaseUrl: want},
	)
	if err != nil {
		t.Fatalf("BuildDotnetRunSpec() error = %v", err)
	}

	if got := envValue(t, spec.Env, "AppSettings__AppFrontendAssetBaseUrl"); got != want {
		t.Fatalf("AppSettings__AppFrontendAssetBaseUrl = %q, want app frontend asset base URL option", got)
	}
}

func TestBuildDotnetRunSpec_RandomHostPortAsksKestrelToSelectPort(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)
	writeAppProject(t, appPath)
	spec, err := testRunService(t).BuildDotnetRunSpec(
		t.Context(),
		appPath,
		[]string{"--seed", "1"},
		nil,
		defaultTopology(),
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

	target, err := testService().ResolveRunTarget(t.Context(), appPath)
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

	_, err := testService().ResolveRunTarget(t.Context(), appPath)
	if err == nil {
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

func envValue(t *testing.T, env []string, key string) string {
	t.Helper()

	prefix := key + "="
	for _, entry := range env {
		if value, ok := strings.CutPrefix(entry, prefix); ok {
			return value
		}
	}
	t.Fatalf("env missing %q\n%v", key, env)
	return ""
}

func assertEnvMissing(t *testing.T, env []string, key string) {
	t.Helper()

	prefix := key + "="
	for _, entry := range env {
		if strings.HasPrefix(entry, prefix) {
			t.Fatalf("env contains %q\n%v", key, env)
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

func TestBuildDotnetRunSpec_NamesTheProvisionedSecrets(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)
	writeAppProject(t, appPath)
	home := t.TempDir()
	service := appsvc.NewService(&config.Config{Home: home, Version: config.NewVersion("test-version")})

	spec, err := service.BuildDotnetRunSpec(
		t.Context(),
		appPath,
		nil,
		nil,
		defaultTopology(),
		appsvc.DotnetRunOptions{},
	)
	if err != nil {
		t.Fatalf("BuildDotnetRunSpec() error = %v", err)
	}

	want := filepath.Join(home, "apps", "ttd", "test-app", "secrets")
	if spec.SecretsDir != want {
		t.Fatalf("SecretsDir = %q, want %q", spec.SecretsDir, want)
	}
	// The directory the app is pointed at is there before the app is, whether or not anything has been
	// stored in it. `studioctl app env` builds this same spec, so an app started from an IDE finds it too.
	assertIsDir(t, want)
	// The app is given the whole contract the platform gives a deployed app: where the secrets are, and what
	// every file in there is called. The app libraries require all three and fall back to nothing.
	assertProvisionedSecretsEnv(t, spec.Env, want)
	// A native run keeps its data-protection keys where the app libraries default to: the developer's home.
	assertEnvMissing(t, spec.Env, "ALTINN_KEYS_DIRECTORY")
}

func TestBuildDotnetRunSpec_ProvisionsTheDevelopmentAppCodes(t *testing.T) {
	t.Parallel()

	// The app reads its callback verification codes from the secrets directory at startup, so building the
	// run - which is also what `studioctl app env` does for an app started with `dotnet run` - puts them there.
	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)
	writeAppProject(t, appPath)
	home := t.TempDir()
	service := appsvc.NewService(&config.Config{Home: home, Version: config.NewVersion("test-version")})

	spec, err := service.BuildDotnetRunSpec(
		t.Context(),
		appPath,
		nil,
		nil,
		defaultTopology(),
		appsvc.DotnetRunOptions{},
	)
	if err != nil {
		t.Fatalf("BuildDotnetRunSpec() error = %v", err)
	}

	assertAppCodesProvisioned(t, spec.SecretsDir)
}

// The app does not start without its callback verification codes, so failing to write them is a failure to
// build the run - not something to carry on past and let the app discover.
func TestBuildDotnetRunSpec_FailsWhenTheAppCodesCannotBeWritten(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)
	writeAppProject(t, appPath)
	home := t.TempDir()
	// A directory where the app codes file belongs: nothing can replace it with a file.
	blocked := filepath.Join(home, "apps", "ttd", "test-app", "secrets", "app-codes.json")
	if err := os.MkdirAll(blocked, 0o700); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	service := appsvc.NewService(&config.Config{Home: home, Version: config.NewVersion("test-version")})

	_, err := service.BuildDotnetRunSpec(
		t.Context(),
		appPath,
		nil,
		nil,
		defaultTopology(),
		appsvc.DotnetRunOptions{},
	)
	if err == nil {
		t.Fatal("BuildDotnetRunSpec() error = nil, want an error provisioning the app secrets")
	}
}

func TestBuildDotnetRunSpec_OverridesInheritedProvisionedSecretsVariables(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)
	writeAppProject(t, appPath)
	home := t.TempDir()
	service := appsvc.NewService(&config.Config{Home: home, Version: config.NewVersion("test-version")})

	// The contract is studioctl's to state; stray values in the shell must not redirect the app.
	spec, err := service.BuildDotnetRunSpec(
		t.Context(),
		appPath,
		nil,
		[]string{
			"RUNTIME_APP_SECRETS_DIR=/somewhere/else",
			"RUNTIME_APP_SECRETS_MASKINPORTEN_FILENAME=something-else.json",
			"RUNTIME_APP_SECRETS_APPCODES_FILENAME=something-else.json",
		},
		defaultTopology(),
		appsvc.DotnetRunOptions{},
	)
	if err != nil {
		t.Fatalf("BuildDotnetRunSpec() error = %v", err)
	}

	assertProvisionedSecretsEnv(t, spec.Env, filepath.Join(home, "apps", "ttd", "test-app", "secrets"))
}

// A run without a secrets directory is not a run studioctl can start: the app would be left without the
// files studioctl provisions for it and without the variables the app libraries require. Both specs
// therefore fail rather than quietly leave the directory unnamed - whether there is nowhere to put it, or
// nothing to name it after.
func TestBuildRunSpecs_FailWithoutSomewhereToPlaceTheSecretsDirectory(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)
	writeAppProject(t, appPath)

	// No studioctl home: nowhere to place the directory.
	_, err := testService().BuildDotnetRunSpec(
		t.Context(),
		appPath,
		nil,
		nil,
		defaultTopology(),
		appsvc.DotnetRunOptions{},
	)
	if err == nil {
		t.Fatal("BuildDotnetRunSpec() error = nil, want an error naming the secrets directory")
	}
	_, err = testService().BuildDockerRunSpec(repocontext.Detection{
		AppRoot:   appPath,
		InAppRepo: true,
	}, nil, defaultTopology(), appsvc.DockerRunOptions{})
	if err == nil {
		t.Fatal("BuildDockerRunSpec() error = nil, want an error naming the secrets directory")
	}
}

func TestBuildRunSpecs_FailWithoutAnAppIDToNameTheSecretsDirectoryAfter(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppProject(t, appPath)

	// No application metadata: nothing to key the directory on.
	_, err := testRunService(t).BuildDotnetRunSpec(
		t.Context(),
		appPath,
		nil,
		nil,
		defaultTopology(),
		appsvc.DotnetRunOptions{},
	)
	if err == nil {
		t.Fatal("BuildDotnetRunSpec() error = nil, want an error reading the app id")
	}
	_, err = testRunService(t).BuildDockerRunSpec(repocontext.Detection{
		AppRoot:   appPath,
		InAppRepo: true,
	}, nil, defaultTopology(), appsvc.DockerRunOptions{})
	if err == nil {
		t.Fatal("BuildDockerRunSpec() error = nil, want an error reading the app id")
	}
}

func TestBuildDockerRunSpec_MountsTheSecretsDirectoryWhereADeployedAppFindsIt(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)
	home := t.TempDir()
	service := appsvc.NewService(&config.Config{Home: home, Version: config.NewVersion("test-version")})

	spec, err := service.BuildDockerRunSpec(repocontext.Detection{
		AppRoot:   appPath,
		InAppRepo: true,
	}, nil, defaultTopology(), appsvc.DockerRunOptions{})
	if err != nil {
		t.Fatalf("BuildDockerRunSpec() error = %v", err)
	}

	want := filepath.Join(home, "apps", "ttd", "test-app", "secrets")
	if spec.SecretsDir != want {
		t.Fatalf("SecretsDir = %q, want %q", spec.SecretsDir, want)
	}
	// The host side of the mount exists before the container does, so the runtime never creates it - on
	// Linux as root, where everything else under the studioctl home is the developer's - and the container
	// reads its callback verification codes from the mounted directory, so they are in it already, exactly
	// as for a native run.
	assertIsDir(t, want)
	assertAppCodesProvisioned(t, spec.SecretsDir)
	wantKeys := filepath.Join(home, "apps", "ttd", "test-app", "keys")
	if spec.KeysDir != wantKeys {
		t.Fatalf("KeysDir = %q, want %q", spec.KeysDir, wantKeys)
	}
	if len(spec.Config.Volumes) != 2 {
		t.Fatalf("Volumes = %+v, want the secrets and keys mounts", spec.Config.Volumes)
	}
	secrets, keys := spec.Config.Volumes[0], spec.Config.Volumes[1]
	if secrets.HostPath != want || secrets.ContainerPath != "/mnt/app-secrets" || !secrets.ReadOnly {
		t.Fatalf("secrets mount = %+v, want %s read-only at /mnt/app-secrets", secrets, want)
	}
	if keys.HostPath != wantKeys || keys.ContainerPath != "/mnt/keys" || keys.ReadOnly {
		t.Fatalf("keys mount = %+v, want %s writable at /mnt/keys", keys, wantKeys)
	}
	// The container is named the mount point, not the host directory, and it is told what every file in
	// there is called - the app libraries require all three wherever the app runs. Its data-protection keys
	// are named the same way a deployed app's are.
	assertProvisionedSecretsEnv(t, spec.Config.Env, "/mnt/app-secrets")
	if got := envValue(t, spec.Config.Env, "ALTINN_KEYS_DIRECTORY"); got != "/mnt/keys" {
		t.Fatalf("ALTINN_KEYS_DIRECTORY = %q, want /mnt/keys", got)
	}
}

// assertProvisionedSecretsEnv checks the contract the app libraries require: the secrets directory, and the
// name of every file in it. These are the variables the platform's configuration map sets for a deployed app.
func assertProvisionedSecretsEnv(t *testing.T, env []string, wantDir string) {
	t.Helper()

	for key, want := range map[string]string{
		"RUNTIME_APP_SECRETS_DIR":                   wantDir,
		"RUNTIME_APP_SECRETS_MASKINPORTEN_FILENAME": "maskinporten-settings.json",
		"RUNTIME_APP_SECRETS_APPCODES_FILENAME":     "app-codes.json",
	} {
		if got := envValue(t, env, key); got != want {
			t.Fatalf("%s = %q, want %q", key, got, want)
		}
	}
}

func TestPrepareDockerRun_RunsAsTheDeveloperAndAdaptsToTheRuntime(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)
	home := t.TempDir()
	service := appsvc.NewService(&config.Config{Home: home, Version: config.NewVersion("test-version")})
	spec, err := service.BuildDockerRunSpec(repocontext.Detection{
		AppRoot:   appPath,
		InAppRepo: true,
	}, nil, defaultTopology(), appsvc.DockerRunOptions{})
	if err != nil {
		t.Fatalf("BuildDockerRunSpec() error = %v", err)
	}

	// Rootless podman with SELinux: keep the developer's uid inside, relabel the bind mounts.
	if err := service.PrepareDockerRun(
		&spec,
		types.ContainerToolchain{Platform: types.PlatformPodman, SELinux: true},
	); err != nil {
		t.Fatalf("PrepareDockerRun() error = %v", err)
	}
	for _, dir := range []string{spec.SecretsDir, spec.KeysDir} {
		if info, statErr := os.Stat(dir); statErr != nil || !info.IsDir() {
			t.Fatalf("%s was not created before the mount: %v", dir, statErr)
		}
	}
	assertRunsAsTheDeveloper(t, spec, "keep-id")
	for _, mount := range spec.Config.Volumes {
		if mount.SELinuxRelabel != types.SELinuxRelabelShared {
			t.Fatalf("mount %s relabel = %q, want shared under SELinux", mount.ContainerPath, mount.SELinuxRelabel)
		}
	}

	// Docker: same user, no userns mode, no relabelling.
	if err := service.PrepareDockerRun(&spec, types.ContainerToolchain{Platform: types.PlatformDocker}); err != nil {
		t.Fatalf("PrepareDockerRun() error = %v", err)
	}
	assertRunsAsTheDeveloper(t, spec, "")
}

// assertRunsAsTheDeveloper checks the container user the way localtest sets it: the host uid:gid, or the
// image's own user on Windows, which has no uids. The userns mode follows the runtime, not the user: rootless
// podman keeps its id on Windows too, where the podman machine is the host.
func assertRunsAsTheDeveloper(t *testing.T, spec appsvc.DockerRunSpec, wantUserns string) {
	t.Helper()
	wantUser := fmt.Sprintf("%d:%d", os.Getuid(), os.Getgid())
	if runtime.GOOS == "windows" {
		wantUser = ""
	}
	if spec.Config.User != wantUser {
		t.Fatalf("User = %q, want %q", spec.Config.User, wantUser)
	}
	if spec.Config.UsernsMode != wantUserns {
		t.Fatalf("UsernsMode = %q, want %q", spec.Config.UsernsMode, wantUserns)
	}
}

// assertAppCodesProvisioned checks that the app's callback verification codes are in its secrets directory,
// in the file the app libraries read them from.
func assertAppCodesProvisioned(t *testing.T, secretsDir string) {
	t.Helper()
	if secretsDir == "" {
		t.Fatal("no secrets directory, want one to provision the app codes into")
	}
	data, err := os.ReadFile(appsecrets.AppCodesPath(secretsDir))
	if err != nil {
		t.Fatalf("ReadFile(app codes) error = %v", err)
	}
	if !strings.Contains(string(data), `"WorkflowEngineCallback"`) {
		t.Fatalf("app codes = %s, want a WorkflowEngineCallback code", data)
	}
}
