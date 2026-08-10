package cmd

import (
	"bytes"
	"encoding/json"
	"errors"
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

func TestParseCloneSource(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		input    string
		wantOrg  string
		wantRepo string
		wantEnv  string
	}{
		{name: "org and repo", input: "ttd/my-app", wantOrg: "ttd", wantRepo: "my-app"},
		{
			name:     "production browser URL",
			input:    "https://altinn.studio/repos/ttd/my-app",
			wantOrg:  "ttd",
			wantRepo: "my-app",
			wantEnv:  "prod",
		},
		{
			name:     "production clone URL",
			input:    "https://altinn.studio/repos/ttd/my-app.git",
			wantOrg:  "ttd",
			wantRepo: "my-app",
			wantEnv:  "prod",
		},
		{
			name:     "development URL",
			input:    "https://dev.altinn.studio/repos/ttd/my-app.git",
			wantOrg:  "ttd",
			wantRepo: "my-app",
			wantEnv:  "dev",
		},
		{
			name:     "staging URL",
			input:    "https://staging.altinn.studio/repos/ttd/my-app",
			wantOrg:  "ttd",
			wantRepo: "my-app",
			wantEnv:  "staging",
		},
		{
			name:     "local URL",
			input:    "http://studio.localhost/repos/ttd/my-app.git",
			wantOrg:  "ttd",
			wantRepo: "my-app",
			wantEnv:  "local",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, err := parseCloneSource(tt.input)
			if err != nil {
				t.Fatalf("parseCloneSource() error = %v", err)
			}
			if got.org != tt.wantOrg || got.repo != tt.wantRepo || got.env != tt.wantEnv {
				t.Errorf(
					"parseCloneSource() = %+v, want org=%q repo=%q env=%q",
					got,
					tt.wantOrg,
					tt.wantRepo,
					tt.wantEnv,
				)
			}
		})
	}
}

func TestParseCloneSourceRejectsInvalidURLs(t *testing.T) {
	t.Parallel()

	inputs := []string{
		"https://example.com/repos/ttd/my-app",
		"http://altinn.studio/repos/ttd/my-app",
		"https://altinn.studio/ttd/my-app",
		"https://altinn.studio/repos/ttd/my-app/extra",
		"https://altinn.studio/repos/ttd/.git",
		"https://altinn.studio/repos/ttd/my-app?ref=main",
		"https://altinn.studio:/repos/ttd/my-app",
	}

	for _, input := range inputs {
		t.Run(input, func(t *testing.T) {
			t.Parallel()

			if _, err := parseCloneSource(input); err == nil {
				t.Errorf("parseCloneSource(%q) error = nil, want error", input)
			}
		})
	}
}

func TestRunCloneRejectsFlagsAfterRepository(t *testing.T) {
	t.Parallel()

	inputs := [][]string{
		{"https://altinn.studio/repos/ttd/my-app", "--env", "prod"},
		{"https://altinn.studio/repos/ttd/my-app", "--env=prod"},
		{"ttd/my-app", "destination", "extra"},
	}

	for _, input := range inputs {
		t.Run(strings.Join(input, " "), func(t *testing.T) {
			t.Parallel()

			err := (&AppCommand{}).runClone(t.Context(), input)
			if !errors.Is(err, ErrInvalidFlagValue) {
				t.Errorf("runClone() error = %v, want ErrInvalidFlagValue", err)
			}
		})
	}
}

func TestIsCloneFlagAllowsHyphenPrefixedDestination(t *testing.T) {
	t.Parallel()

	if isCloneFlag("-scratch") {
		t.Error("isCloneFlag(-scratch) = true, want false")
	}
}

func TestResolveCloneEnvironment(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		flagEnv     string
		inferredEnv string
		want        string
		envSet      bool
		wantErr     bool
	}{
		{name: "default", flagEnv: "prod", want: "prod"},
		{name: "inferred", flagEnv: "prod", inferredEnv: "dev", want: "dev"},
		{name: "matching explicit", flagEnv: "dev", inferredEnv: "dev", envSet: true, want: "dev"},
		{name: "conflicting explicit", flagEnv: "prod", inferredEnv: "dev", envSet: true, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, err := resolveCloneEnvironment(tt.flagEnv, tt.envSet, tt.inferredEnv)
			if (err != nil) != tt.wantErr {
				t.Fatalf("resolveCloneEnvironment() error = %v, wantErr %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Errorf("resolveCloneEnvironment() = %q, want %q", got, tt.want)
			}
		})
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
