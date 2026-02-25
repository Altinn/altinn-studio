package internal_test

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/releaser/internal"
	"altinn.studio/releaser/internal/changelog"
)

const syntheticReleaseBypassChangelog = `# Changelog

## [Unreleased]

## [1.0.0] - 2025-01-01

### Added
- Initial release
`

func TestChangelogWasModified(t *testing.T) {
	t.Run("modified", func(t *testing.T) {
		if !internal.ChangelogWasModified("src/cli/CHANGELOG.md\nREADME.md", "src/cli/CHANGELOG.md") {
			t.Fatal("ChangelogWasModified() = false, want true")
		}
	})
	t.Run("not modified", func(t *testing.T) {
		if internal.ChangelogWasModified("README.md\nmain.go", "src/cli/CHANGELOG.md") {
			t.Fatal("ChangelogWasModified() = true, want false")
		}
	})
}

func TestRunValidation(t *testing.T) {
	t.Run("valid changelog update", func(t *testing.T) {
		repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

## [1.0.0] - 2025-01-01

### Added
- Initial
`)
		base := revParseHead(t, repo)

		writeFile(t, filepath.Join(repo, "src", "cli", "CHANGELOG.md"), `# Changelog

## [Unreleased]

### Fixed
- Validation entry

## [1.0.0] - 2025-01-01

### Added
- Initial
`)
		runGitCmd(t, repo, "add", ".")
		runGitCmd(t, repo, "commit", "-m", "update changelog")
		head := revParseHead(t, repo)

		t.Chdir(repo)
		err := internal.RunValidation(t.Context(), internal.ValidationRequest{
			Component: "studioctl",
			Base:      base,
			Head:      head,
		}, internal.NopLogger{})
		if err != nil {
			t.Fatalf("RunValidation() error = %v", err)
		}
	})

	t.Run("fails when changelog changed without new unreleased entries", func(t *testing.T) {
		repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added
- Existing

## [1.0.0] - 2025-01-01

### Added
- Initial
`)
		base := revParseHead(t, repo)

		writeFile(t, filepath.Join(repo, "src", "cli", "CHANGELOG.md"), `# Changelog

## [Unreleased]

### Added
- Existing

## [1.0.0] - 2025-01-01

### Added
- Initial (edited below unreleased)
`)
		runGitCmd(t, repo, "add", ".")
		runGitCmd(t, repo, "commit", "-m", "edit released section only")
		head := revParseHead(t, repo)

		t.Chdir(repo)
		err := internal.RunValidation(t.Context(), internal.ValidationRequest{
			Component: "studioctl",
			Base:      base,
			Head:      head,
		}, internal.NopLogger{})
		if err == nil {
			t.Fatal("RunValidation() expected error, got nil")
		}
		if !errors.Is(err, internal.ErrNoNewUnreleasedEntries) {
			t.Fatalf("RunValidation() error = %v, want %v", err, internal.ErrNoNewUnreleasedEntries)
		}
	})

	t.Run("release promotion accepted with empty unreleased", func(t *testing.T) {
		repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added
- Promote me
`)
		base := revParseHead(t, repo)

		writeFile(t, filepath.Join(repo, "src", "cli", "CHANGELOG.md"), `# Changelog

## [Unreleased]

## [1.0.0] - 2025-01-01

### Added
- Promote me
`)
		runGitCmd(t, repo, "add", ".")
		runGitCmd(t, repo, "commit", "-m", "promote release")
		head := revParseHead(t, repo)

		t.Chdir(repo)
		err := internal.RunValidation(t.Context(), internal.ValidationRequest{
			Component: "studioctl",
			Base:      base,
			Head:      head,
		}, internal.NopLogger{})
		if err != nil {
			t.Fatalf("RunValidation() error = %v", err)
		}
	})

	t.Run("reject release section not derived from unreleased entries", func(t *testing.T) {
		repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added
- Promote me
`)
		base := revParseHead(t, repo)

		writeFile(t, filepath.Join(repo, "src", "cli", "CHANGELOG.md"), `# Changelog

## [Unreleased]

## [1.0.0] - 2025-01-01

### Added
- Unrelated release entry
`)
		runGitCmd(t, repo, "add", ".")
		runGitCmd(t, repo, "commit", "-m", "synthetic release")
		head := revParseHead(t, repo)

		t.Chdir(repo)
		err := internal.RunValidation(t.Context(), internal.ValidationRequest{
			Component: "studioctl",
			Base:      base,
			Head:      head,
		}, internal.NopLogger{})
		if err == nil {
			t.Fatal("RunValidation() expected error, got nil")
		}
		if !errors.Is(err, changelog.ErrUnreleasedNoHeader) {
			t.Fatalf("RunValidation() error = %v, want %v", err, changelog.ErrUnreleasedNoHeader)
		}
	})

	t.Run("reject synthetic release header without removals", func(t *testing.T) {
		repo := createStudioctlWorkflowRepo(t, syntheticReleaseBypassChangelog)
		base := revParseHead(t, repo)

		writeFile(t, filepath.Join(repo, "src", "cli", "CHANGELOG.md"), `# Changelog

## [Unreleased]

## [1.1.0] - 2025-02-01

### Added
- Fake release

## [1.0.0] - 2025-01-01

### Added
- Initial release
`)
		runGitCmd(t, repo, "add", ".")
		runGitCmd(t, repo, "commit", "-m", "fake release promotion")
		head := revParseHead(t, repo)

		t.Chdir(repo)
		err := internal.RunValidation(t.Context(), internal.ValidationRequest{
			Component: "studioctl",
			Base:      base,
			Head:      head,
		}, internal.NopLogger{})
		if err == nil {
			t.Fatal("RunValidation() expected error, got nil")
		}
		if !errors.Is(err, changelog.ErrUnreleasedNoHeader) {
			t.Fatalf("RunValidation() error = %v, want %v", err, changelog.ErrUnreleasedNoHeader)
		}
	})

	t.Run("fails when changelog not modified", func(t *testing.T) {
		repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added
- Existing
`)
		base := revParseHead(t, repo)
		writeFile(t, filepath.Join(repo, "README.md"), "changed\n")
		runGitCmd(t, repo, "add", "README.md")
		runGitCmd(t, repo, "commit", "-m", "touch readme")
		head := revParseHead(t, repo)

		t.Chdir(repo)
		err := internal.RunValidation(t.Context(), internal.ValidationRequest{
			Component: "studioctl",
			Base:      base,
			Head:      head,
		}, internal.NopLogger{})
		if err == nil {
			t.Fatal("RunValidation() expected error, got nil")
		}
		if !errors.Is(err, internal.ErrChangelogNotModified) {
			t.Fatalf("RunValidation() error = %v, want %v", err, internal.ErrChangelogNotModified)
		}
	})

	t.Run("fails when unreleased is empty without promotion", func(t *testing.T) {
		repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added
- Existing
`)
		base := revParseHead(t, repo)
		writeFile(t, filepath.Join(repo, "src", "cli", "CHANGELOG.md"), `# Changelog

## [Unreleased]
`)
		runGitCmd(t, repo, "add", ".")
		runGitCmd(t, repo, "commit", "-m", "empty unreleased")
		head := revParseHead(t, repo)

		t.Chdir(repo)
		err := internal.RunValidation(t.Context(), internal.ValidationRequest{
			Component: "studioctl",
			Base:      base,
			Head:      head,
		}, internal.NopLogger{})
		if err == nil {
			t.Fatal("RunValidation() expected error, got nil")
		}
		if !errors.Is(err, changelog.ErrUnreleasedNoHeader) {
			t.Fatalf("RunValidation() error = %v, want %v", err, changelog.ErrUnreleasedNoHeader)
		}
	})
}

func TestRunValidationWithDeps_ValidationErrors(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, `# Changelog

## [Unreleased]

### Added
- Existing
`)
	t.Chdir(repo)

	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))
	head := revParseHead(t, repo)

	tests := []struct {
		name        string
		req         internal.ValidationRequest
		git         *internal.GitCLI
		wantErrText string
	}{
		{
			name: "missing component",
			req: internal.ValidationRequest{
				Base: head,
				Head: head,
			},
			git:         git,
			wantErrText: "component is required",
		},
		{
			name: "missing base",
			req: internal.ValidationRequest{
				Component: "studioctl",
				Head:      head,
			},
			git:         git,
			wantErrText: "base commit is required",
		},
		{
			name: "missing head",
			req: internal.ValidationRequest{
				Component: "studioctl",
				Base:      head,
			},
			git:         git,
			wantErrText: "head commit is required",
		},
		{
			name: "nil git",
			req: internal.ValidationRequest{
				Component: "studioctl",
				Base:      head,
				Head:      head,
			},
			git:         nil,
			wantErrText: "git client is required",
		},
	}

	t.Run("nil context", func(t *testing.T) {
		err := internal.RunValidationWithDeps(nilContext(), internal.ValidationRequest{
			Component: "studioctl",
			Base:      head,
			Head:      head,
		}, git)
		if err == nil {
			t.Fatal("RunValidationWithDeps() expected error, got nil")
		}
		if !strings.Contains(err.Error(), "context is required") {
			t.Fatalf("RunValidationWithDeps() error = %v, want message containing %q", err, "context is required")
		}
	})

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := internal.RunValidationWithDeps(context.Background(), tt.req, tt.git)
			if err == nil {
				t.Fatal("RunValidationWithDeps() expected error, got nil")
			}
			if !strings.Contains(err.Error(), tt.wantErrText) {
				t.Fatalf("RunValidationWithDeps() error = %v, want message containing %q", err, tt.wantErrText)
			}
		})
	}
}

func nilContext() context.Context {
	return nil
}

func revParseHead(t *testing.T, repoDir string) string {
	t.Helper()

	cmd := exec.CommandContext(context.Background(), "git", "rev-parse", "HEAD")
	cmd.Dir = repoDir
	out, err := cmd.Output()
	if err != nil {
		t.Fatalf("git rev-parse HEAD: %v", err)
	}
	return strings.TrimSpace(string(out))
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", filepath.Dir(path), err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}
