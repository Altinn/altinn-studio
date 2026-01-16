package auth_test

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/perm"
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
		if info.Mode().Perm() != perm.FilePermOwnerOnly {
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

func TestCredentials_SetAndGet(t *testing.T) {
	t.Parallel()
	creds := &auth.Credentials{}

	creds.Set("prod", auth.EnvCredentials{
		Host:     "altinn.studio",
		Token:    "token1",
		Username: "user1",
	})

	got, err := creds.Get("prod")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if got.Token != "token1" {
		t.Errorf("expected token1, got %s", got.Token)
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

func TestCredentials_DeleteAll(t *testing.T) {
	t.Parallel()
	creds := &auth.Credentials{
		Envs: map[string]auth.EnvCredentials{
			"prod": {Host: "altinn.studio", Token: "token", Username: "user"},
			"dev":  {Host: "dev.altinn.studio", Token: "token2", Username: "user2"},
		},
	}

	creds.DeleteAll()

	if creds.HasCredentials() {
		t.Error("expected no credentials after DeleteAll")
	}
}

func TestCredentials_HasCredentials(t *testing.T) {
	t.Parallel()
	tests := []struct {
		creds  *auth.Credentials
		name   string
		expect bool
	}{
		{
			name:   "nil envs",
			creds:  &auth.Credentials{Envs: nil},
			expect: false,
		},
		{
			name:   "empty envs",
			creds:  &auth.Credentials{Envs: make(map[string]auth.EnvCredentials)},
			expect: false,
		},
		{
			name: "has credentials",
			creds: &auth.Credentials{Envs: map[string]auth.EnvCredentials{
				"prod": {Host: "altinn.studio", Token: "token", Username: "user"},
			}},
			expect: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := tc.creds.HasCredentials()
			if got != tc.expect {
				t.Errorf("expected %v, got %v", tc.expect, got)
			}
		})
	}
}

func TestCredentials_EnvNames(t *testing.T) {
	t.Parallel()
	creds := &auth.Credentials{
		Envs: map[string]auth.EnvCredentials{
			"prod": {Host: "altinn.studio", Token: "t1", Username: "u1"},
			"dev":  {Host: "dev.altinn.studio", Token: "t2", Username: "u2"},
		},
	}

	names := creds.EnvNames()
	if len(names) != 2 {
		t.Errorf("expected 2 names, got %d", len(names))
	}

	// Check both names exist (order not guaranteed)
	nameMap := make(map[string]bool)
	for _, n := range names {
		nameMap[n] = true
	}
	if !nameMap["prod"] || !nameMap["dev"] {
		t.Errorf("expected prod and dev, got %v", names)
	}
}

func TestHostForEnv(t *testing.T) {
	t.Parallel()
	tests := []struct {
		env      string
		expected string
	}{
		{"prod", "altinn.studio"},
		{"dev", "dev.altinn.studio"},
		{"staging", "staging.altinn.studio"},
		{"unknown", ""},
	}

	for _, tc := range tests {
		t.Run(tc.env, func(t *testing.T) {
			t.Parallel()
			got := auth.HostForEnv(tc.env)
			if got != tc.expected {
				t.Errorf("HostForEnv(%q) = %q, want %q", tc.env, got, tc.expected)
			}
		})
	}
}

func TestCredentialsPath(t *testing.T) {
	t.Parallel()
	path := auth.CredentialsPath("/home/user/.altinn-studio")
	expected := filepath.Join("/home/user/.altinn-studio", "credentials.yaml")
	if path != expected {
		t.Errorf("expected %s, got %s", expected, path)
	}
}

func TestLoadCredentials_InvalidYAML(t *testing.T) {
	t.Parallel()
	homeDir := t.TempDir()
	credPath := auth.CredentialsPath(homeDir)

	// Write invalid YAML
	if err := os.WriteFile(credPath, []byte("invalid: [yaml"), perm.FilePermOwnerOnly); err != nil {
		t.Fatalf("write file: %v", err)
	}

	_, err := auth.LoadCredentials(homeDir)
	if err == nil {
		t.Error("expected error for invalid YAML")
	}
}
