//nolint:testpackage // Tests need access to unexported functions (pathExists, sanitizeGitOutput)
package studio

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/config"
)

func TestClient_GetUser_Success(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if authHeader := r.Header.Get("Authorization"); authHeader != "" {
			t.Errorf("expected no Authorization header, got %q", authHeader)
		}
		if apiKey := r.Header.Get("X-Api-Key"); apiKey != "test-api-key" {
			t.Errorf("expected X-Api-Key header, got %q", apiKey)
		}
		if userAgent := r.Header.Get("User-Agent"); userAgent != "studioctl/test-version" {
			t.Errorf("expected User-Agent 'studioctl/test-version', got %q", userAgent)
		}

		if r.URL.Path != "/repos/api/v1/user" {
			t.Errorf("expected path /repos/api/v1/user, got %s", r.URL.Path)
		}

		user := User{
			ID:       1,
			Login:    "testuser",
			FullName: "Test User",
			Email:    "test@example.com",
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(user); err != nil {
			t.Errorf("encode response: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
	}))
	defer server.Close()

	// Extract host from test server URL
	host := server.URL[7:] // Remove "http://"

	client := &Client{
		host:       host,
		apiKey:     "test-api-key",
		version:    config.NewVersion("test-version"),
		scheme:     "http",
		httpClient: server.Client(),
	}
	user, err := client.GetUser(context.Background())
	if err != nil {
		t.Fatalf("GetUser failed: %v", err)
	}

	if user.Login != "testuser" {
		t.Errorf("expected login testuser, got %s", user.Login)
	}
}

func TestClient_GetUser_Unauthorized(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	host := server.URL[7:]
	client := &Client{
		host:       host,
		apiKey:     "bad-api-key",
		version:    config.NewVersion("test-version"),
		scheme:     "http",
		httpClient: server.Client(),
	}

	_, err := client.GetUser(context.Background())
	if !errors.Is(err, ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized, got %v", err)
	}
}

func TestClient_GetRepo_Success(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify path
		expectedPath := "/repos/api/v1/repos/testorg/testrepo"
		if r.URL.Path != expectedPath {
			t.Errorf("expected path %s, got %s", expectedPath, r.URL.Path)
		}

		repo := Repository{
			ID:          1,
			Name:        "testrepo",
			FullName:    "testorg/testrepo",
			Description: "Test repo",
			CloneURL:    "https://altinn.studio/repos/testorg/testrepo.git",
			SSHURL:      "git@altinn.studio:testorg/testrepo.git",
			HTMLURL:     "https://altinn.studio/testorg/testrepo",
			Owner:       &User{ID: 1, Login: "testorg", FullName: "Test Org", Email: "test@org.com"},
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(repo); err != nil {
			t.Errorf("encode response: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
	}))
	defer server.Close()

	host := server.URL[7:]
	client := &Client{
		host:       host,
		apiKey:     "test-api-key",
		version:    config.NewVersion("test-version"),
		scheme:     "http",
		httpClient: server.Client(),
	}

	repo, err := client.GetRepo(context.Background(), "testorg", "testrepo")
	if err != nil {
		t.Fatalf("GetRepo failed: %v", err)
	}

	if repo.Name != "testrepo" {
		t.Errorf("expected name testrepo, got %s", repo.Name)
	}
	if repo.FullName != "testorg/testrepo" {
		t.Errorf("expected fullname testorg/testrepo, got %s", repo.FullName)
	}
}

func TestClient_GetRepo_NotFound(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	host := server.URL[7:]
	client := &Client{
		host:       host,
		apiKey:     "test-api-key",
		version:    config.NewVersion("test-version"),
		scheme:     "http",
		httpClient: server.Client(),
	}

	_, err := client.GetRepo(context.Background(), "testorg", "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent repo")
	}
	// Check it wraps ErrRepoNotFound using errors.Is
	if !errors.Is(err, ErrRepoNotFound) {
		t.Errorf("expected ErrRepoNotFound, got %v", err)
	}
}

func TestClient_buildCloneURL_DoesNotEmbedCredentials(t *testing.T) {
	t.Parallel()
	client := &Client{
		host:   "altinn.studio",
		apiKey: "secret-api-key",
		scheme: "https",
	}

	url := client.buildCloneURL("org", "repo")
	expected := "https://altinn.studio/repos/org/repo.git"
	if url != expected {
		t.Errorf("expected %s, got %s", expected, url)
	}
}

func TestClient_buildCloneURL_UsesCredentialScheme(t *testing.T) {
	t.Parallel()
	client := NewClientForEnv("local", "", &auth.EnvCredentials{
		Host:   "studio.localhost",
		Scheme: "http",
		ApiKey: "secret-api-key",
	}, config.NewVersion("test-version"))

	url := client.buildCloneURL("org", "repo")
	expected := "http://studio.localhost/repos/org/repo.git"
	if url != expected {
		t.Errorf("expected %s, got %s", expected, url)
	}
}

func TestClient_buildCloneURL_EscapesPathSegments(t *testing.T) {
	t.Parallel()
	client := &Client{
		host:   "altinn.studio",
		scheme: "https",
	}

	url := client.buildCloneURL("org/name", "repo name")
	expected := "https://altinn.studio/repos/org%2Fname/repo%20name.git"
	if url != expected {
		t.Errorf("expected %s, got %s", expected, url)
	}
}

func TestClient_gitCredentialConfigKeys_ScopeToReposProxy(t *testing.T) {
	t.Parallel()
	client := &Client{
		host:   "altinn.studio",
		scheme: "https",
	}

	helperKey := client.gitCredentialHelperConfigKey()
	expectedHelperKey := "credential.https://altinn.studio/repos.helper"
	if helperKey != expectedHelperKey {
		t.Errorf("expected %s, got %s", expectedHelperKey, helperKey)
	}

	useHTTPPathKey := client.gitCredentialUseHTTPPathConfigKey()
	expectedUseHTTPPathKey := "credential.https://altinn.studio/repos.useHttpPath"
	if useHTTPPathKey != expectedUseHTTPPathKey {
		t.Errorf("expected %s, got %s", expectedUseHTTPPathKey, useHTTPPathKey)
	}
}

func TestClient_gitCredentialHelperCommand_DoesNotEmbedAPIKey(t *testing.T) {
	t.Parallel()
	client := &Client{
		env:             "dev",
		credentialsHome: "/tmp/studioctl home",
		host:            "altinn.studio",
		apiKey:          "secret-api-key",
		scheme:          "https",
	}

	command := client.gitCredentialHelperCommand()
	if strings.Contains(command, client.apiKey) {
		t.Fatalf("credential helper command must not include API key: %s", command)
	}
	if !strings.Contains(command, " --home '/tmp/studioctl home' auth git-credential --env 'dev'") {
		t.Fatalf("credential helper command = %q, want studioctl auth git-credential invocation", command)
	}
}

func TestClient_gitCredentialConfigArgs_ResetHelpersBeforeStudioctlHelper(t *testing.T) {
	t.Parallel()
	client := &Client{
		env:    "dev",
		host:   "altinn.studio",
		scheme: "https",
	}

	args := client.gitCredentialConfigArgs()
	helperKey := client.gitCredentialHelperConfigKey()
	expected := []string{
		"-c",
		helperKey + "=",
		"-c",
		helperKey + "=" + client.gitCredentialHelperCommand(),
		"-c",
		client.gitCredentialUseHTTPPathConfigKey() + "=true",
	}
	if strings.Join(args, "\n") != strings.Join(expected, "\n") {
		t.Fatalf("git credential config args = %#v, want %#v", args, expected)
	}
}
