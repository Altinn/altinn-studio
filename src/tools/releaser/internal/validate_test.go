package internal_test

import (
	"context"
	"errors"
	"fmt"
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
	t.Run("valid changelog update", testRunValidationValidChangelogUpdate)
	t.Run("fails when changelog changed without new unreleased entries", testRunValidationFailsNoNewUnreleased)
	t.Run("release promotion accepted with empty unreleased", testRunValidationAcceptsPromotion)
	t.Run("reject release section not derived from unreleased entries", testRunValidationRejectsSyntheticRelease)
	t.Run("reject synthetic release header without removals", testRunValidationRejectsSyntheticReleaseHeader)
	t.Run("fails when changelog not modified", testRunValidationFailsChangelogNotModified)
	t.Run("fails when unreleased is empty without promotion", testRunValidationFailsEmptyUnreleased)
}

func testRunValidationValidChangelogUpdate(t *testing.T) {
	repo, base := setupValidationRepo(t, `# Changelog

## [Unreleased]

## [1.0.0] - 2025-01-01

### Added

- Initial
`)
	head := commitValidationFile(t, repo, "src/cli/CHANGELOG.md", `# Changelog

## [Unreleased]

### Fixed

- Validation entry

## [1.0.0] - 2025-01-01

### Added

- Initial
`, "update changelog")

	if err := runValidation(t, repo, base, head); err != nil {
		t.Fatalf("RunValidation() error = %v", err)
	}
}

func testRunValidationFailsNoNewUnreleased(t *testing.T) {
	repo, base := setupValidationRepo(t, `# Changelog

## [Unreleased]

### Added

- Existing

## [1.0.0] - 2025-01-01

### Added

- Initial
`)
	head := commitValidationFile(t, repo, "src/cli/CHANGELOG.md", `# Changelog

## [Unreleased]

### Added

- Existing

## [1.0.0] - 2025-01-01

### Added

- Initial (edited below unreleased)
`, "edit released section only")

	assertValidationError(t, runValidation(t, repo, base, head), internal.ErrNoNewUnreleasedEntries)
}

func testRunValidationAcceptsPromotion(t *testing.T) {
	repo, base := setupValidationRepo(t, `# Changelog

## [Unreleased]

### Added

- Promote me
`)
	head := commitValidationFile(t, repo, "src/cli/CHANGELOG.md", `# Changelog

## [Unreleased]

## [1.0.0] - 2025-01-01

### Added

- Promote me
`, "promote release")

	if err := runValidation(t, repo, base, head); err != nil {
		t.Fatalf("RunValidation() error = %v", err)
	}
}

func testRunValidationRejectsSyntheticRelease(t *testing.T) {
	repo, base := setupValidationRepo(t, `# Changelog

## [Unreleased]

### Added

- Promote me
`)
	head := commitValidationFile(t, repo, "src/cli/CHANGELOG.md", `# Changelog

## [Unreleased]

## [1.0.0] - 2025-01-01

### Added

- Unrelated release entry
`, "synthetic release")

	assertValidationError(t, runValidation(t, repo, base, head), changelog.ErrUnreleasedNoHeader)
}

func testRunValidationRejectsSyntheticReleaseHeader(t *testing.T) {
	repo, base := setupValidationRepo(t, syntheticReleaseBypassChangelog)
	head := commitValidationFile(t, repo, "src/cli/CHANGELOG.md", `# Changelog

## [Unreleased]

## [1.1.0] - 2025-02-01

### Added

- Fake release

## [1.0.0] - 2025-01-01

### Added

- Initial release
`, "fake release promotion")

	assertValidationError(t, runValidation(t, repo, base, head), changelog.ErrUnreleasedNoHeader)
}

func testRunValidationFailsChangelogNotModified(t *testing.T) {
	repo, base := setupValidationRepo(t, `# Changelog

## [Unreleased]

### Added

- Existing
`)
	head := commitValidationFile(t, repo, "README.md", "changed\n", "touch readme")

	assertValidationError(t, runValidation(t, repo, base, head), internal.ErrChangelogNotModified)
}

func testRunValidationFailsEmptyUnreleased(t *testing.T) {
	repo, base := setupValidationRepo(t, `# Changelog

## [Unreleased]

### Added

- Existing
`)
	head := commitValidationFile(t, repo, "src/cli/CHANGELOG.md", `# Changelog

## [Unreleased]
`, "empty unreleased")

	assertValidationError(t, runValidation(t, repo, base, head), changelog.ErrUnreleasedNoHeader)
}

func setupValidationRepo(t *testing.T, initialChangelog string) (string, string) {
	t.Helper()
	repo := createStudioctlWorkflowRepo(t, initialChangelog)
	return repo, revParseHead(t, repo)
}

func commitValidationFile(t *testing.T, repo, relPath, content, message string) string {
	t.Helper()
	writeFile(t, filepath.Join(repo, filepath.FromSlash(relPath)), content)
	if relPath == "README.md" {
		runGitCmd(t, repo, "add", relPath)
	} else {
		runGitCmd(t, repo, "add", ".")
	}
	runGitCmd(t, repo, "commit", "-m", message)
	return revParseHead(t, repo)
}

func runValidation(t *testing.T, repo, base, head string) error {
	t.Helper()
	t.Chdir(repo)
	if err := internal.RunValidation(t.Context(), internal.ValidationRequest{
		Component: "studioctl",
		Base:      base,
		Head:      head,
	}, internal.NopLogger{}); err != nil {
		return fmt.Errorf("run validation: %w", err)
	}
	return nil
}

func assertValidationError(t *testing.T, err, want error) {
	t.Helper()
	if err == nil {
		t.Fatal("RunValidation() expected error, got nil")
	}
	if !errors.Is(err, want) {
		t.Fatalf("RunValidation() error = %v, want %v", err, want)
	}
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
