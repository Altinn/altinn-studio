package internal_test

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"altinn.studio/releaser/internal"
	"altinn.studio/releaser/internal/changelog"
)

const validStructureChangelog = `# Changelog

## [Unreleased]

### Added

- Existing
`

// outOfOrderChangelog places Fixed before Added, which violates the standard
// category order and is exactly the class of bug that broke the release.
const outOfOrderChangelog = `# Changelog

## [Unreleased]

### Fixed

- A fix

### Added

- A feature
`

func TestRunStructureValidation(t *testing.T) {
	t.Run("passes on valid changed changelog", testStructureValidPasses)
	t.Run("fails on out-of-order categories", testStructureOutOfOrderFails)
	t.Run("no-op when no changelog changed", testStructureNoChangelogChanged)
	t.Run("skips vendored changelogs", testStructureSkipsVendored)
	t.Run("validates all tracked changelogs when no range given", testStructureValidatesAllTracked)
	t.Run("reports every broken changelog", testStructureReportsMultiple)
}

func testStructureValidPasses(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, validStructureChangelog)
	base := revParseHead(t, repo)
	head := commitValidationFile(t, repo, "src/cli/CHANGELOG.md", `# Changelog

## [Unreleased]

### Added

- Existing

### Fixed

- A new fix
`, "add fix")

	if err := runStructureValidation(t, repo, base, head); err != nil {
		t.Fatalf("RunStructureValidation() error = %v, want nil", err)
	}
}

func testStructureOutOfOrderFails(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, validStructureChangelog)
	base := revParseHead(t, repo)
	head := commitValidationFile(t, repo, "src/cli/CHANGELOG.md", outOfOrderChangelog, "break order")

	err := runStructureValidation(t, repo, base, head)
	assertValidationError(t, err, changelog.ErrCategoryOrder)
	if !strings.Contains(err.Error(), "src/cli/CHANGELOG.md") {
		t.Fatalf("error = %v, want it to name the offending changelog", err)
	}
}

func testStructureNoChangelogChanged(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, validStructureChangelog)
	base := revParseHead(t, repo)
	head := commitValidationFile(t, repo, "README.md", "changed\n", "touch readme")

	if err := runStructureValidation(t, repo, base, head); err != nil {
		t.Fatalf("RunStructureValidation() error = %v, want nil (nothing to validate)", err)
	}
}

func testStructureSkipsVendored(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, validStructureChangelog)
	base := revParseHead(t, repo)
	// A broken changelog under node_modules must be ignored.
	head := commitValidationFile(t, repo, "node_modules/pkg/CHANGELOG.md", outOfOrderChangelog, "vendored changelog")

	if err := runStructureValidation(t, repo, base, head); err != nil {
		t.Fatalf("RunStructureValidation() error = %v, want vendored changelog to be skipped", err)
	}
}

func testStructureValidatesAllTracked(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, outOfOrderChangelog)

	// No base/head: every tracked changelog is validated, so the broken
	// initial changelog must be caught.
	err := runStructureValidation(t, repo, "", "")
	assertValidationError(t, err, changelog.ErrCategoryOrder)
}

func testStructureReportsMultiple(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, validStructureChangelog)
	base := revParseHead(t, repo)
	writeRepoFile(t, repo, "src/cli/CHANGELOG.md", outOfOrderChangelog)
	writeRepoFile(t, repo, "src/App/backend/CHANGELOG.md", outOfOrderChangelog)
	runGitCmd(t, repo, "add", ".")
	runGitCmd(t, repo, "commit", "-m", "break two changelogs")
	head := revParseHead(t, repo)

	err := runStructureValidation(t, repo, base, head)
	if err == nil {
		t.Fatal("RunStructureValidation() expected error, got nil")
	}
	for _, want := range []string{"src/cli/CHANGELOG.md", "src/App/backend/CHANGELOG.md"} {
		if !strings.Contains(err.Error(), want) {
			t.Fatalf("error = %v, want it to mention %q", err, want)
		}
	}
}

func runStructureValidation(t *testing.T, repo, base, head string) error {
	t.Helper()
	t.Chdir(repo)
	if err := internal.RunStructureValidation(t.Context(), base, head, internal.NopLogger{}); err != nil {
		return fmt.Errorf("run structure validation: %w", err)
	}
	return nil
}

func TestRunStructureValidationWithDeps_GuardErrors(t *testing.T) {
	repo := createStudioctlWorkflowRepo(t, validStructureChangelog)
	git := internal.NewGitCLI(internal.WithWorkdir(repo), internal.WithLogger(internal.NopLogger{}))

	t.Run("nil context", func(t *testing.T) {
		err := internal.RunStructureValidationWithDeps(nilContext(), "", "", git, internal.NopLogger{})
		assertErrorContains(t, err, "context is required")
	})

	t.Run("nil git", func(t *testing.T) {
		err := internal.RunStructureValidationWithDeps(context.Background(), "", "", nil, internal.NopLogger{})
		assertErrorContains(t, err, "git client is required")
	})
}

func assertErrorContains(t *testing.T, err error, want string) {
	t.Helper()
	if err == nil {
		t.Fatalf("expected error containing %q, got nil", want)
	}
	if !strings.Contains(err.Error(), want) {
		t.Fatalf("error = %v, want message containing %q", err, want)
	}
}
