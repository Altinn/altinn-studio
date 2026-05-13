package auth

import (
	"strings"
	"testing"

	authstore "altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/config"
)

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
			name:    "repos path without git suffix",
			request: gitCredentialRequest{Protocol: testHTTPS, Host: testStudioHost, Path: "repos/org/repo"},
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
		{
			name:    "repos root path",
			request: gitCredentialRequest{Protocol: testHTTPS, Host: testStudioHost, Path: "repos"},
			want:    false,
		},
		{
			name:    "missing repo segment",
			request: gitCredentialRequest{Protocol: testHTTPS, Host: testStudioHost, Path: "repos/org"},
			want:    false,
		},
		{
			name:    "extra path segment",
			request: gitCredentialRequest{Protocol: testHTTPS, Host: testStudioHost, Path: "repos/org/repo.git/info"},
			want:    false,
		},
		{
			name:    "empty owner segment",
			request: gitCredentialRequest{Protocol: testHTTPS, Host: testStudioHost, Path: "repos//repo.git"},
			want:    false,
		},
		{
			name:    "empty repo segment",
			request: gitCredentialRequest{Protocol: testHTTPS, Host: testStudioHost, Path: "repos/org/"},
			want:    false,
		},
		{
			name:    "git suffix only",
			request: gitCredentialRequest{Protocol: testHTTPS, Host: testStudioHost, Path: "repos/org/.git"},
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

func TestGitCredentialUsesStoredUsername(t *testing.T) {
	t.Parallel()

	home := t.TempDir()
	if err := authstore.SaveCredentials(home, &authstore.Credentials{
		Envs: map[string]authstore.EnvCredentials{
			"prod": {
				Host:     testStudioHost,
				ApiKey:   "api-key",
				Username: "actual-user",
			},
		},
	}); err != nil {
		t.Fatalf("save credentials: %v", err)
	}

	result, err := NewService(&config.Config{Home: home}).GitCredential(
		strings.NewReader("protocol="+testHTTPS+"\nhost="+testStudioHost+"\npath=repos/org/repo.git\n\n"),
		"prod",
	)
	if err != nil {
		t.Fatalf("GitCredential() error = %v", err)
	}
	if !result.Found {
		t.Fatal("expected credentials to be found")
	}
	if result.Username != "actual-user" {
		t.Fatalf("GitCredential().Username = %q, want actual-user", result.Username)
	}
	if result.Password != "api-key" {
		t.Fatalf("GitCredential().Password = %q, want api-key", result.Password)
	}
}
