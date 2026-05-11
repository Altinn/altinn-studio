package auth

import (
	"strings"
	"testing"
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
