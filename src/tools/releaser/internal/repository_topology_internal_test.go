package internal

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

const (
	canonicalName = "Altinn/altinn-studio"
	canonicalURL  = "https://github.com/Altinn/altinn-studio"
)

func TestGitHubCLIRepositoryResolvesKnownCanonicalWithoutGH(t *testing.T) {
	t.Setenv("PATH", t.TempDir())

	repository, parent, err := NewGitHubCLI().Repository(
		t.Context(),
		"git@github.com:martinothamar-agent/altinn-studio.git",
	)
	if err != nil {
		t.Fatalf("Repository() error = %v", err)
	}
	if repository.NameWithOwner != "martinothamar-agent/altinn-studio" {
		t.Fatalf("repository = %q, want contributor fork", repository.NameWithOwner)
	}
	if parent == nil || parent.NameWithOwner != canonicalName {
		t.Fatalf("parent = %#v, want %s", parent, canonicalName)
	}
}

func TestGitHubCLIRepositoryAcceptsGitHubSSHOverHTTPSPort(t *testing.T) {
	repository, parent, err := NewGitHubCLI().Repository(
		t.Context(),
		"ssh://git@ssh.github.com:443/martinothamar-agent/altinn-studio.git",
	)
	if err != nil {
		t.Fatalf("Repository() error = %v", err)
	}
	if repository.NameWithOwner != "martinothamar-agent/altinn-studio" {
		t.Fatalf("repository = %q, want contributor fork", repository.NameWithOwner)
	}
	if parent == nil || parent.NameWithOwner != canonicalName {
		t.Fatalf("parent = %#v, want %s", parent, canonicalName)
	}
}

func TestGitHubCLIRepositoryRejectsUntrustedOrMalformedHostedRemote(t *testing.T) {
	tests := []struct {
		wantErr error
		name    string
		remote  string
	}{
		{
			name:    "different host",
			remote:  "https://attacker.example/Altinn/altinn-studio.git",
			wantErr: errRepositoryHostMismatch,
		},
		{
			name:    "ssh hostname over HTTPS",
			remote:  "https://ssh.github.com/Altinn/altinn-studio.git",
			wantErr: errRepositoryHostMismatch,
		},
		{
			name:    "extra path segment",
			remote:  "https://github.com/Altinn/altinn-studio/extra.git",
			wantErr: errRepositoryURLInvalid,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, _, err := NewGitHubCLI().Repository(t.Context(), test.remote)
			if !errors.Is(err, test.wantErr) {
				t.Fatalf("Repository() error = %v, want %v", err, test.wantErr)
			}
		})
	}
}

func TestGitHubCLIRepositoryKeepsLocalRemoteLocal(t *testing.T) {
	remote := filepath.Join(t.TempDir(), "origin.git")
	if err := os.MkdirAll(remote, 0o755); err != nil {
		t.Fatalf("mkdir local remote: %v", err)
	}

	repository, parent, err := NewGitHubCLI().Repository(t.Context(), remote)
	if err != nil {
		t.Fatalf("Repository() error = %v", err)
	}
	if repository.URL != remote || repository.NameWithOwner != "" {
		t.Fatalf("repository = %#v, want local remote", repository)
	}
	if parent != nil {
		t.Fatalf("parent = %#v, want nil", parent)
	}
}

func TestMatchRepositoryRemotePrefersCanonicalPushMatch(t *testing.T) {
	canonical := Repository{
		NameWithOwner: canonicalName,
		URL:           canonicalURL,
	}
	remotes := []GitRemote{
		{
			Name:     "a-triangular",
			FetchURL: canonicalURL,
			PushURL:  "https://github.com/contributor/altinn-studio.git",
			PushURLs: 1,
		},
		{
			Name:     "z-canonical",
			FetchURL: canonicalURL,
			PushURL:  canonicalURL,
			PushURLs: 1,
		},
	}

	remote, err := matchRepositoryRemote(remotes, canonical)
	if err != nil {
		t.Fatalf("matchRepositoryRemote() error = %v", err)
	}
	if remote.Name != "z-canonical" {
		t.Fatalf("remote = %q, want z-canonical", remote.Name)
	}
}
