package migrations_test

import (
	"errors"
	"os"
	"testing"

	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/migrations"
	"altinn.studio/studioctl/internal/osutil"
)

func TestRunRemovesStudioCredentials(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	markOtherMigrationsApplied(t, cfg, "006-remove-studio-credentials")
	path := auth.CredentialsPath(cfg.Home)
	if err := os.WriteFile(path, []byte("envs:\n  prod:\n    token: legacy\n"), osutil.FilePermOwnerOnly); err != nil {
		t.Fatalf("write credentials: %v", err)
	}

	if err := migrations.Run(t.Context(), cfg); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	if _, err := os.Stat(path); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("credentials stat error = %v, want not exist", err)
	}
	if err := migrations.Run(t.Context(), cfg); err != nil {
		t.Fatalf("second Run() error = %v", err)
	}
}

func TestRunKeepsCurrentStudioCredentials(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	markOtherMigrationsApplied(t, cfg, "006-remove-studio-credentials")
	path := auth.CredentialsPath(cfg.Home)
	contents := []byte(`
envs:
  prod:
    host: altinn.studio
    apiKey: current-key
    apiKeyId: 123
    username: testuser
    expiresAt: "2026-01-01T00:00:00Z"
  dev:
    token: legacy
`)
	if err := os.WriteFile(path, contents, osutil.FilePermOwnerOnly); err != nil {
		t.Fatalf("write credentials: %v", err)
	}

	if err := migrations.Run(t.Context(), cfg); err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	creds, err := auth.LoadCredentials(cfg.Home)
	if err != nil {
		t.Fatalf("load credentials: %v", err)
	}
	prod, err := creds.Get("prod")
	if err != nil {
		t.Fatalf("get prod credentials: %v", err)
	}
	if prod.Host != "altinn.studio" ||
		prod.ApiKey != "current-key" ||
		prod.ApiKeyID != 123 ||
		prod.Username != "testuser" {
		t.Fatalf("prod credentials = %+v", prod)
	}
	if _, err := creds.Get("dev"); !errors.Is(err, auth.ErrNotLoggedIn) {
		t.Fatalf("dev credentials error = %v, want not logged in", err)
	}
}
