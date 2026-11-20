//nolint:testpackage // These tests exercise the unexported dotnet probe without shelling out.
package doctor

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

const (
	v9GlobalJSON = `{"sdk":{"version":"11.0.100","rollForward":"latestFeature","allowPrerelease":false}}`
	sdk10        = "10.0.401"
)

// writeTestApp writes a v9 app with one project file targeting net11.0, and returns the app root.
func writeTestApp(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	project := `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net11.0</TargetFramework>
  </PropertyGroup>
</Project>`
	writeTestFile(t, filepath.Join(root, "App", "App.csproj"), project)
	return root
}

func writeTestFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		t.Fatalf("create %s: %v", filepath.Dir(path), err)
	}
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

// dotnetService returns a service whose dotnet reports version in the app's project directory, or fails with err.
func dotnetService(t *testing.T, version string, err error) *Service {
	t.Helper()
	return &Service{
		debugf: func(string, ...any) {},
		versionOutput: func(context.Context, string, ...string) ([]byte, error) {
			t.Fatal("dotnet --version ran outside the app's project directory")
			return nil, errUnexpectedTool
		},
		dotnetVersionIn: func(_ context.Context, dir string) ([]byte, error) {
			if filepath.Base(dir) != "App" {
				t.Fatalf("dotnet --version ran in %s, want the app's project directory", dir)
			}
			if err != nil {
				return nil, err
			}
			return []byte(version + "\n"), nil
		},
	}
}

func foundApp(path string) *App {
	return &App{Path: path, DetectedVia: "applicationmetadata.json", Found: true}
}

func TestReadDotnetRequirement_TakesTheTargetFrameworkWhenNoGlobalJSONNamesAVersion(t *testing.T) {
	root := writeTestApp(t)

	requirement, err := readDotnetRequirement(root)
	if err != nil {
		t.Fatalf("readDotnetRequirement() error = %v", err)
	}
	want := DotnetRequirement{
		Project:         filepath.Join(root, "App", "App.csproj"),
		TargetFramework: "net11.0",
		MinimumSDK:      "11.0",
	}
	if *requirement != want {
		t.Fatalf("readDotnetRequirement() = %#v, want %#v", *requirement, want)
	}
}

func TestReadDotnetRequirement_ReadsTheNearestGlobalJSON(t *testing.T) {
	root := writeTestApp(t)
	writeTestFile(t, filepath.Join(filepath.Dir(root), "global.json"), `{"sdk":{"version":"8.0.100"}}`)
	writeTestFile(t, filepath.Join(root, "global.json"), v9GlobalJSON)

	requirement, err := readDotnetRequirement(root)
	if err != nil {
		t.Fatalf("readDotnetRequirement() error = %v", err)
	}
	if requirement.GlobalJSON != filepath.Join(root, "global.json") ||
		requirement.SDKVersion != "11.0.100" ||
		requirement.RollForward != "latestFeature" {
		t.Fatalf("readDotnetRequirement() = %#v, want the app root's global.json", *requirement)
	}
}

func TestReadDotnetRequirement_DefaultsRollForwardAsDotnetDoes(t *testing.T) {
	root := writeTestApp(t)
	writeTestFile(t, filepath.Join(root, "global.json"), `{"sdk":{"version":"11.0.100"}}`)

	requirement, err := readDotnetRequirement(root)
	if err != nil {
		t.Fatalf("readDotnetRequirement() error = %v", err)
	}
	if requirement.RollForward != "latestPatch" {
		t.Fatalf("readDotnetRequirement() RollForward = %q, want latestPatch", requirement.RollForward)
	}
}

func TestReadDotnetRequirement_IgnoresAGlobalJSONWithoutAVersion(t *testing.T) {
	root := writeTestApp(t)
	writeTestFile(t, filepath.Join(root, "global.json"), `{"msbuild-sdks":{"Some.Sdk":"1.0.0"}}`)

	requirement, err := readDotnetRequirement(root)
	if err != nil {
		t.Fatalf("readDotnetRequirement() error = %v", err)
	}
	if requirement.GlobalJSON != "" || requirement.SDKVersion != "" {
		t.Fatalf("readDotnetRequirement() = %#v, want no global.json requirement", *requirement)
	}
}

func TestReadDotnetRequirement_TakesTheHighestOfSeveralTargetFrameworks(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, filepath.Join(root, "App", "App.csproj"), `<Project>
  <PropertyGroup>
    <TargetFrameworks>net8.0;net11.0;netstandard2.0</TargetFrameworks>
  </PropertyGroup>
</Project>`)

	requirement, err := readDotnetRequirement(root)
	if err != nil {
		t.Fatalf("readDotnetRequirement() error = %v", err)
	}
	if requirement.TargetFramework != "net11.0" || requirement.MinimumSDK != "11.0" {
		t.Fatalf("readDotnetRequirement() = %#v, want net11.0", *requirement)
	}
}

func TestProbeDotnet_InsideAnApp_PassesAnSDKThatBuildsItsFramework(t *testing.T) {
	root := writeTestApp(t)

	for _, version := range []string{"11.0.100", "11.0.100-rc.2.26504.105", "12.0.100"} {
		value, requirement, err := dotnetService(t, version, nil).probeDotnet(t.Context(), foundApp(root))
		if err != nil {
			t.Fatalf("probeDotnet() with SDK %s error = %v", version, err)
		}
		if value != version || requirement == nil || requirement.TargetFramework != "net11.0" {
			t.Fatalf("probeDotnet() with SDK %s = %q, %#v", version, value, requirement)
		}
	}
}

func TestProbeDotnet_InsideAnApp_FailsAnSDKOlderThanItsFramework(t *testing.T) {
	root := writeTestApp(t)

	value, requirement, err := dotnetService(t, sdk10, nil).probeDotnet(t.Context(), foundApp(root))
	if !errors.Is(err, errDotnetTooOldForApp) {
		t.Fatalf("probeDotnet() error = %v, want %v", err, errDotnetTooOldForApp)
	}
	if !strings.Contains(err.Error(), "net11.0 needs SDK 11.0 or later") {
		t.Fatalf("probeDotnet() error = %q, want it to name the SDK the app needs", err)
	}
	if value != sdk10 || requirement == nil {
		t.Fatalf("probeDotnet() = %q, %#v", value, requirement)
	}
}

func TestProbeDotnet_InsideAnApp_NamesTheGlobalJSONVersionNoSDKMatches(t *testing.T) {
	root := writeTestApp(t)
	writeTestFile(t, filepath.Join(root, "global.json"), v9GlobalJSON)

	value, requirement, err := dotnetService(t, "", &exec.ExitError{}).probeDotnet(t.Context(), foundApp(root))
	if !errors.Is(err, errDotnetNoGlobalJSONMatch) {
		t.Fatalf("probeDotnet() error = %v, want %v", err, errDotnetNoGlobalJSONMatch)
	}
	if !strings.Contains(err.Error(), "requests 11.0.100 with rollForward latestFeature") {
		t.Fatalf("probeDotnet() error = %q, want it to name the requested version", err)
	}
	if value != "" || requirement == nil || requirement.SDKVersion != "11.0.100" {
		t.Fatalf("probeDotnet() = %q, %#v", value, requirement)
	}
}

func TestProbeDotnet_InsideAnApp_FailsAGlobalJSONThatSelectsAnSDKTooOldForTheFramework(t *testing.T) {
	root := writeTestApp(t)
	writeTestFile(t, filepath.Join(root, "global.json"), `{"sdk":{"version":"`+sdk10+`"}}`)

	_, requirement, err := dotnetService(t, sdk10, nil).probeDotnet(t.Context(), foundApp(root))
	if !errors.Is(err, errDotnetTooOldForApp) {
		t.Fatalf("probeDotnet() error = %v, want %v", err, errDotnetTooOldForApp)
	}
	if requirement == nil || requirement.SDKVersion != sdk10 {
		t.Fatalf("probeDotnet() requirement = %#v, want the global.json version", requirement)
	}
}

func TestProbeDotnet_OutsideAnApp_ChecksTheLowestSDKAnyAppNeeds(t *testing.T) {
	for version, wantOK := range map[string]bool{"7.0.410": false, "8.0.100": true, sdk10: true} {
		svc := &Service{
			debugf: func(string, ...any) {},
			versionOutput: func(_ context.Context, name string, _ ...string) ([]byte, error) {
				if name != dotnetTool {
					return nil, errUnexpectedTool
				}
				return []byte(version), nil
			},
			dotnetVersionIn: func(context.Context, string) ([]byte, error) {
				t.Fatal("dotnet --version ran in a project directory outside an app")
				return nil, errUnexpectedTool
			},
		}

		value, requirement, err := svc.probeDotnet(t.Context(), &App{Found: false})
		if (err == nil) != wantOK {
			t.Fatalf("probeDotnet() with SDK %s error = %v, want ok %t", version, err, wantOK)
		}
		if value != version || requirement != nil {
			t.Fatalf("probeDotnet() with SDK %s = %q, %#v", version, value, requirement)
		}
	}
}

func TestProbeDotnet_InsideAnAppWithoutAReadableProject_FallsBackToTheGeneralCheck(t *testing.T) {
	root := t.TempDir()
	svc := &Service{
		debugf: func(string, ...any) {},
		versionOutput: func(context.Context, string, ...string) ([]byte, error) {
			return []byte(sdk10), nil
		},
	}

	value, requirement, err := svc.probeDotnet(t.Context(), foundApp(root))
	if err != nil || value != sdk10 || requirement != nil {
		t.Fatalf("probeDotnet() = %q, %#v, %v; want the general check", value, requirement, err)
	}
}

func TestSdkBuildsFramework(t *testing.T) {
	tests := []struct {
		version string
		minimum string
		want    bool
	}{
		{"11.0.100", "11.0", true},
		{"11.0.100-rc.2.26504.105", "11.0", true},
		{sdk10, "11.0", false},
		{"8.0.416", "8.0", true},
		{sdk10, "8.0", true},
		{"garbage", "11.0", false},
	}
	for _, tt := range tests {
		if got := sdkBuildsFramework(tt.version, tt.minimum); got != tt.want {
			t.Errorf("sdkBuildsFramework(%q, %q) = %t, want %t", tt.version, tt.minimum, got, tt.want)
		}
	}
}
