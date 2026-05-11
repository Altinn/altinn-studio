package cmd

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
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

	command := NewAuthCommand(testConfig(t), nil)
	target, err := command.resolveLoginTarget(loginFlags{env: "local"})
	if err != nil {
		t.Fatalf("resolveLoginTarget() error = %v", err)
	}
	if target.scheme != testHTTP || target.host != testLocalHost {
		t.Fatalf("target = %+v, want http studio.localhost", target)
	}
}

func TestResolveLoginTargetUnknownEnvironment(t *testing.T) {
	t.Parallel()

	command := NewAuthCommand(testConfig(t), nil)
	_, err := command.resolveLoginTarget(loginFlags{env: "unknown"})
	if !errors.Is(err, ErrUnknownEnvironment) {
		t.Fatalf("resolveLoginTarget() error = %v, want %v", err, ErrUnknownEnvironment)
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
	if !errors.Is(err, errLoginCancelled) {
		t.Fatalf("error = %v, want %v", err, errLoginCancelled)
	}
	if len(codeCh) != 0 {
		t.Fatal("unexpected login code")
	}
}

func TestReadGitCredentialRequest(t *testing.T) {
	t.Parallel()

	request, err := readGitCredentialRequest(strings.NewReader(
		"protocol=" + testHTTPS + "\nhost=" + testStudioHost + "\npath=repos/org/repo.git\n\n",
	))
	if err != nil {
		t.Fatalf("read git credential request: %v", err)
	}
	if request.Protocol != testHTTPS || request.Host != testStudioHost || request.Path != "repos/org/repo.git" {
		t.Fatalf("request = %+v", request)
	}
}

func TestMatchesGitCredentialRequest(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		request gitCredentialRequest
		want    bool
	}{
		{
			name:    "repos clone path",
			request: gitCredentialRequest{Protocol: testHTTPS, Host: testStudioHost, Path: "repos/org/repo.git"},
			want:    true,
		},
		{
			name:    "leading slash repos clone path",
			request: gitCredentialRequest{Protocol: testHTTPS, Host: testStudioHost, Path: "/repos/org/repo.git"},
			want:    true,
		},
		{
			name:    "wrong host",
			request: gitCredentialRequest{Protocol: testHTTPS, Host: "example.com", Path: "repos/org/repo.git"},
			want:    false,
		},
		{
			name:    "wrong protocol",
			request: gitCredentialRequest{Protocol: "http", Host: testStudioHost, Path: "repos/org/repo.git"},
			want:    false,
		},
		{
			name:    "non repos path",
			request: gitCredentialRequest{Protocol: testHTTPS, Host: testStudioHost, Path: "org/repo.git"},
			want:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := matchesGitCredentialRequest(tt.request, testHTTPS, testStudioHost); got != tt.want {
				t.Fatalf("matchesGitCredentialRequest() = %t, want %t", got, tt.want)
			}
		})
	}
}

func TestMatchesGitCredentialRequestHTTP(t *testing.T) {
	t.Parallel()

	request := gitCredentialRequest{Protocol: testHTTP, Host: testLocalHost, Path: "repos/org/repo.git"}
	if !matchesGitCredentialRequest(request, testHTTP, testLocalHost) {
		t.Fatal("expected local http credential request to match")
	}
}
