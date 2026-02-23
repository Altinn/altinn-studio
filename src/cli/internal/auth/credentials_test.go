package auth_test

import (
	"errors"
	"os"
	"runtime"
	"testing"

	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/osutil"
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
				Token:    "test-token",
				Username: "testuser",
			},
			"dev": {
				Host:     "dev.altinn.studio",
				Token:    "dev-token",
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
	if runtime.GOOS != "windows" {
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
	if prod.Token != "test-token" {
		t.Errorf("expected token test-token, got %s", prod.Token)
	}
	if prod.Username != "testuser" {
		t.Errorf("expected username testuser, got %s", prod.Username)
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
			"prod": {Host: "altinn.studio", Token: "token", Username: "user"},
			"dev":  {Host: "dev.altinn.studio", Token: "token2", Username: "user2"},
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
