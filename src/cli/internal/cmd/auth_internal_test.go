package cmd

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	authstore "altinn.studio/studioctl/internal/auth"
	authsvc "altinn.studio/studioctl/internal/cmd/auth"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

const (
	authTestBotToken = "bot-token"
	authTestBotUser  = "bot-user"
)

func TestParseLoginFlagsWithTokenRejectsNoBrowser(t *testing.T) {
	cmd := &AuthCommand{}

	_, _, err := cmd.parseLoginFlags([]string{"--with-token", "--no-browser"})
	if err == nil {
		t.Fatal("parseLoginFlags() error = nil, want error")
	}
	if !strings.Contains(err.Error(), "--no-browser cannot be used with --with-token") {
		t.Fatalf("parseLoginFlags() error = %v, want incompatible flags error", err)
	}
}

func TestAuthLoginWithTokenReadsFromInput(t *testing.T) {
	home := t.TempDir()

	oldTransport := http.DefaultTransport
	defer func() {
		http.DefaultTransport = oldTransport
	}()

	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/repos/api/v1/user" {
			t.Errorf("unexpected request %s %s", r.Method, r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if got := r.Header.Get("X-Api-Key"); got != authTestBotToken {
			t.Errorf("expected bot token for validation, got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		encodeErr := json.NewEncoder(w).Encode(map[string]string{"login": authTestBotUser})
		if encodeErr != nil {
			t.Errorf("encode response: %v", encodeErr)
		}
	}))
	defer server.Close()
	http.DefaultTransport = server.Client().Transport

	host := strings.TrimPrefix(server.URL, "https://")
	cfg := &config.Config{Home: home, Version: config.NewVersion("test-version")}
	cmd := NewAuthCommand(cfg, ui.NewOutput(io.Discard, io.Discard, false))

	result, err := cmd.loginWithToken(
		context.Background(),
		loginFlags{env: "prod", withToken: true},
		authsvc.LoginTarget{Scheme: "https", Host: host},
		strings.NewReader(authTestBotToken+"\n"),
	)
	if err != nil {
		t.Fatalf("loginWithToken() error = %v", err)
	}
	if result.Username != authTestBotUser {
		t.Fatalf("username = %q, want %s", result.Username, authTestBotUser)
	}

	creds, err := authstore.LoadCredentials(home)
	if err != nil {
		t.Fatalf("load credentials: %v", err)
	}
	envCreds, err := creds.Get("prod")
	if err != nil {
		t.Fatalf("get prod credentials: %v", err)
	}
	if envCreds.ApiKey != authTestBotToken || envCreds.Username != authTestBotUser {
		t.Fatalf("credentials = %+v, want bot token for bot-user", envCreds)
	}
}
