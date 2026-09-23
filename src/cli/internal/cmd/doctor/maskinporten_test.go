//nolint:testpackage // These tests exercise the unexported Maskinporten check and buildDisk wiring.
package doctor

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/appsecrets"
	"altinn.studio/studioctl/internal/config"
)

const (
	testAppID = "ttd/my-app"
	testJwk   = `{"kty":"RSA","use":"sig","kid":"test-key","alg":"RS256","n":"modulus","e":"AQAB",` +
		`"d":"private-part","p":"p","q":"q","qi":"qi","dp":"dp","dq":"dq"}`
)

// newAppFolder writes an app directory with application metadata naming testAppID.
func newAppFolder(t *testing.T) string {
	t.Helper()

	appPath := t.TempDir()
	configDir := filepath.Join(appPath, "App", "config")
	if err := os.MkdirAll(configDir, 0o750); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}

	metadata := `{"id":"` + testAppID + `","org":"ttd","app":"my-app"}`
	if err := os.WriteFile(filepath.Join(configDir, "applicationmetadata.json"), []byte(metadata), 0o600); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
	return appPath
}

func newServiceWithHome(t *testing.T) *Service {
	t.Helper()

	cfg := &config.Config{Home: t.TempDir()}
	return New(cfg, nil)
}

func TestCheckMaskinportenClientState_WithoutAStoredClient_SaysWhatToRun(t *testing.T) {
	t.Parallel()

	service := newServiceWithHome(t)

	check, reportable := service.checkMaskinportenClientState(newAppFolder(t))

	if !reportable {
		t.Fatal("check not reported for an app with readable metadata")
	}
	if check.Level != diskLevelInfo {
		t.Fatalf("Level = %q, want %q (message: %s)", check.Level, diskLevelInfo, check.Message)
	}
	if check.Message != "no local Maskinporten client configured" {
		t.Errorf("message = %q, want the terse form", check.Message)
	}
}

func TestCheckMaskinportenClientState_WithAStoredClient_ReportsItAndTheScopeCaveat(t *testing.T) {
	t.Parallel()

	service := newServiceWithHome(t)
	appPath := newAppFolder(t)

	dir, err := service.cfg.AppSecretsDir(testAppID)
	if err != nil {
		t.Fatalf("AppSecretsDir() error = %v", err)
	}
	client, err := appsecrets.ParseMaskinportenClient([]byte(
		`{"clientId":"client-5","authority":"https://test.maskinporten.no/","jwk":` + testJwk + `}`,
	))
	if err != nil {
		t.Fatalf("ParseMaskinportenClient() error = %v", err)
	}
	if _, err := appsecrets.StoreMaskinportenClient(dir, client); err != nil {
		t.Fatalf("StoreMaskinportenClient() error = %v", err)
	}

	check, reportable := service.checkMaskinportenClientState(appPath)

	if !reportable {
		t.Fatal("check not reported for an app with a stored client")
	}
	if check.Level != diskLevelOK {
		t.Fatalf("Level = %q, want %q (message: %s)", check.Level, diskLevelOK, check.Message)
	}
	if !strings.Contains(check.Message, "client-5") {
		t.Errorf("message does not name the client: %s", check.Message)
	}
	if strings.Contains(check.Message, "scopes") {
		t.Errorf("message should stay terse and leave scope guidance to the upgrade: %s", check.Message)
	}
}

// An app can be detected from a project file alone, so missing metadata is an ordinary state rather than a
// Maskinporten problem. Reporting it here once warned, which flowed through Disk.HasIssues into doctor's
// overall verdict and blamed Maskinporten for it.
func TestCheckMaskinportenClientState_WithoutAppMetadata_IsNotReported(t *testing.T) {
	t.Parallel()

	service := newServiceWithHome(t)

	_, reportable := service.checkMaskinportenClientState(t.TempDir())

	if reportable {
		t.Fatal("check reported for an app whose id cannot be read")
	}
}

func TestBuildDisk_WithAnUnidentifiableApp_DoesNotReportIssues(t *testing.T) {
	t.Parallel()

	service := newServiceWithHome(t)

	// Compared against the no-app report rather than asserted outright: the other disk checks run against a
	// config with only Home set, so they fail here for reasons of their own. What matters is that the
	// unidentifiable app adds nothing - neither a row nor a contribution to the verdict.
	withApp := service.buildDisk(&App{Found: true, Path: t.TempDir()})
	withoutApp := service.buildDisk(&App{Found: false})

	for _, check := range withApp.Checks {
		if check.ID == maskinportenCheckID {
			t.Fatalf("maskinporten check present for an app with no readable id: %+v", check)
		}
	}
	if len(withApp.Checks) != len(withoutApp.Checks) {
		t.Errorf("check count = %d with the app, %d without", len(withApp.Checks), len(withoutApp.Checks))
	}
	if withApp.HasIssues != withoutApp.HasIssues {
		t.Errorf("HasIssues = %v with the app, %v without", withApp.HasIssues, withoutApp.HasIssues)
	}
}

func TestBuildDisk_WithoutADetectedApp_OmitsTheMaskinportenCheck(t *testing.T) {
	t.Parallel()

	service := newServiceWithHome(t)

	disk := service.buildDisk(&App{Found: false})

	for _, check := range disk.Checks {
		if check.ID == maskinportenCheckID {
			t.Fatalf("maskinporten check present without a detected app: %+v", check)
		}
	}
}

func TestBuildDisk_WithADetectedApp_IncludesTheMaskinportenCheck(t *testing.T) {
	t.Parallel()

	service := newServiceWithHome(t)

	disk := service.buildDisk(&App{Found: true, Path: newAppFolder(t)})

	var found bool
	for _, check := range disk.Checks {
		if check.ID == maskinportenCheckID {
			found = true
		}
	}
	if !found {
		t.Fatal("maskinporten check missing for a detected app")
	}
}
