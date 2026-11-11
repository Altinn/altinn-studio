package cmd

import (
	"context"
	"encoding/json"
	"errors"
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

func TestAuthTokenPrintsStoredAPIKeyOnly(t *testing.T) {
	home := t.TempDir()
	creds := &authstore.Credentials{}
	creds.Set(
		"dev",
		authstore.EnvCredentials{Host: "dev.altinn.studio", ApiKey: authTestBotToken, Username: authTestBotUser},
	)
	if err := authstore.SaveCredentials(home, creds); err != nil {
		t.Fatalf("save credentials: %v", err)
	}
	var stdout, stderr strings.Builder
	cmd := NewAuthCommand(&config.Config{Home: home}, ui.NewOutput(&stdout, &stderr, true))

	if err := cmd.Run(context.Background(), []string{"token", "--env", "dev"}); err != nil {
		t.Fatalf("auth token error = %v", err)
	}
	if stdout.String() != authTestBotToken+"\n" {
		t.Fatalf("stdout = %q, want the API key and a newline", stdout.String())
	}
	if stderr.Len() != 0 {
		t.Fatalf("stderr = %q, want nothing", stderr.String())
	}
}

func TestAuthTokenNotLoggedInNamesEnvAndLoginCommand(t *testing.T) {
	var stdout strings.Builder
	cmd := NewAuthCommand(&config.Config{Home: t.TempDir()}, ui.NewOutput(&stdout, io.Discard, false))

	err := cmd.Run(context.Background(), []string{"token", "--env", "staging"})
	if !errors.Is(err, ErrNotLoggedIn) {
		t.Fatalf("auth token error = %v, want ErrNotLoggedIn", err)
	}
	if !strings.Contains(err.Error(), "staging") || !strings.Contains(err.Error(), "auth login --env staging") {
		t.Fatalf("auth token error = %q, want the env and the login command", err)
	}
	if stdout.Len() != 0 {
		t.Fatalf("stdout = %q, want nothing", stdout.String())
	}
}

func TestAuthTokenRejectsArguments(t *testing.T) {
	cmd := NewAuthCommand(&config.Config{Home: t.TempDir()}, ui.NewOutput(io.Discard, io.Discard, false))

	err := cmd.Run(context.Background(), []string{"token", "prod"})
	if !errors.Is(err, ErrInvalidFlagValue) {
		t.Fatalf("auth token error = %v, want ErrInvalidFlagValue", err)
	}
}

func TestAuthSkipsUpdateCheckForMachineReadableSubcommands(t *testing.T) {
	cmd := &AuthCommand{}

	for _, args := range [][]string{{"token"}, {"token", "--env", "dev"}, {"git-credential", "get"}} {
		if !cmd.SkipsUpdateCheck(args) {
			t.Errorf("SkipsUpdateCheck(%q) = false, want true", args)
		}
	}
	for _, args := range [][]string{nil, {"status"}, {"login"}} {
		if cmd.SkipsUpdateCheck(args) {
			t.Errorf("SkipsUpdateCheck(%q) = true, want false", args)
		}
	}
}
