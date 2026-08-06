//nolint:testpackage // These tests exercise the unexported Maskinporten probes and Service wiring.
package doctor

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func writeAppFile(t *testing.T, root, relative, content string) {
	t.Helper()

	path := filepath.Join(root, filepath.FromSlash(relative))
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		t.Fatalf("create dir for %s: %v", relative, err)
	}
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("write %s: %v", relative, err)
	}
}

func detectedApp(root string) *App {
	return &App{Path: root, DetectedVia: "test", Error: "", Found: true}
}

func findCheck(checks []MaskinportenCheck, id, level string) *MaskinportenCheck {
	for i := range checks {
		if checks[i].ID == id && checks[i].Level == level {
			return &checks[i]
		}
	}
	return nil
}

func TestBuildMaskinporten_NoAppDetected_OmitsSection(t *testing.T) {
	t.Parallel()

	service := &Service{cfg: nil, debugf: func(string, ...any) {}}

	if report := service.buildMaskinporten(&App{Found: false}); report != nil {
		t.Fatalf("expected no Maskinporten section without a detected app, got %+v", report)
	}
	if report := service.buildMaskinporten(nil); report != nil {
		t.Fatalf("expected no Maskinporten section for a nil app, got %+v", report)
	}
}

func TestBuildMaskinporten_ExternalShapedSection_IsAnError(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	writeAppFile(t, root, "App/appsettings.json", `{
	  "MaskinportenSettings": {
	    "Environment": "test",
	    "ClientId": "some-client-id",
	    "EncodedJwk": "eyJraWQiOiJ0ZXN0In0="
	  }
	}`)

	service := &Service{cfg: nil, debugf: func(string, ...any) {}}
	report := service.buildMaskinporten(detectedApp(root))

	if report == nil || !report.HasIssues {
		t.Fatalf("expected a Maskinporten issue, got %+v", report)
	}
	check := findCheck(report.Checks, maskinportenConfigCheckID, diskLevelError)
	if check == nil {
		t.Fatalf("expected an error-level config check, got %+v", report.Checks)
	}
	if check.Path != filepath.FromSlash("App/appsettings.json") {
		t.Errorf("unexpected path %q", check.Path)
	}
}

func TestBuildMaskinporten_BuiltInSectionWithKey_IsAWarning(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	writeAppFile(t, root, "App/appsettings.json", `{
	  "MaskinportenSettings": {
	    "authority": "https://test.maskinporten.no/",
	    "clientId": "some-client-id",
	    "jwkBase64": "eyJraWQiOiJ0ZXN0In0="
	  }
	}`)

	service := &Service{cfg: nil, debugf: func(string, ...any) {}}
	report := service.buildMaskinporten(detectedApp(root))

	if report == nil || !report.HasIssues {
		t.Fatalf("expected a Maskinporten issue, got %+v", report)
	}
	if findCheck(report.Checks, maskinportenConfigCheckID, diskLevelWarn) == nil {
		t.Fatalf("expected a warn-level config check, got %+v", report.Checks)
	}
}

func TestBuildMaskinporten_ProvisionedShapeOnly_IsClean(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	writeAppFile(t, root, "App/appsettings.json", `{
	  "MaskinportenSettings": { "authority": "https://test.maskinporten.no/" },
	  "Logging": { "LogLevel": { "Default": "Information" } }
	}`)

	service := &Service{cfg: nil, debugf: func(string, ...any) {}}
	report := service.buildMaskinporten(detectedApp(root))

	if report == nil || report.HasIssues {
		t.Fatalf("expected a clean Maskinporten report, got %+v", report)
	}
	if findCheck(report.Checks, maskinportenConfigCheckID, diskLevelOK) == nil {
		t.Fatalf("expected an ok-level config check, got %+v", report.Checks)
	}
}

func TestBuildMaskinporten_ExternalPackageReference_IsInformational(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	writeAppFile(t, root, "App/App.csproj", `<Project Sdk="Microsoft.NET.Sdk.Web">
	  <ItemGroup>
	    <PackageReference Include="Altinn.ApiClients.Maskinporten" Version="10.0.1" />
	  </ItemGroup>
	</Project>`)

	service := &Service{cfg: nil, debugf: func(string, ...any) {}}
	report := service.buildMaskinporten(detectedApp(root))

	if report == nil {
		t.Fatal("expected a Maskinporten report")
	}
	if report.HasIssues {
		t.Errorf("an app-declared package reference must not be reported as an issue: %+v", report.Checks)
	}
	if findCheck(report.Checks, maskinportenPackageCheckID, diskLevelInfo) == nil {
		t.Fatalf("expected an info-level package check, got %+v", report.Checks)
	}
}

func TestBuildMaskinporten_IgnoresBuildOutput(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	writeAppFile(t, root, "App/obj/Debug/appsettings.json", `{
	  "MaskinportenSettings": { "Environment": "test", "EncodedJwk": "x" }
	}`)

	service := &Service{cfg: nil, debugf: func(string, ...any) {}}
	report := service.buildMaskinporten(detectedApp(root))

	if report == nil || report.HasIssues {
		t.Fatalf("build output must not be inspected, got %+v", report)
	}
}

func TestBuildMaskinporten_UnparseableAppSettings_IsSkipped(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	writeAppFile(t, root, "App/appsettings.json", "{ this is not json")

	service := &Service{cfg: nil, debugf: func(string, ...any) {}}
	report := service.buildMaskinporten(detectedApp(root))

	if report == nil || report.HasIssues {
		t.Fatalf("a malformed appsettings file is not a Maskinporten finding, got %+v", report)
	}
}

func TestReadMaskinportenSectionKeys_RelaxedJSON(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	path := filepath.Join(root, "appsettings.json")
	writeAppFile(t, root, "appsettings.json", `{
	  // credentials for the reporting integration
	  "MaskinportenSettings": {
	    /* the external client's shape */
	    "Environment": "test",
	    "EncodedJwk": "a//b, c",
	  },
	}`)

	keys, ok := readMaskinportenSectionKeys(path)
	if !ok {
		t.Fatal("expected the section to be found in relaxed JSON")
	}

	matched := matchingKeys(keys, isExternalOnlyMaskinportenKey)
	if len(matched) != 2 {
		t.Fatalf("expected both external keys, got %v (all keys %v)", matched, keys)
	}
}

// A // sequence and a comma-brace sequence inside a string value must survive relaxation, or a URL
// would silently truncate the document.
func TestRelaxJSON_LeavesStringContentAlone(t *testing.T) {
	t.Parallel()

	input := []byte(`{"authority": "https://test.maskinporten.no/", "note": "a, }"}`)

	var parsed map[string]string
	if err := json.Unmarshal(relaxJSON(input), &parsed); err != nil {
		t.Fatalf("relaxed JSON did not parse: %v", err)
	}
	if parsed["authority"] != "https://test.maskinporten.no/" {
		t.Errorf("authority was mangled: %q", parsed["authority"])
	}
	if parsed["note"] != "a, }" {
		t.Errorf("note was mangled: %q", parsed["note"])
	}
}

func TestBuildMaskinporten_CaseInsensitiveSectionName(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	writeAppFile(t, root, "App/appsettings.Production.json", `{
	  "maskinportensettings": { "environment": "prod", "certificatePkcs12Path": "/secrets/cert.p12" }
	}`)

	service := &Service{cfg: nil, debugf: func(string, ...any) {}}
	report := service.buildMaskinporten(detectedApp(root))

	if report == nil || !report.HasIssues {
		t.Fatalf("a differently-cased section name collides just the same, got %+v", report)
	}
}
