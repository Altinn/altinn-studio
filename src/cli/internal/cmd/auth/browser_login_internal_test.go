package auth

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/config"
)

const (
	testHTTPS      = "https"
	testHTTP       = "http"
	testStudioHost = "altinn.studio"
	testLocalHost  = "studio.localhost"
)

func TestBuildStudioctlLoginURL(t *testing.T) {
	t.Parallel()

	loginURL := buildStudioctlLoginURL(
		testHTTPS,
		testStudioHost,
		"http://127.0.0.1:12345/callback",
		"state-value",
		"challenge-value",
		"prod",
	)

	parsed, err := url.Parse(loginURL)
	if err != nil {
		t.Fatalf("parse login url: %v", err)
	}
	if parsed.Scheme != testHTTPS || parsed.Host != testStudioHost || parsed.Path != "/Login" {
		t.Fatalf("login URL = %s, want https://altinn.studio/Login", loginURL)
	}

	redirectTo := parsed.Query().Get("redirect_to")
	if redirectTo == "" {
		t.Fatal("redirect_to query value is empty")
	}

	authorizeURL, err := url.Parse(redirectTo)
	if err != nil {
		t.Fatalf("parse redirect_to: %v", err)
	}
	if authorizeURL.Path != "/designer/api/v1/studioctl/auth/authorize" {
		t.Fatalf("authorize path = %s", authorizeURL.Path)
	}
	if got := authorizeURL.Query().Get("redirect_uri"); got != "http://127.0.0.1:12345/callback" {
		t.Fatalf("redirect_uri = %q", got)
	}
	if got := authorizeURL.Query().Get("state"); got != "state-value" {
		t.Fatalf("state = %q", got)
	}
	if got := authorizeURL.Query().Get("code_challenge"); got != "challenge-value" {
		t.Fatalf("code_challenge = %q", got)
	}
	if got := authorizeURL.Query().Get("client_name"); got != "studioctl prod" {
		t.Fatalf("client_name = %q", got)
	}
}

func TestResolveLoginTargetLocal(t *testing.T) {
	t.Parallel()

	target, err := NewService(&config.Config{Home: t.TempDir()}).ResolveLoginTarget("local")
	if err != nil {
		t.Fatalf("ResolveLoginTarget() error = %v", err)
	}
	if target.Scheme != testHTTP || target.Host != testLocalHost {
		t.Fatalf("target = %+v, want http studio.localhost", target)
	}
}

func TestResolveLoginTargetUnknownEnvironment(t *testing.T) {
	t.Parallel()

	_, err := NewService(&config.Config{Home: t.TempDir()}).ResolveLoginTarget("unknown")
	if !errors.Is(err, ErrUnknownEnvironment) {
		t.Fatalf("ResolveLoginTarget() error = %v, want %v", err, ErrUnknownEnvironment)
	}
}

func TestCreateCodeChallenge(t *testing.T) {
	t.Parallel()

	verifier := "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
	want := "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"

	if got := createCodeChallenge(verifier); got != want {
		t.Fatalf("code challenge = %q, want %q", got, want)
	}
}

func TestLoginCallbackHandlerCancelled(t *testing.T) {
	t.Parallel()

	codeCh := make(chan string, 1)
	errCh := make(chan error, 1)
	handler := loginCallbackHandler("state-value", codeCh, errCh)
	request := httptest.NewRequestWithContext(
		t.Context(),
		http.MethodGet,
		"/callback?state=state-value&error=access_denied",
		nil,
	)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	if !strings.Contains(response.Body.String(), "Login cancelled") {
		t.Fatalf("response body = %q, want cancellation message", response.Body.String())
	}

	err := <-errCh
	if !errors.Is(err, ErrLoginCancelled) {
		t.Fatalf("error = %v, want %v", err, ErrLoginCancelled)
	}
	if len(codeCh) != 0 {
		t.Fatal("unexpected login code")
	}
}
