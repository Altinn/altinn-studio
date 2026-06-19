package cmd

import (
	"bytes"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	appsvc "altinn.studio/studioctl/internal/cmd/app"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

func TestAppBuildOutputPrintText(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	output := appBuildOutput{ImageTag: "example/app:test", Pushed: true}
	if err := output.PrintImage(ui.NewOutput(&out, io.Discard, false)); err != nil {
		t.Fatalf("PrintImage() error = %v", err)
	}
	if err := output.PrintFinal(ui.NewOutput(&out, io.Discard, false)); err != nil {
		t.Fatalf("PrintFinal() error = %v", err)
	}

	got := out.String()
	if !strings.Contains(got, "Image: example/app:test") {
		t.Fatalf("output = %q, want image line", got)
	}
	if !strings.Contains(got, "Pushed: example/app:test") {
		t.Fatalf("output = %q, want pushed line", got)
	}
}

func TestAppBuildOutputPrintJSON(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	output := appBuildOutput{ImageTag: "example/app:test", Pushed: true, JSONOutput: true}
	writer := ui.NewOutput(&out, io.Discard, false)
	if err := output.PrintImage(writer); err != nil {
		t.Fatalf("PrintImage() error = %v", err)
	}
	if err := output.PrintFinal(writer); err != nil {
		t.Fatalf("PrintFinal() error = %v", err)
	}

	var got appBuildOutput
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got.ImageTag != output.ImageTag || !got.Pushed {
		t.Fatalf("output = %+v, want image tag and pushed true", got)
	}
}

func TestRunEnvPrintsHarnessEnvironment(t *testing.T) {
	t.Parallel()

	appRoot := writeEnvCommandApp(t)
	command, out := newEnvCommand()

	if err := command.runEnv(t.Context(), []string{"-p", appRoot, "--json"}); err != nil {
		t.Fatalf("runEnv() error = %v", err)
	}

	var got map[string]string
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}

	assertEnvCommandValue(t, got, "ASPNETCORE_ENVIRONMENT", "Development")
	assertEnvCommandValue(t, got, "Kestrel__EndPoints__Http__Url", "http://127.0.0.1:0")
	assertEnvCommandValue(t, got, "STUDIOCTL_APP_RUN", "1")
	assertEnvCommandValue(
		t,
		got,
		"PlatformSettings__ApiStorageEndpoint",
		"http://local.altinn.cloud:8000/storage/api/v1/",
	)
}

func TestRunEnvPrintsTextByDefault(t *testing.T) {
	t.Parallel()

	appRoot := writeEnvCommandApp(t)
	command, out := newEnvCommand()

	if err := command.runEnv(t.Context(), []string{"-p", appRoot}); err != nil {
		t.Fatalf("runEnv() error = %v", err)
	}

	got := out.String()
	if !strings.Contains(got, "ASPNETCORE_ENVIRONMENT=Development") {
		t.Fatalf("output = %q, want ASPNETCORE_ENVIRONMENT line", got)
	}
	if !strings.Contains(got, "STUDIOCTL_APP_RUN=1") {
		t.Fatalf("output = %q, want STUDIOCTL_APP_RUN line", got)
	}
}

func TestRunEnvCanUseStableHostPort(t *testing.T) {
	t.Parallel()

	appRoot := writeEnvCommandApp(t)
	command, out := newEnvCommand()

	if err := command.runEnv(
		t.Context(),
		[]string{"--project", filepath.Join(appRoot, "App", "App.csproj"), "--random-host-port=false", "--json"},
	); err != nil {
		t.Fatalf("runEnv() error = %v", err)
	}

	var got map[string]string
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}

	assertEnvCommandValue(t, got, "Kestrel__EndPoints__Http__Url", "http://127.0.0.1:5005")
}

func TestParseAppUpgradeFlagsAcceptsSupportedKinds(t *testing.T) {
	t.Parallel()

	command := &AppCommand{}
	for _, kind := range []string{appUpgradeKindFrontendV4, appUpgradeKindBackendV8, appUpgradeKindV9} {
		t.Run(kind, func(t *testing.T) {
			t.Parallel()

			flags, help, err := command.parseAppUpgradeFlags([]string{kind, "-p", "/tmp/app"})
			if err != nil {
				t.Fatalf("parseAppUpgradeFlags() error = %v", err)
			}
			if help {
				t.Fatal("parseAppUpgradeFlags() help = true, want false")
			}
			if flags.kind != kind {
				t.Fatalf("kind = %q, want %q", flags.kind, kind)
			}
			if flags.appPath != "/tmp/app" {
				t.Fatalf("appPath = %q, want /tmp/app", flags.appPath)
			}
		})
	}
}

func TestParseAppUpgradeFlagsDefaultsToV9(t *testing.T) {
	t.Parallel()

	flags, help, err := (&AppCommand{}).parseAppUpgradeFlags([]string{"-p", "/tmp/app"})
	if err != nil {
		t.Fatalf("parseAppUpgradeFlags() error = %v", err)
	}
	if help {
		t.Fatal("parseAppUpgradeFlags() help = true, want false")
	}
	if flags.kind != appUpgradeKindV9 {
		t.Fatalf("kind = %q, want %q", flags.kind, appUpgradeKindV9)
	}
}

func TestParseAppUpgradeFlagsRejectsUnsupportedKind(t *testing.T) {
	t.Parallel()

	_, _, err := (&AppCommand{}).parseAppUpgradeFlags([]string{"backend-v9"})
	if err == nil {
		t.Fatal("parseAppUpgradeFlags() error = nil, want error")
	}
}

func newEnvCommand() (*AppCommand, *bytes.Buffer) {
	var out bytes.Buffer
	return &AppCommand{
		out:     ui.NewOutput(&out, io.Discard, false),
		service: appsvc.NewService(&config.Config{Version: config.NewVersion("test-version")}),
	}, &out
}

func writeEnvCommandApp(t *testing.T) string {
	t.Helper()

	appRoot := t.TempDir()
	configDir := filepath.Join(appRoot, "App", "config")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	if err := os.WriteFile(
		filepath.Join(configDir, "applicationmetadata.json"),
		[]byte(`{"id":"ttd/test-app"}`),
		0o600,
	); err != nil {
		t.Fatalf("WriteFile(applicationmetadata.json) error = %v", err)
	}
	project := `<Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup><PackageReference Include="Altinn.App.Core" Version="9.0.0" /></ItemGroup></Project>`
	if err := os.WriteFile(filepath.Join(appRoot, "App", "App.csproj"), []byte(project), 0o600); err != nil {
		t.Fatalf("WriteFile(App.csproj) error = %v", err)
	}
	return appRoot
}

func assertEnvCommandValue(t *testing.T, values map[string]string, key, want string) {
	t.Helper()

	if got := values[key]; got != want {
		t.Fatalf("%s = %q, want %q", key, got, want)
	}
}
