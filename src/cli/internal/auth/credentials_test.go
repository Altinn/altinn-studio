package auth_test

import (
	"errors"
	"os"
	"runtime"
	"testing"

	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	testHTTP  = "http"
	testHTTPS = "https"
)

func TestLoadCredentials_EmptyWhenFileNotExists(t *testing.T) {
	t.Parallel()
	homeDir := t.TempDir()

	creds, err := auth.LoadCredentials(homeDir)
	if err != nil {
		t.Fatalf("LoadCredentials failed: %v", err)
	}

	if creds.Envs == nil {
		t.Fatal("Envs should not be nil")
	}

	if len(creds.Envs) != 0 {
		t.Errorf("expected 0 envs, got %d", len(creds.Envs))
	}
}

func TestSaveAndLoadCredentials(t *testing.T) {
	t.Parallel()
	homeDir := t.TempDir()

	// Save credentials
	creds := &auth.Credentials{
		Envs: map[string]auth.EnvCredentials{
			"prod": {
				Host:     "altinn.studio",
				ApiKey:   "test-api-key",
				ApiKeyID: 1,
				Username: "testuser",
			},
			"dev": {
				Host:     "dev.altinn.studio",
				Scheme:   testHTTP,
				ApiKey:   "dev-api-key",
				ApiKeyID: 2,
				Username: "devuser",
			},
		},
	}

	if err := auth.SaveCredentials(homeDir, creds); err != nil {
		t.Fatalf("SaveCredentials failed: %v", err)
	}

	// Verify file permissions
	credPath := auth.CredentialsPath(homeDir)
	info, err := os.Stat(credPath)
	if err != nil {
		t.Fatalf("stat credentials file: %v", err)
	}
	// Check file mode (permissions) - Unix only
	// On Windows, permissions are enforced via ACLs, not Unix mode bits
	if runtime.GOOS != osutil.OSWindows {
		if info.Mode().Perm() != osutil.FilePermOwnerOnly {
			t.Errorf("expected permissions 0600, got %o", info.Mode().Perm())
		}
	}

	// Load and verify
	loaded, err := auth.LoadCredentials(homeDir)
	if err != nil {
		t.Fatalf("LoadCredentials failed: %v", err)
	}

	if len(loaded.Envs) != 2 {
		t.Errorf("expected 2 envs, got %d", len(loaded.Envs))
	}

	prod, err := loaded.Get("prod")
	if err != nil {
		t.Fatalf("Get prod failed: %v", err)
	}
	if prod.Host != "altinn.studio" {
		t.Errorf("expected host altinn.studio, got %s", prod.Host)
	}
	if prod.ApiKey != "test-api-key" {
		t.Errorf("expected API key test-api-key, got %s", prod.ApiKey)
	}
	if prod.ApiKeyID != 1 {
		t.Errorf("expected API key id 1, got %d", prod.ApiKeyID)
	}
	if prod.Username != "testuser" {
		t.Errorf("expected username testuser, got %s", prod.Username)
	}

	dev, err := loaded.Get("dev")
	if err != nil {
		t.Fatalf("Get dev failed: %v", err)
	}
	if dev.Scheme != testHTTP {
		t.Errorf("expected scheme http, got %s", dev.Scheme)
	}
}

func TestEnvironmentDefaults(t *testing.T) {
	t.Parallel()

	if got := auth.HostForEnv("local"); got != "studio.localhost" {
		t.Errorf("expected local host studio.localhost, got %s", got)
	}
	if got := auth.SchemeForEnv("local"); got != testHTTP {
		t.Errorf("expected local scheme http, got %s", got)
	}
	if got := auth.SchemeForEnv("prod"); got != testHTTPS {
		t.Errorf("expected prod scheme https, got %s", got)
	}
}

func TestEnvCredentialsSchemeOrDefault(t *testing.T) {
	t.Parallel()

	if got := (auth.EnvCredentials{}).SchemeOrDefault(); got != testHTTPS {
		t.Errorf("expected default scheme https, got %s", got)
	}
	if got := (auth.EnvCredentials{Scheme: testHTTP}).SchemeOrDefault(); got != testHTTP {
		t.Errorf("expected explicit scheme http, got %s", got)
	}
}

func TestCredentials_Get_NotLoggedIn(t *testing.T) {
	t.Parallel()
	creds := &auth.Credentials{Envs: make(map[string]auth.EnvCredentials)}

	_, err := creds.Get("prod")
	if !errors.Is(err, auth.ErrNotLoggedIn) {
		t.Errorf("expected ErrNotLoggedIn, got %v", err)
	}
}

func TestCredentials_Delete(t *testing.T) {
	t.Parallel()
	creds := &auth.Credentials{
		Envs: map[string]auth.EnvCredentials{
			"prod": {Host: "altinn.studio", ApiKey: "api-key", ApiKeyID: 1, Username: "user"},
			"dev":  {Host: "dev.altinn.studio", ApiKey: "api-key2", ApiKeyID: 2, Username: "user2"},
		},
	}

	creds.Delete("prod")

	if _, err := creds.Get("prod"); !errors.Is(err, auth.ErrNotLoggedIn) {
		t.Errorf("expected ErrNotLoggedIn after delete, got %v", err)
	}

	// Dev should still exist
	if _, err := creds.Get("dev"); err != nil {
		t.Errorf("dev should still exist: %v", err)
	}
}

func TestLoadCredentials_InvalidYAML(t *testing.T) {
	t.Parallel()
	homeDir := t.TempDir()
	credPath := auth.CredentialsPath(homeDir)

	// Write invalid YAML
	if err := os.WriteFile(credPath, []byte("invalid: [yaml"), osutil.FilePermOwnerOnly); err != nil {
		t.Fatalf("write file: %v", err)
	}

	_, err := auth.LoadCredentials(homeDir)
	if err == nil {
		t.Error("expected error for invalid YAML")
	}
}
