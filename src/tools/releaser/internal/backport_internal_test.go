package internal

import (
	"os"
	"path/filepath"
	"slices"
	"testing"

	"altinn.studio/releaser/internal/changelog"
)

func TestParseBackportConfig_StrictReleaseLine(t *testing.T) {
	t.Parallel()

	comp, err := GetComponent("studioctl")
	if err != nil {
		t.Fatalf("GetComponent() error: %v", err)
	}

	tests := []struct {
		name      string
		line      string
		shouldErr bool
	}{
		{name: "valid release line", line: "v1.2"},
		{name: "missing v prefix", line: "1.2", shouldErr: true},
		{name: "patch version not allowed", line: "v1.2.3", shouldErr: true},
		{name: "non numeric suffix", line: "v1.2foo", shouldErr: true},
		{name: "major non numeric", line: "va.2", shouldErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			_, err := parseBackportConfig(BackportRequest{
				Component: "studioctl",
				Commit:    "0123456789abcdef",
				Line:      tt.line,
			}, comp)
			if tt.shouldErr && err == nil {
				t.Fatalf("parseBackportConfig() expected error for %q", tt.line)
			}
			if !tt.shouldErr && err != nil {
				t.Fatalf("parseBackportConfig() error for %q: %v", tt.line, err)
			}
		})
	}
}

func TestParseBackportConfig_Line(t *testing.T) {
	t.Parallel()

	comp, err := GetComponent("studioctl")
	if err != nil {
		t.Fatalf("GetComponent() error: %v", err)
	}

	cfg, err := parseBackportConfig(BackportRequest{
		Component: "studioctl",
		Commit:    "0123456789abcdef",
		Line:      "v1.2",
	}, comp)
	if err != nil {
		t.Fatalf("parseBackportConfig() error: %v", err)
	}
	if cfg.releaseBranch != "release/studioctl/v1.2" {
		t.Fatalf("releaseBranch = %q, want release/studioctl/v1.2", cfg.releaseBranch)
	}
}

const backportChangelogPath = "CHANGELOG.md"

// newChangelogRepo returns a Git repository and a function that commits a
// changelog to it and returns the commit.
func newChangelogRepo(t *testing.T) (*GitCLI, func(content, message string) string) {
	t.Helper()
	repo := t.TempDir()
	git := NewGitCLI(WithWorkdir(repo), WithLogger(NopLogger{}))
	if err := git.RunWrite(t.Context(), "init", "-q"); err != nil {
		t.Fatalf("git init: %v", err)
	}
	commit := func(content, message string) string {
		t.Helper()
		if err := os.WriteFile(filepath.Join(repo, backportChangelogPath), []byte(content), 0o600); err != nil {
			t.Fatalf("write changelog: %v", err)
		}
		for _, args := range [][]string{
			{"add", backportChangelogPath},
			{"-c", "user.name=test", "-c", "user.email=test@example.com", "commit", "-q", "-m", message},
		} {
			if err := git.RunWrite(t.Context(), args...); err != nil {
				t.Fatalf("git %v: %v", args, err)
			}
		}
		sha, err := git.HeadCommit(t.Context())
		if err != nil {
			t.Fatalf("head commit: %v", err)
		}
		return sha
	}
	return git, commit
}

// An entry added far below its section heading is found even though the
// heading is outside the commit diff's context lines.
func TestExtractEntriesFromCommit_EntryBelowHeadingContext(t *testing.T) {
	git, commit := newChangelogRepo(t)
	const base = "# Changelog\n\n## [Unreleased]\n\n### Added\n\n- One\n- Two\n- Three\n- Four\n- Five\n"
	commit(base, "base")
	sha := commit(base+"- Six\n  - with a part\n", "add entry")

	entries, msg, err := extractEntriesFromCommit(t.Context(), git, sha, backportChangelogPath)
	if err != nil {
		t.Fatalf("extractEntriesFromCommit() error = %v", err)
	}
	want := []changelog.Entry{{Category: "Added", Text: "Six\n  - with a part"}}
	if msg != "add entry" || !slices.Equal(entries, want) {
		t.Fatalf("extractEntriesFromCommit() = %q, %q, want %q, %q", entries, msg, want, "add entry")
	}
}

// An entry with the same category and text as a released entry is still found.
func TestExtractEntriesFromCommit_RepeatsReleasedEntry(t *testing.T) {
	git, commit := newChangelogRepo(t)
	const released = "## [1.0.0] - 2026-01-01\n\n### Changed\n\n- Update localtest image.\n"
	commit("# Changelog\n\n## [Unreleased]\n\n"+released, "base")
	sha := commit(
		"# Changelog\n\n## [Unreleased]\n\n### Changed\n\n- Update localtest image.\n\n"+released,
		"add entry",
	)

	entries, _, err := extractEntriesFromCommit(t.Context(), git, sha, backportChangelogPath)
	if err != nil {
		t.Fatalf("extractEntriesFromCommit() error = %v", err)
	}
	want := []changelog.Entry{{Category: "Changed", Text: "Update localtest image."}}
	if !slices.Equal(entries, want) {
		t.Fatalf("extractEntriesFromCommit() = %q, want %q", entries, want)
	}
}
