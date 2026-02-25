//nolint:testpackage // Tests need access to unexported functions (pathExists, sanitizeGitOutput)
package studio

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

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
			t.Errorf("encode response: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
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
	expected := "https://user%40example.com:token%2Fwith+special=chars@altinn.studio/repos/org/repo.git"
	if url != expected {
		t.Errorf("expected %s, got %s", expected, url)
	}
}
