package cmd

import (
	"net/url"
	"testing"
)

func TestBuildStudioctlLoginURL(t *testing.T) {
	t.Parallel()

	loginURL := buildStudioctlLoginURL(
		"altinn.studio",
		"http://127.0.0.1:12345/callback",
		"state-value",
		"challenge-value",
		"prod",
	)

	parsed, err := url.Parse(loginURL)
	if err != nil {
		t.Fatalf("parse login url: %v", err)
	}
	if parsed.Scheme != "https" || parsed.Host != "altinn.studio" || parsed.Path != "/Login" {
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

func TestCreateCodeChallenge(t *testing.T) {
	t.Parallel()

	verifier := "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
	want := "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"

	if got := createCodeChallenge(verifier); got != want {
		t.Fatalf("code challenge = %q, want %q", got, want)
	}
}
