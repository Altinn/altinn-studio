package e2e_test

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"altinn.studio/releaser/internal"
	semver "altinn.studio/releaser/internal/version"
)

// TestPrerelease_LocalRepo tests the complete prerelease flow:
// 1. Prepare release PR (promotes [Unreleased] to [vX.Y.Z-preview.N]).
// 2. Run release workflow (creates GitHub release targeting main).
func TestPrerelease_LocalRepo(t *testing.T) {
	const (
		component = "studioctl"
		version   = "v1.0.0-preview.1"
		tag       = component + "/" + version
	)

	logger := newTestLogger(t)
	changelogUnreleased := `# Changelog

## [Unreleased]

### Added
- Initial preview feature
`
	repo := createRepo(t, logger, changelogUnreleased)
	gh := &fakeGH{log: logger}

	// Step 1: Run prepare to create release PR
	prepareReq := internal.PrepareRequest{
		Component:     component,
		Version:       version,
		ChangelogPath: "CHANGELOG.md",
		DryRun:        false,
	}
	git := internal.NewGitCLI(internal.WithWorkdir(repo.dir), internal.WithLogger(logger))
	if err := internal.RunPrepareWithDeps(t.Context(), prepareReq, git, gh, logger); err != nil {
		t.Fatalf("RunPrepare() error: %v", err)
	}

	// Verify changelog was promoted (version without v prefix in changelog)
	changelogContent := readFileContent(t, repo.changelogPath)
	versionNoPrefix := strings.TrimPrefix(version, "v")
	if !strings.Contains(changelogContent, "## ["+versionNoPrefix+"]") {
		t.Fatalf("expected promoted changelog entry for %s, got:\n%s", versionNoPrefix, changelogContent)
	}

	// Verify PR was created targeting main
	if !gh.prCreated {
		t.Fatal("expected PR to be created")
	}
	if gh.prBase != "main" {
		t.Fatalf("PR base = %s, want main", gh.prBase)
	}

	// Step 2: Simulate merge by checking out main and committing promoted changelog
	runGit(t, logger, repo.dir, "checkout", "main")
	runGit(t, logger, repo.dir, "pull", "origin", "main")
	changelogPromoted := fmt.Sprintf(`# Changelog

## [Unreleased]

## [%s] - 2025-01-01

### Added
- Initial preview feature
`, versionNoPrefix)
	writeFile(t, repo.changelogPath, changelogPromoted)
	runGit(t, logger, repo.dir, "add", ".")
	runGit(t, logger, repo.dir, "commit", "-m", "Merge release PR")

	// Step 3: Run release workflow
	gh.reset()
	outputDir := filepath.Join(repo.dir, "out")
	builder := &fakeBuilder{log: logger}

	cfg := internal.WorkflowConfig{
		Component:     component,
		Version:       version,
		ChangelogPath: repo.changelogPath,
		OutputDir:     outputDir,
		RepoRoot:      repo.dir,
		Draft:         true,
	}
	workflow, err := internal.NewWorkflow(t.Context(), cfg, git, gh, builder, logger)
	if err != nil {
		t.Fatalf("NewWorkflow() error: %v", err)
	}

	if err := workflow.Run(t.Context()); err != nil {
		t.Fatalf("workflow.Run() error: %v", err)
	}

	// Verify prerelease behavior
	if !gh.releaseCreated {
		t.Fatal("expected GitHub release creation")
	}
	if gh.releaseTag != tag {
		t.Fatalf("tag = %s, want %s", gh.releaseTag, tag)
	}
	if gh.releaseTarget != "main" {
		t.Fatalf("target = %s, want main", gh.releaseTarget)
	}
	if !gh.releasePrerelease {
		t.Fatal("expected prerelease=true for preview release")
	}
}

// TestNewStableRelease_LocalRepo tests the first stable release flow:
// 1. Prepare release PR (creates release branch + promotes changelog).
// 2. Run release workflow (creates GitHub release targeting release branch).
func TestNewStableRelease_LocalRepo(t *testing.T) {
	const (
		component     = "studioctl"
		version       = "v1.0.0"
		tag           = component + "/" + version
		releaseBranch = "release/studioctl/v1.0"
	)

	logger := newTestLogger(t)
	changelogUnreleased := `# Changelog

## [Unreleased]

### Added
- First stable feature
`
	repo := createRepo(t, logger, changelogUnreleased)
	gh := &fakeGH{log: logger}

	// Step 1: Run prepare to create release branch and PR
	prepareReq := internal.PrepareRequest{
		Component:     component,
		Version:       version,
		ChangelogPath: "CHANGELOG.md",
		DryRun:        false,
	}
	git := internal.NewGitCLI(internal.WithWorkdir(repo.dir), internal.WithLogger(logger))
	if err := internal.RunPrepareWithDeps(t.Context(), prepareReq, git, gh, logger); err != nil {
		t.Fatalf("RunPrepare() error: %v", err)
	}

	// Verify release branch was created
	refs := runGit(
		t, logger, repo.dir, "for-each-ref",
		"--format=%(refname:short)", "refs/remotes/origin/"+releaseBranch,
	)
	if strings.TrimSpace(refs) == "" {
		t.Fatalf("expected release branch %s to be created", releaseBranch)
	}

	// Verify changelog was promoted (version without v prefix in changelog)
	changelogContent := readFileContent(t, repo.changelogPath)
	versionNoPrefix := strings.TrimPrefix(version, "v")
	if !strings.Contains(changelogContent, "## ["+versionNoPrefix+"]") {
		t.Fatalf("expected promoted changelog entry for %s, got:\n%s", versionNoPrefix, changelogContent)
	}

	// Verify PR was created targeting release branch
	if !gh.prCreated {
		t.Fatal("expected PR to be created")
	}
	if gh.prBase != releaseBranch {
		t.Fatalf("PR base = %s, want %s", gh.prBase, releaseBranch)
	}

	// Step 2: Simulate merge by updating release branch
	changelogPromoted := fmt.Sprintf(`# Changelog

## [Unreleased]

## [%s] - 2025-01-01

### Added
- First stable feature
`, versionNoPrefix)
	runGit(t, logger, repo.dir, "checkout", releaseBranch)
	writeFile(t, repo.changelogPath, changelogPromoted)
	runGit(t, logger, repo.dir, "add", ".")
	runGit(t, logger, repo.dir, "commit", "-m", "Merge release PR")
	runGit(t, logger, repo.dir, "push", "origin", releaseBranch)

	// Step 3: Run release workflow
	gh.reset()
	outputDir := filepath.Join(repo.dir, "out")
	builder := &fakeBuilder{log: logger}

	cfg := internal.WorkflowConfig{
		Component:     component,
		Version:       version,
		ChangelogPath: repo.changelogPath,
		OutputDir:     outputDir,
		RepoRoot:      repo.dir,
		Draft:         true,
	}
	workflow, err := internal.NewWorkflow(t.Context(), cfg, git, gh, builder, logger)
	if err != nil {
		t.Fatalf("NewWorkflow() error: %v", err)
	}

	if err := workflow.Run(t.Context()); err != nil {
		t.Fatalf("workflow.Run() error: %v", err)
	}

	// Verify stable release behavior
	if !gh.releaseCreated {
		t.Fatal("expected GitHub release creation")
	}
	if gh.releaseTag != tag {
		t.Fatalf("tag = %s, want %s", gh.releaseTag, tag)
	}
	if gh.releaseTarget != releaseBranch {
		t.Fatalf("target = %s, want %s", gh.releaseTarget, releaseBranch)
	}
	if gh.releasePrerelease {
		t.Fatal("expected prerelease=false for stable release")
	}

	// Verify we're on release branch
	currentBranch := gitCurrentBranch(t, logger, repo.dir)
	if currentBranch != releaseBranch {
		t.Fatalf("current branch = %s, want %s", currentBranch, releaseBranch)
	}
}

// TestBackportAndPatchRelease_LocalRepo tests the backport + patch release flow:
// 1. Create a commit on main with changelog entry.
// 2. Run backport to cherry-pick to release branch.
// 3. Run prepare for patch release.
func TestBackportAndPatchRelease_LocalRepo(t *testing.T) {
	const (
		component     = "studioctl"
		patchVersion  = "v1.0.1"
		releaseBranch = "release/studioctl/v1.0"
	)

	logger := newTestLogger(t)
	changelogInitial := `# Changelog

## [Unreleased]

## [v1.0.0] - 2025-01-01

### Added
- First stable feature
`
	repo := createRepo(t, logger, changelogInitial)
	createReleaseBranchV1(t, repo, logger)

	// Step 1: Create a fix commit on main with changelog entry
	writeFile(t, filepath.Join(repo.dir, "fix.txt"), "bugfix\n")
	writeFile(t, repo.changelogPath, `# Changelog

## [Unreleased]

### Fixed
- Critical bugfix

## [v1.0.0] - 2025-01-01

### Added
- First stable feature
`)
	runGit(t, logger, repo.dir, "add", ".")
	runGit(t, logger, repo.dir, "commit", "-m", "Fix critical bug")
	commitSHA := strings.TrimSpace(runGit(t, logger, repo.dir, "rev-parse", "HEAD"))
	shortSHA := commitSHA[:8]

	// Step 2: Run backport command
	gh := &fakeGH{log: logger}
	git := internal.NewGitCLI(internal.WithWorkdir(repo.dir), internal.WithLogger(logger))
	backportReq := internal.BackportRequest{
		Component:     component,
		Commit:        commitSHA,
		Branch:        "v1.0",
		ChangelogPath: "CHANGELOG.md",
		DryRun:        false,
	}
	if err := internal.RunBackportWithDeps(t.Context(), backportReq, git, gh, logger); err != nil {
		t.Fatalf("RunBackport() error: %v", err)
	}

	// Verify backport branch was created
	currentBranch := gitCurrentBranch(t, logger, repo.dir)
	expectedBranchPrefix := "backport/studioctl-v1.0-"
	if !strings.HasPrefix(currentBranch, expectedBranchPrefix) {
		t.Fatalf("current branch = %s, want prefix %s", currentBranch, expectedBranchPrefix)
	}

	// Verify changelog has backported entry
	changelogContent := readFileContent(t, repo.changelogPath)
	if !strings.Contains(changelogContent, "- Critical bugfix") {
		t.Fatalf("expected backported changelog entry")
	}

	// Verify backport PR was created
	if !gh.prCreated {
		t.Fatal("expected backport PR to be created")
	}
	if gh.prBase != releaseBranch {
		t.Fatalf("PR base = %s, want %s", gh.prBase, releaseBranch)
	}
	if !strings.Contains(gh.prTitle, shortSHA) {
		t.Fatalf("PR title should contain short SHA %s, got: %s", shortSHA, gh.prTitle)
	}

	// Step 3: Simulate merge of backport PR
	runGit(t, logger, repo.dir, "checkout", releaseBranch)
	runGit(t, logger, repo.dir, "merge", currentBranch, "-m", "Merge backport PR")
	runGit(t, logger, repo.dir, "push", "origin", releaseBranch)

	// Step 4: Run prepare for patch release
	gh.reset()
	prepareReq := internal.PrepareRequest{
		Component:     component,
		Version:       patchVersion,
		ChangelogPath: "CHANGELOG.md",
		DryRun:        false,
	}
	if err := internal.RunPrepareWithDeps(t.Context(), prepareReq, git, gh, logger); err != nil {
		t.Fatalf("RunPrepare() for patch error: %v", err)
	}

	// Verify changelog was promoted for patch (version without v prefix in changelog)
	changelogContent = readFileContent(t, repo.changelogPath)
	patchVersionNoPrefix := strings.TrimPrefix(patchVersion, "v")
	if !strings.Contains(changelogContent, "## ["+patchVersionNoPrefix+"]") {
		t.Fatalf("expected promoted changelog entry for %s, got:\n%s", patchVersionNoPrefix, changelogContent)
	}

	// Verify patch PR targets release branch
	if !gh.prCreated {
		t.Fatal("expected patch PR to be created")
	}
	if gh.prBase != releaseBranch {
		t.Fatalf("PR base = %s, want %s", gh.prBase, releaseBranch)
	}
}

// TestWorkflowRun_ErrorCases tests error conditions in the release workflow.
func TestWorkflowRun_ErrorCases(t *testing.T) {
	const (
		component      = "studioctl"
		previewVersion = "v1.2.3-preview.1"
		stableVersion  = "v1.2.3"
	)

	changelogPreview := `# Changelog

## [Unreleased]

## [v1.2.3-preview.1] - 2025-01-01

### Added
- Test release content
`
	changelogStable := `# Changelog

## [Unreleased]

## [v1.2.3] - 2025-01-01

### Added
- Test release content
`
	changelogMissing := `# Changelog

## [Unreleased]

### Added
- Missing release section
`

	tests := []struct {
		setupRepo func(t *testing.T, repo *repoFixture, log internal.Logger)
		expectErr error
		name      string
		version   string
		changelog string
	}{
		{
			name:      "stable_missing_release_branch",
			version:   stableVersion,
			changelog: changelogStable,
			expectErr: internal.ErrReleaseBranchMissing,
		},
		{
			name:      "missing_changelog_section",
			version:   previewVersion,
			changelog: changelogMissing,
			expectErr: internal.ErrChangelogMissing,
		},
		{
			name:      "tag_already_exists",
			version:   previewVersion,
			changelog: changelogPreview,
			setupRepo: func(t *testing.T, repo *repoFixture, _ internal.Logger) {
				t.Helper()
				runGit(t, nil, repo.dir, "tag", component+"/"+previewVersion)
			},
			expectErr: internal.ErrTagExists,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := newTestLogger(t)
			repo := createRepo(t, logger, tt.changelog)
			if tt.setupRepo != nil {
				tt.setupRepo(t, repo, logger)
			}

			outputDir := filepath.Join(repo.dir, "out")
			git := internal.NewGitCLI(internal.WithWorkdir(repo.dir), internal.WithLogger(logger))
			builder := &fakeBuilder{log: logger}
			gh := &fakeGH{log: logger}

			cfg := internal.WorkflowConfig{
				Component:     component,
				Version:       tt.version,
				ChangelogPath: repo.changelogPath,
				OutputDir:     outputDir,
				RepoRoot:      repo.dir,
				Draft:         true,
			}
			workflow, err := internal.NewWorkflow(t.Context(), cfg, git, gh, builder, logger)
			if err != nil {
				// Some errors occur during NewWorkflow validation
				if !errors.Is(err, tt.expectErr) {
					t.Fatalf("NewWorkflow() error = %v, want %v", err, tt.expectErr)
				}
				return
			}

			err = workflow.Run(t.Context())
			if err == nil {
				t.Fatal("workflow.Run() expected error, got nil")
			}
			if !errors.Is(err, tt.expectErr) {
				t.Fatalf("workflow.Run() error = %v, want %v", err, tt.expectErr)
			}
			if gh.releaseCreated {
				t.Fatal("expected no GitHub release creation on error")
			}
		})
	}
}

// --- Test Helpers ---

type repoFixture struct {
	dir           string
	origin        string
	changelogPath string
}

func createRepo(t *testing.T, log internal.Logger, changelog string) *repoFixture {
	t.Helper()

	repoDir := t.TempDir()
	runGit(t, log, repoDir, "init", "-b", "main")
	runGit(t, log, repoDir, "config", "user.email", "test@example.com")
	runGit(t, log, repoDir, "config", "user.name", "Test User")

	changelogPath := filepath.Join(repoDir, "CHANGELOG.md")
	writeFile(t, changelogPath, changelog)
	writeFile(t, filepath.Join(repoDir, "README.md"), "test\n")

	runGit(t, log, repoDir, "add", ".")
	runGit(t, log, repoDir, "commit", "-m", "init")

	originDir := filepath.Join(t.TempDir(), "origin.git")
	if err := os.MkdirAll(originDir, 0o755); err != nil {
		t.Fatalf("create origin dir: %v", err)
	}
	runGit(t, log, originDir, "init", "--bare")
	runGit(t, log, repoDir, "remote", "add", "origin", originDir)
	runGit(t, log, repoDir, "push", "-u", "origin", "main")

	return &repoFixture{
		dir:           repoDir,
		origin:        originDir,
		changelogPath: changelogPath,
	}
}

func createReleaseBranchV1(t *testing.T, repo *repoFixture, log internal.Logger) {
	t.Helper()

	runGit(t, log, repo.dir, "checkout", "-b", "release/studioctl/v1.0")
	runGit(t, log, repo.dir, "push", "-u", "origin", "release/studioctl/v1.0")
	runGit(t, log, repo.dir, "checkout", "main")
}

func gitCurrentBranch(t *testing.T, log internal.Logger, dir string) string {
	t.Helper()

	output := runGit(t, log, dir, "rev-parse", "--abbrev-ref", "HEAD")
	return strings.TrimSpace(output)
}

func runGit(t *testing.T, log internal.Logger, dir string, args ...string) string {
	t.Helper()

	if log == nil {
		log = internal.NopLogger{}
	}
	git := internal.NewGitCLI(internal.WithWorkdir(dir), internal.WithLogger(log))
	out, err := git.Run(t.Context(), args...)
	if err != nil {
		t.Fatalf("git %s: %v", strings.Join(args, " "), err)
	}
	return out
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()

	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write file %s: %v", path, err)
	}
}

func readFileContent(t *testing.T, path string) string {
	t.Helper()

	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read file %s: %v", path, err)
	}
	return string(content)
}

// testLogger captures log output and writes it to a file on cleanup.
type testLogger struct {
	*internal.ConsoleLogger

	buf *bytes.Buffer
}

func newTestLogger(t *testing.T) *testLogger {
	t.Helper()

	buf := &bytes.Buffer{}
	logger := &testLogger{
		ConsoleLogger: internal.NewConsoleLogger(internal.WithWriters(buf, buf)),
		buf:           buf,
	}

	// Write log to file on cleanup
	t.Cleanup(func() {
		logDir := filepath.Join(cliRootDir(), "test", "e2e", "_logs")
		if err := os.MkdirAll(logDir, 0o755); err != nil {
			t.Errorf("create log dir: %v", err)
			return
		}
		logPath := filepath.Join(logDir, sanitizeTestName(t.Name())+".log")
		if err := os.WriteFile(logPath, buf.Bytes(), 0o644); err != nil {
			t.Errorf("write log file: %v", err)
		}
	})

	return logger
}

func cliRootDir() string {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		return "."
	}
	return filepath.Dir(filepath.Dir(filepath.Dir(file)))
}

func sanitizeTestName(name string) string {
	replacer := strings.NewReplacer("/", "_", " ", "_", ":", "_")
	return replacer.Replace(name)
}

// --- Fake implementations ---

type fakeGH struct {
	log               internal.Logger
	releaseTag        string
	releaseTarget     string
	prTitle           string
	prBase            string
	releaseAssets     int
	releasePrerelease bool
	releaseCreated    bool
	prCreated         bool
}

func (g *fakeGH) CreateRelease(_ context.Context, opts internal.Options) error {
	g.releaseCreated = true
	g.releaseTag = opts.Tag
	g.releaseTarget = opts.Target
	g.releasePrerelease = opts.Prerelease
	g.releaseAssets = len(opts.Assets)
	if g.log != nil {
		g.log.Info(
			"gh create release: tag=%s target=%s prerelease=%v assets=%d",
			g.releaseTag,
			g.releaseTarget,
			g.releasePrerelease,
			g.releaseAssets,
		)
	}
	return nil
}

func (g *fakeGH) CreatePR(_ context.Context, opts internal.PullRequestOptions) error {
	g.prCreated = true
	g.prTitle = opts.Title
	g.prBase = opts.Base
	if g.log != nil {
		g.log.Info("gh pr create: title=%s base=%s", g.prTitle, g.prBase)
	}
	return nil
}

func (g *fakeGH) SetWorkdir(_ string) {}

func (g *fakeGH) reset() {
	g.releaseTag = ""
	g.releaseTarget = ""
	g.releaseAssets = 0
	g.releasePrerelease = false
	g.releaseCreated = false
	g.prTitle = ""
	g.prBase = ""
	g.prCreated = false
}

type fakeBuilder struct {
	log    internal.Logger
	called bool
}

func (b *fakeBuilder) Build(_ context.Context, _ *semver.Version, outputDir string) ([]string, error) {
	b.called = true
	if b.log != nil {
		b.log.Info("build release -> %s", outputDir)
	}
	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		return nil, fmt.Errorf("mkdir output dir: %w", err)
	}
	assetPath := filepath.Join(outputDir, "dummy-asset")
	if err := os.WriteFile(assetPath, []byte("x"), 0o644); err != nil {
		return nil, fmt.Errorf("write dummy asset: %w", err)
	}
	return []string{assetPath}, nil
}
