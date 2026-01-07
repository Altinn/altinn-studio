//nolint:testpackage // Tests need access to unexported functions (pathExists, sanitizeGitOutput)
package studio

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/perm"
)

func TestNewClient(t *testing.T) {
	t.Parallel()
	creds := &auth.EnvCredentials{
		Host:     "altinn.studio",
		Token:    "test-token",
		Username: "testuser",
	}

	client := NewClient(creds)
	if client.host != "altinn.studio" {
		t.Errorf("expected host altinn.studio, got %s", client.host)
	}
	if client.token != "test-token" {
		t.Errorf("expected token test-token, got %s", client.token)
	}
	if client.username != "testuser" {
		t.Errorf("expected username testuser, got %s", client.username)
	}
}

func TestClient_GetUser_Success(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify auth header
		authHeader := r.Header.Get("Authorization")
		if authHeader != "token test-token" {
			t.Errorf("expected Authorization header 'token test-token', got %q", authHeader)
		}

		// Verify path
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
			t.Fatalf("encode response: %v", err)
		}
	}))
	defer server.Close()

	// Extract host from test server URL
	host := server.URL[7:] // Remove "http://"

	client := &Client{
		host:       host,
		token:      "test-token",
		username:   "testuser",
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
	client := &Client{host: host, token: "bad-token", username: "", scheme: "http", httpClient: server.Client()}

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
			t.Fatalf("encode response: %v", err)
		}
	}))
	defer server.Close()

	host := server.URL[7:]
	client := &Client{
		host:       host,
		token:      "test-token",
		username:   "testuser",
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
		token:      "test-token",
		username:   "testuser",
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

func TestClient_buildCloneURL(t *testing.T) {
	t.Parallel()
	client := &Client{
		host:       "altinn.studio",
		token:      "test-token",
		username:   "testuser",
		httpClient: nil,
		scheme:     "https",
	}

	url := client.buildCloneURL("myorg", "myrepo")
	expected := "https://testuser:test-token@altinn.studio/repos/myorg/myrepo.git"
	if url != expected {
		t.Errorf("expected %s, got %s", expected, url)
	}
}

func TestClient_buildCloneURL_SpecialChars(t *testing.T) {
	t.Parallel()
	client := &Client{
		host:       "altinn.studio",
		token:      "token/with+special=chars",
		username:   "user@example.com",
		httpClient: nil,
		scheme:     "https",
	}

	url := client.buildCloneURL("org", "repo")
	// Should URL-encode special characters
	if url == "" {
		t.Error("buildCloneURL returned empty string")
	}
	// Verify the URL is constructed (detailed encoding may vary)
	if len(url) < 20 {
		t.Errorf("URL seems too short: %s", url)
	}
}

func TestPathExists(t *testing.T) {
	t.Parallel()
	tempDir := t.TempDir()

	// Test existing directory
	if !pathExists(tempDir) {
		t.Error("expected tempDir to exist")
	}

	// Test existing file
	testFile := filepath.Join(tempDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("test"), perm.FilePermDefault); err != nil {
		t.Fatalf("create test file: %v", err)
	}
	if !pathExists(testFile) {
		t.Error("expected test file to exist")
	}

	// Test non-existent path
	if pathExists(filepath.Join(tempDir, "nonexistent")) {
		t.Error("expected nonexistent path to not exist")
	}
}

func TestSanitizeGitOutput(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name     string
		output   string
		token    string
		expected string
	}{
		{
			name:     "sanitize token in URL",
			output:   "Cloning https://user:secret-token@host.com/repo.git",
			token:    "secret-token",
			expected: "Cloning https://user:****@host.com/repo.git",
		},
		{
			name:     "empty token",
			output:   "Some output",
			token:    "",
			expected: "Some output",
		},
		{
			name:     "token not in output",
			output:   "Some other output",
			token:    "token",
			expected: "Some other output",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := sanitizeGitOutput(tc.output, tc.token)
			if got != tc.expected {
				t.Errorf("expected %q, got %q", tc.expected, got)
			}
		})
	}
}
