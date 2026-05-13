package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	authstore "altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/config"
)

func TestExchangeCodeRevokesPreviousAPIKeyAfterSavingNewCredentials(t *testing.T) {
	home := t.TempDir()
	ctx := context.Background()

	err := authstore.SaveCredentials(home, &authstore.Credentials{
		Envs: map[string]authstore.EnvCredentials{
			"prod": {
				ApiKeyID:  1,
				Host:      "old.example.com",
				ApiKey:    "old-key",
				ExpiresAt: "",
				Username:  "old-user",
			},
		},
	})
	if err != nil {
		t.Fatalf("save credentials: %v", err)
	}

	oldTransport := http.DefaultTransport
	defer func() {
		http.DefaultTransport = oldTransport
	}()

	revokeCalled := false
	server := httptest.NewTLSServer(exchangeCodeOverwriteHandler(t, home, &revokeCalled))
	defer server.Close()
	http.DefaultTransport = server.Client().Transport

	host := strings.TrimPrefix(server.URL, "https://")
	service := NewService(&config.Config{Home: home, Version: config.NewVersion("test-version")})
	result, err := service.ExchangeCode(ctx, CodeExchangeRequest{
		Env:            "prod",
		Host:           host,
		Code:           "code",
		CodeVerifier:   "verifier",
		AllowOverwrite: true,
	})
	if err != nil {
		t.Fatalf("ExchangeCode failed: %v", err)
	}
	if result.Username != "new-user" {
		t.Errorf("expected new-user, got %s", result.Username)
	}
	if !revokeCalled {
		t.Error("expected previous API key to be revoked")
	}

	creds, err := authstore.LoadCredentials(home)
	if err != nil {
		t.Fatalf("load credentials: %v", err)
	}
	envCreds, err := creds.Get("prod")
	if err != nil {
		t.Fatalf("get prod credentials: %v", err)
	}
	if envCreds.ApiKey != "new-key" || envCreds.ApiKeyID != 2 {
		t.Errorf("expected new credentials to be saved, got key=%q id=%d", envCreds.ApiKey, envCreds.ApiKeyID)
	}
}

func exchangeCodeOverwriteHandler(t *testing.T, home string, revokeCalled *bool) http.Handler {
	t.Helper()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == studioctlTokenPath:
			writeExchangeCodeResponse(t, w)
		case r.Method == http.MethodDelete && r.URL.Path == studioctlRevokePath+"1":
			*revokeCalled = true
			assertOldAPIKeyRevokedAfterNewCredentialsSaved(t, home, r)
			w.WriteHeader(http.StatusNoContent)
		default:
			t.Errorf("unexpected request %s %s", r.Method, r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
		}
	})
}

func writeExchangeCodeResponse(t *testing.T, w http.ResponseWriter) {
	t.Helper()

	w.Header().Set("Content-Type", "application/json")
	encodeErr := json.NewEncoder(w).Encode(studioctlTokenResponse{
		Username:  "new-user",
		Key:       "new-key",
		ExpiresAt: "2026-01-01T00:00:00Z",
		KeyID:     2,
	})
	if encodeErr != nil {
		t.Errorf("encode response: %v", encodeErr)
	}
}

func assertOldAPIKeyRevokedAfterNewCredentialsSaved(t *testing.T, home string, r *http.Request) {
	t.Helper()

	if got := r.Header.Get("X-Api-Key"); got != "old-key" {
		t.Errorf("expected old API key for revoke, got %q", got)
	}
	creds, err := authstore.LoadCredentials(home)
	if err != nil {
		t.Errorf("load credentials during revoke: %v", err)
		return
	}
	envCreds, err := creds.Get("prod")
	if err != nil {
		t.Errorf("get prod credentials during revoke: %v", err)
		return
	}
	if envCreds.ApiKey != "new-key" || envCreds.ApiKeyID != 2 {
		t.Errorf(
			"expected new credentials to be saved before revoke, got key=%q id=%d",
			envCreds.ApiKey,
			envCreds.ApiKeyID,
		)
	}
}

func TestRevokeAllAPIKeysKeepsCredentialsWhenRevokeFails(t *testing.T) {
	ctx := context.Background()

	oldTransport := http.DefaultTransport
	defer func() {
		http.DefaultTransport = oldTransport
	}()

	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Header.Get("X-Api-Key") {
		case "ok-key":
			w.WriteHeader(http.StatusNoContent)
		case "fail-key":
			w.WriteHeader(http.StatusInternalServerError)
		default:
			t.Errorf("unexpected API key %q", r.Header.Get("X-Api-Key"))
			w.WriteHeader(http.StatusUnauthorized)
		}
	}))
	defer server.Close()
	http.DefaultTransport = server.Client().Transport

	host := strings.TrimPrefix(server.URL, "https://")
	creds := &authstore.Credentials{
		Envs: map[string]authstore.EnvCredentials{
			"ok": {
				ApiKeyID:  1,
				Host:      host,
				ApiKey:    "ok-key",
				ExpiresAt: "",
				Username:  "user",
			},
			"fail": {
				ApiKeyID:  2,
				Host:      host,
				ApiKey:    "fail-key",
				ExpiresAt: "",
				Username:  "user",
			},
		},
	}

	removed, err := revokeAllAPIKeys(ctx, creds)
	if err == nil {
		t.Fatal("expected revoke error")
	}
	if !removed {
		t.Fatal("expected at least one credential to be removed")
	}
	if _, err := creds.Get("ok"); err == nil {
		t.Error("expected successfully revoked credentials to be removed")
	}
	if _, err := creds.Get("fail"); err != nil {
		t.Error("expected failed credentials to be kept for retry")
	}
}

func TestRevokeAllAPIKeysRemovesCredentialsWhenRevokeIsUnauthorized(t *testing.T) {
	ctx := context.Background()

	oldTransport := http.DefaultTransport
	defer func() {
		http.DefaultTransport = oldTransport
	}()

	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer server.Close()
	http.DefaultTransport = server.Client().Transport

	host := strings.TrimPrefix(server.URL, "https://")
	creds := &authstore.Credentials{
		Envs: map[string]authstore.EnvCredentials{
			"prod": {
				ApiKeyID:  1,
				Host:      host,
				ApiKey:    "api-key",
				ExpiresAt: "",
				Username:  "user",
			},
		},
	}

	removed, err := revokeAllAPIKeys(ctx, creds)
	if err != nil {
		t.Fatalf("expected no revoke error, got %v", err)
	}
	if !removed {
		t.Fatal("expected credentials to be removed")
	}
	if _, err := creds.Get("prod"); err == nil {
		t.Error("expected unauthorized credentials to be removed")
	}
}
