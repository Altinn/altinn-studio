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

	check := service.checkMaskinportenClientState(newAppFolder(t))

	if check.Level != diskLevelInfo {
		t.Fatalf("Level = %q, want %q (message: %s)", check.Level, diskLevelInfo, check.Message)
	}
	if !strings.Contains(check.Message, "studioctl app maskinporten set") {
		t.Errorf("message does not say what to run: %s", check.Message)
	}
	if !strings.Contains(check.Message, "separate client") {
		t.Errorf("message does not say it is a separate client: %s", check.Message)
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

	check := service.checkMaskinportenClientState(appPath)

	if check.Level != diskLevelOK {
		t.Fatalf("Level = %q, want %q (message: %s)", check.Level, diskLevelOK, check.Message)
	}
	if !strings.Contains(check.Message, "client-5") {
		t.Errorf("message does not name the client: %s", check.Message)
	}
	if !strings.Contains(check.Message, "granted separately") {
		t.Errorf("message does not carry the two-client caveat: %s", check.Message)
	}
}

func TestCheckMaskinportenClientState_WithoutAppMetadata_Warns(t *testing.T) {
	t.Parallel()

	service := newServiceWithHome(t)

	check := service.checkMaskinportenClientState(t.TempDir())

	if check.Level != diskLevelWarn {
		t.Fatalf("Level = %q, want %q (message: %s)", check.Level, diskLevelWarn, check.Message)
	}
}

func TestBuildDisk_WithoutADetectedApp_OmitsTheMaskinportenCheck(t *testing.T) {
	t.Parallel()

	service := newServiceWithHome(t)

	disk := service.buildDisk(&App{Found: false})

	for _, check := range disk.Checks {
		if check.ID == "maskinporten_client" {
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
		if check.ID == "maskinporten_client" {
			found = true
		}
	}
	if !found {
		t.Fatal("maskinporten check missing for a detected app")
	}
}
