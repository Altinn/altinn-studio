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

const (
	mainBranchName     = "main"
	studioctlComponent = "studioctl"
)

type releaseFlow struct {
	major       int
	minor       int
	patch       int
	nextPreview int
}

func newReleaseFlow(major, minor int) releaseFlow {
	return releaseFlow{major: major, minor: minor, nextPreview: 1}
}

func (v releaseFlow) nextMinor() releaseFlow {
	return newReleaseFlow(v.major, v.minor+1)
}

func (v releaseFlow) nextPrerelease(t *testing.T, expected int) (releaseFlow, string) {
	t.Helper()
	if expected < 1 {
		t.Fatalf("invalid prerelease number %d: want >= 1", expected)
	}
	if v.nextPreview != expected {
		t.Fatalf("unexpected prerelease number: got %d, want %d", expected, v.nextPreview)
	}
	version := fmt.Sprintf("v%d.%d.%d-preview.%d", v.major, v.minor, v.patch, v.nextPreview)
	v.nextPreview++
	return v, version
}

func (v releaseFlow) stabilize() string {
	return v.stable()
}

func (v releaseFlow) nextPatch(t *testing.T, expected int) (releaseFlow, string) {
	t.Helper()
	if expected < 1 {
		t.Fatalf("invalid patch number %d: want >= 1", expected)
	}
	wantPatch := v.patch + 1
	if expected != wantPatch {
		t.Fatalf("unexpected patch number: got %d, want %d", expected, wantPatch)
	}
	v.patch++
	v.nextPreview = 1
	return v, v.stable()
}

func (v releaseFlow) stable() string {
	return fmt.Sprintf("v%d.%d.%d", v.major, v.minor, v.patch)
}

func (v releaseFlow) lineVersion() string {
	return fmt.Sprintf("v%d.%d", v.major, v.minor)
}

func (v releaseFlow) releaseBranch(component string) string {
	return fmt.Sprintf("release/%s/%s", component, v.lineVersion())
}

// TestReleaseWorkflow_LocalRepo covers the common split-line flow:
// 1. Release v1.0.0-preview.1 from main.
// 2. Stabilize and release v1.0.0 from release/studioctl/v1.0.
// 3. Release v1.1.0-preview.1 from main.
// 4. Land a bugfix on main.
// 5. Release v1.1.0-preview.2 from main.
// 6. Backport bugfix and release v1.0.1 from release/studioctl/v1.0.
// 7. Finalize v1.1.0 on release/studioctl/v1.1.
// 8. Release v1.2.0-preview.1 from main.
// 9. Land another bugfix on main.
// 10. Backport the bugfix to both v1.0 and v1.1.
// 11. Release v1.2.0-preview.2 from main.
func TestReleaseWorkflow_LocalRepo(t *testing.T) {
	logger := newTestLogger(t)
	s := newWorkflowScenario(t, logger, changelogDoc(nil))
	v100 := newReleaseFlow(1, 0)
	v110 := v100.nextMinor()
	v120 := v110.nextMinor()

	v100, previewV100p1 := v100.nextPrerelease(t, 1)
	stableV100 := v100.stabilize()
	releaseV100 := v100.releaseBranch(studioctlComponent)

	s.landFeature(
		"feature/v100-preview1",
		"Add first stable feature",
		s.changelogFile(changelogDoc(
			[]changelogCategory{cat("Added", "First stable feature")},
		)),
	)

	// 1) Release v1.0.0-preview.1 from main.
	promoted := s.prepareAndMerge(previewV100p1, mainBranchName)
	assertVersionSectionContains(t, promoted, previewV100p1, "First stable feature")
	s.release(previewV100p1, mainBranchName, true)

	// 2) Stabilize v1.0.0 by promoting the existing prerelease history.
	promoted = s.prepareAndMerge(stableV100, releaseV100)
	assertVersionOrder(t, promoted, stableV100, previewV100p1)
	assertVersionSectionContains(t, promoted, stableV100, "First stable feature")
	s.release(stableV100, releaseV100, false)

	v110, previewV110p1 := v110.nextPrerelease(t, 1)
	v110, previewV110p2 := v110.nextPrerelease(t, 2)
	stableV110 := v110.stabilize()
	releaseV110 := v110.releaseBranch(studioctlComponent)
	v120, previewV120p1 := v120.nextPrerelease(t, 1)
	_, previewV120p2 := v120.nextPrerelease(t, 2)

	// Move back to main and model the preview line changelog.
	s.landFeature(
		"feature/v110-preview1",
		"Start v1.1 preview line",
		s.changelogFile(changelogDoc(
			[]changelogCategory{cat("Added", "Preview track feature")},
			rel(stableV100, "2025-01-01", cat("Added", "First stable feature")),
		)),
	)

	// 3) Release v1.1.0-preview.1 on main.
	promoted = s.prepareAndMerge(previewV110p1, mainBranchName)
	assertVersionOrder(t, promoted, previewV110p1, stableV100)
	s.release(previewV110p1, mainBranchName, true)

	// 4) Bugfix on main.
	s.landFeature(
		"feature/v110-bugfix1",
		"Fix critical bug on main",
		repoFile{
			path:    filepath.Join(s.repo.dir, "bugfix.txt"),
			content: "fix\n",
		},
		s.changelogFile(changelogDoc(
			[]changelogCategory{cat("Fixed", "Critical bugfix")},
			rel(previewV110p1, "2025-01-02", cat("Added", "Preview track feature")),
			rel(stableV100, "2025-01-01", cat("Added", "First stable feature")),
		)),
	)
	bugfixSHA := s.headSHA()

	// 5) Release v1.1.0-preview.2 on main.
	promoted = s.prepareAndMerge(previewV110p2, mainBranchName)
	assertVersionOrder(t, promoted, previewV110p2, previewV110p1)
	assertVersionOrder(t, promoted, previewV110p1, stableV100)
	s.release(previewV110p2, mainBranchName, true)

	// 6) Backport bugfix, then release v1.0.1 from release branch.
	s.backportAndMerge(bugfixSHA, v100.lineVersion(), releaseV100, "Merge backport PR")
	v100, patchV101 := v100.nextPatch(t, 1)
	promoted = s.prepareAndMerge(patchV101, releaseV100)
	assertVersionOrder(t, promoted, patchV101, stableV100)
	s.release(patchV101, releaseV100, false)

	runFinalizeAndNextPreviewSequence(t, s, finalizeAndPreviewArgs{
		releaseV100:   releaseV100,
		releaseV110:   releaseV110,
		lineV100:      v100.lineVersion(),
		lineV110:      v110.lineVersion(),
		stableV110:    stableV110,
		previewV110p1: previewV110p1,
		previewV110p2: previewV110p2,
		previewV120p1: previewV120p1,
		previewV120p2: previewV120p2,
	})
}

// TestWorkflowRun_ErrorCases tests error conditions in the release workflow.
func TestWorkflowRun_ErrorCases(t *testing.T) {
	const (
		component      = studioctlComponent
		previewVersion = "v1.2.3-preview.1"
		stableVersion  = "v1.2.3"
	)

	changelogPreview := changelogDoc(nil, rel(previewVersion, "2025-01-01", cat("Added", "Test release content")))
	changelogStable := changelogDoc(nil, rel(stableVersion, "2025-01-01", cat("Added", "Test release content")))
	changelogMissing := changelogDoc([]changelogCategory{cat("Added", "Missing release section")})

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

func TestRunWorkflow_StudioctlLikeRepo_LocalRepo(t *testing.T) {
	logger := newTestLogger(t)
	repo := createRepo(t, logger, changelogDoc(nil))
	prepareStudioctlLikeLayout(t, logger, repo.dir, changelogDoc(nil,
		rel("v1.2.0-preview.2", "2025-01-02", cat("Added", "Latest studioctl preview")),
		rel("v1.2.0-preview.1", "2025-01-01", cat("Added", "Older studioctl preview")),
	))

	t.Chdir(repo.dir)
	err := internal.RunWorkflow(t.Context(), internal.WorkflowRequest{
		Component:             studioctlComponent,
		BaseBranch:            mainBranchName,
		DryRun:                true,
		Draft:                 true,
		UnsafeSkipBranchCheck: false,
	}, logger)
	if err != nil {
		t.Fatalf("RunWorkflow() error = %v", err)
	}

	outputDir := filepath.Join(repo.dir, "build", "release")
	expectedArtifacts := []string{
		"studioctl-linux-amd64",
		"studioctl-linux-arm64",
		"studioctl-darwin-amd64",
		"studioctl-darwin-arm64",
		"studioctl-windows-amd64.exe",
		"studioctl-windows-arm64.exe",
		"localtest-resources.tar.gz",
		"install.sh",
		"install.ps1",
		"SHA256SUMS",
		"release-notes.md",
	}
	for _, name := range expectedArtifacts {
		path := filepath.Join(outputDir, name)
		info, statErr := os.Stat(path)
		if statErr != nil {
			t.Fatalf("expected artifact %s: %v", name, statErr)
		}
		if info.Size() == 0 {
			t.Fatalf("artifact %s is empty", name)
		}
	}

	notes, readErr := os.ReadFile(filepath.Join(outputDir, "release-notes.md"))
	if readErr != nil {
		t.Fatalf("read release notes: %v", readErr)
	}
	if !strings.Contains(string(notes), "Latest studioctl preview") {
		t.Fatalf("release notes missing latest prerelease notes:\n%s", string(notes))
	}

	checksums, readErr := os.ReadFile(filepath.Join(outputDir, "SHA256SUMS"))
	if readErr != nil {
		t.Fatalf("read SHA256SUMS: %v", readErr)
	}
	lines := strings.Split(strings.TrimSpace(string(checksums)), "\n")
	if len(lines) != 9 {
		t.Fatalf("SHA256SUMS line count = %d, want 9", len(lines))
	}
	if !strings.Contains(string(checksums), "localtest-resources.tar.gz") {
		t.Fatalf("SHA256SUMS missing localtest-resources.tar.gz entry:\n%s", string(checksums))
	}

	expectedTag := "studioctl/v1.2.0-preview.2"
	for _, scriptName := range []string{"install.sh", "install.ps1"} {
		scriptBytes, err := os.ReadFile(filepath.Join(outputDir, scriptName))
		if err != nil {
			t.Fatalf("read %s: %v", scriptName, err)
		}
		script := string(scriptBytes)
		if !strings.Contains(script, expectedTag) {
			t.Fatalf("%s missing stamped tag %q:\n%s", scriptName, expectedTag, script)
		}
		if !strings.Contains(script, "__STUDIOCTL_DEFAULT_VERSION__") {
			t.Fatalf("%s missing fallback marker placeholder", scriptName)
		}
	}
}

// --- Test Helpers ---

type repoFixture struct {
	dir           string
	changelogPath string
}

func createRepo(t *testing.T, log internal.Logger, changelog string) *repoFixture {
	t.Helper()

	repoDir := t.TempDir()
	runGit(t, log, repoDir, "init", "-b", mainBranchName)
	runGit(t, log, repoDir, "config", "user.email", "test@example.com")
	runGit(t, log, repoDir, "config", "user.name", "Test User")

	changelogPath := filepath.Join(repoDir, "CHANGELOG.md")
	writeFile(t, changelogPath, changelog)
	writeFile(t, filepath.Join(repoDir, ".gitignore"), "build/\n")
	writeFile(t, filepath.Join(repoDir, "README.md"), "test\n")

	runGit(t, log, repoDir, "add", ".")
	runGit(t, log, repoDir, "commit", "-m", "init")

	originDir := filepath.Join(t.TempDir(), "origin.git")
	if err := os.MkdirAll(originDir, 0o755); err != nil {
		t.Fatalf("create origin dir: %v", err)
	}
	runGit(t, log, originDir, "init", "--bare")
	runGit(t, log, repoDir, "remote", "add", "origin", originDir)
	runGit(t, log, repoDir, "push", "-u", "origin", mainBranchName)

	return &repoFixture{
		dir:           repoDir,
		changelogPath: changelogPath,
	}
}

func prepareStudioctlLikeLayout(t *testing.T, log internal.Logger, repoDir, componentChangelog string) {
	t.Helper()

	writeFile(
		t,
		filepath.Join(repoDir, "src", "cli", "go.mod"),
		"module altinn.studio/studioctl\n\ngo 1.22.0\n",
	)
	writeFile(
		t,
		filepath.Join(repoDir, "src", "cli", "internal", "cmd", "version.go"),
		"package cmd\n\nvar version = \"dev\"\n\nfunc Version() string { return version }\n",
	)
	writeFile(
		t,
		filepath.Join(repoDir, "src", "cli", "cmd", "studioctl", "main.go"),
		"package main\n\nimport (\n\t\"fmt\"\n\tcmd \"altinn.studio/studioctl/internal/cmd\"\n)\n\nfunc main() { fmt.Println(cmd.Version()) }\n",
	)
	writeFile(
		t,
		filepath.Join(repoDir, "src", "cli", "cmd", "studioctl", "install.sh"),
		"#!/usr/bin/env sh\nDEFAULT_VERSION=\"__STUDIOCTL_DEFAULT_VERSION__\"\nif [ \"$DEFAULT_VERSION\" = \"__STUDIOCTL_DEFAULT_VERSION__\" ]; then\n\tDEFAULT_VERSION=\"latest\"\nfi\necho \"$DEFAULT_VERSION\"\n",
	)
	writeFile(
		t,
		filepath.Join(repoDir, "src", "cli", "cmd", "studioctl", "install.ps1"),
		"$DefaultVersion = \"__STUDIOCTL_DEFAULT_VERSION__\"\nif ($DefaultVersion -eq \"__STUDIOCTL_DEFAULT_VERSION__\") { $DefaultVersion = \"latest\" }\nWrite-Host $DefaultVersion\n",
	)
	writeFile(
		t,
		filepath.Join(repoDir, "src", "Runtime", "localtest", "testdata", "data.txt"),
		"data\n",
	)
	writeFile(
		t,
		filepath.Join(repoDir, "src", "Runtime", "localtest", "infra", "config.json"),
		"{}\n",
	)
	writeFile(
		t,
		filepath.Join(repoDir, "src", "cli", "CHANGELOG.md"),
		componentChangelog,
	)

	runGit(t, log, repoDir, "add", ".")
	runGit(t, log, repoDir, "commit", "-m", "add studioctl-like layout")
	runGit(t, log, repoDir, "push", "origin", mainBranchName)
}

func assertSectionOrder(t *testing.T, content, first, second string) {
	t.Helper()

	firstIdx := strings.Index(content, first)
	secondIdx := strings.Index(content, second)
	if firstIdx == -1 || secondIdx == -1 {
		t.Fatalf(
			"missing section marker(s): first=%q idx=%d second=%q idx=%d",
			first, firstIdx, second, secondIdx,
		)
	}
	if firstIdx > secondIdx {
		t.Fatalf("section order wrong: %q appears after %q", first, second)
	}
}

func assertVersionOrder(t *testing.T, content, firstVersion, secondVersion string) {
	t.Helper()
	assertSectionOrder(t, content, sectionHeader(noPrefix(firstVersion)), sectionHeader(noPrefix(secondVersion)))
}

func assertVersionSectionContains(t *testing.T, content, version string, entries ...string) {
	t.Helper()

	section := versionSectionContent(t, content, noPrefix(version))
	for _, entry := range entries {
		if !strings.Contains(section, "- "+entry) {
			t.Fatalf("expected %s section to contain %q", noPrefix(version), entry)
		}
	}
}

func versionSectionContent(t *testing.T, content, versionNoPrefix string) string {
	t.Helper()

	header := "## [" + versionNoPrefix + "]"
	start := strings.Index(content, header)
	if start == -1 {
		t.Fatalf("missing section header %q", header)
	}

	section := content[start:]
	next := strings.Index(section[len(header):], "\n## [")
	if next == -1 {
		return section
	}
	return section[:len(header)+next]
}

type repoFile struct {
	content string
	path    string
}

type workflowScenario struct {
	t    *testing.T
	log  internal.Logger
	repo *repoFixture
	gh   *fakeGH
	git  *internal.GitCLI
}

type changelogCategory struct {
	title   string
	entries []string
}

type changelogRelease struct {
	version    string
	date       string
	categories []changelogCategory
}

func newWorkflowScenario(t *testing.T, log internal.Logger, changelog string) *workflowScenario {
	t.Helper()

	repo := createRepo(t, log, changelog)
	return &workflowScenario{
		t:    t,
		log:  log,
		repo: repo,
		gh:   &fakeGH{log: log},
		git:  internal.NewGitCLI(internal.WithWorkdir(repo.dir), internal.WithLogger(log)),
	}
}

func cat(title string, entries ...string) changelogCategory {
	return changelogCategory{title: title, entries: entries}
}

func rel(version, date string, categories ...changelogCategory) changelogRelease {
	return changelogRelease{version: version, date: date, categories: categories}
}

func noPrefix(version string) string {
	return strings.TrimPrefix(version, "v")
}

func sectionHeader(versionNoPrefix string) string {
	return "## [" + versionNoPrefix + "]"
}

func changelogDoc(unreleased []changelogCategory, releases ...changelogRelease) string {
	var b strings.Builder
	b.WriteString("# Changelog\n\n")
	b.WriteString(sectionHeader("Unreleased"))
	b.WriteString("\n")
	if len(unreleased) > 0 {
		b.WriteString("\n")
		renderCategories(&b, unreleased)
	}
	for _, release := range releases {
		b.WriteString("\n")
		b.WriteString(sectionHeader(noPrefix(release.version)))
		b.WriteString(" - ")
		b.WriteString(release.date)
		b.WriteString("\n")
		if len(release.categories) > 0 {
			b.WriteString("\n")
			renderCategories(&b, release.categories)
		}
	}
	return b.String()
}

func renderCategories(b *strings.Builder, categories []changelogCategory) {
	for i, category := range categories {
		if i > 0 {
			b.WriteString("\n")
		}
		b.WriteString("### ")
		b.WriteString(category.title)
		b.WriteString("\n")
		for _, entry := range category.entries {
			b.WriteString("- ")
			b.WriteString(entry)
			b.WriteString("\n")
		}
	}
}

func (s *workflowScenario) changelogFile(content string) repoFile {
	s.t.Helper()
	return repoFile{path: s.repo.changelogPath, content: content}
}

func (s *workflowScenario) landFeature(featureBranch, commitMsg string, files ...repoFile) {
	s.t.Helper()
	runGit(s.t, s.log, s.repo.dir, "checkout", mainBranchName)
	runGit(s.t, s.log, s.repo.dir, "pull", "origin", mainBranchName)
	runGit(s.t, s.log, s.repo.dir, "checkout", "-b", featureBranch)
	for _, file := range files {
		writeFile(s.t, file.path, file.content)
	}
	runGit(s.t, s.log, s.repo.dir, "add", ".")
	runGit(s.t, s.log, s.repo.dir, "commit", "-m", commitMsg)
	runGit(s.t, s.log, s.repo.dir, "checkout", mainBranchName)
	squashMergeBranch(s.t, s.log, s.repo.dir, featureBranch, "Merge "+featureBranch)
	runGit(s.t, s.log, s.repo.dir, "push", "origin", mainBranchName)
}

func (s *workflowScenario) prepareAndMerge(version, expectedBase string) string {
	s.t.Helper()
	s.gh.reset()
	if err := internal.RunPrepareWithDeps(s.t.Context(), internal.PrepareRequest{
		Component:     studioctlComponent,
		Version:       version,
		ChangelogPath: "CHANGELOG.md",
		DryRun:        false,
	}, s.git, s.gh, s.log); err != nil {
		s.t.Fatalf("RunPrepare(%s) error: %v", version, err)
	}
	if !s.gh.prCreated || s.gh.prBase != expectedBase {
		s.t.Fatalf("prepare %s PR base = %q, want %q", version, s.gh.prBase, expectedBase)
	}
	prepBranch, err := s.git.CurrentBranch(s.t.Context())
	if err != nil {
		s.t.Fatalf("get prep branch for %s: %v", version, err)
	}
	if !strings.HasPrefix(prepBranch, "release-prep/") {
		s.t.Fatalf("prepare %s current branch = %q, want release-prep/*", version, prepBranch)
	}

	runGit(s.t, s.log, s.repo.dir, "checkout", expectedBase)
	runGit(s.t, s.log, s.repo.dir, "pull", "origin", expectedBase)
	squashMergeBranch(s.t, s.log, s.repo.dir, prepBranch, "Merge "+prepBranch)
	runGit(s.t, s.log, s.repo.dir, "push", "origin", expectedBase)

	return readFileContent(s.t, s.repo.changelogPath)
}

func (s *workflowScenario) backportAndMerge(commitSHA, branch, expectedBase, mergeMsg string) {
	s.t.Helper()
	s.gh.reset()
	if err := internal.RunBackportWithDeps(s.t.Context(), internal.BackportRequest{
		Component:     studioctlComponent,
		Commit:        commitSHA,
		Branch:        branch,
		ChangelogPath: "CHANGELOG.md",
		DryRun:        false,
	}, s.git, s.gh, s.log); err != nil {
		s.t.Fatalf("RunBackport(%s) error: %v", commitSHA, err)
	}
	if !s.gh.prCreated || s.gh.prBase != expectedBase {
		s.t.Fatalf("backport %s PR base = %q, want %q", branch, s.gh.prBase, expectedBase)
	}
	backportBranch := strings.TrimSpace(runGit(s.t, s.log, s.repo.dir, "rev-parse", "--abbrev-ref", "HEAD"))
	prefix := "backport/" + studioctlComponent + "-" + branch + "-"
	if !strings.HasPrefix(backportBranch, prefix) {
		s.t.Fatalf("backport branch = %q, want prefix %s", backportBranch, prefix)
	}

	runGit(s.t, s.log, s.repo.dir, "checkout", expectedBase)
	runGit(s.t, s.log, s.repo.dir, "pull", "origin", expectedBase)
	squashMergeBranch(s.t, s.log, s.repo.dir, backportBranch, mergeMsg)
	runGit(s.t, s.log, s.repo.dir, "push", "origin", expectedBase)
}

func (s *workflowScenario) headSHA() string {
	s.t.Helper()
	return strings.TrimSpace(runGit(s.t, s.log, s.repo.dir, "rev-parse", "HEAD"))
}

func (s *workflowScenario) release(version, target string, prerelease bool) {
	s.t.Helper()
	s.gh.reset()
	workflow, err := internal.NewWorkflow(
		s.t.Context(),
		internal.WorkflowConfig{
			Component:     studioctlComponent,
			Version:       version,
			ChangelogPath: s.repo.changelogPath,
			OutputDir:     "",
			RepoRoot:      s.repo.dir,
			Draft:         true,
		},
		s.git,
		s.gh,
		&fakeBuilder{log: s.log},
		s.log,
	)
	if err != nil {
		s.t.Fatalf("NewWorkflow(%s) error: %v", version, err)
	}
	if err := workflow.Run(s.t.Context()); err != nil {
		s.t.Fatalf("workflow.Run(%s) error: %v", version, err)
	}

	if !s.gh.releaseCreated {
		s.t.Fatalf("release %s: expected GitHub release creation", version)
	}
	wantTag := studioctlComponent + "/" + version
	if s.gh.releaseTag != wantTag {
		s.t.Fatalf("release %s: tag = %s, want %s", version, s.gh.releaseTag, wantTag)
	}
	if s.gh.releaseTarget != target {
		s.t.Fatalf("release %s: target = %s, want %s", version, s.gh.releaseTarget, target)
	}
	if s.gh.releasePrerelease != prerelease {
		s.t.Fatalf(
			"release %s: prerelease = %v, want %v",
			version,
			s.gh.releasePrerelease,
			prerelease,
		)
	}
}

type finalizeAndPreviewArgs struct {
	releaseV100   string
	releaseV110   string
	lineV100      string
	lineV110      string
	stableV110    string
	previewV110p1 string
	previewV110p2 string
	previewV120p1 string
	previewV120p2 string
}

func runFinalizeAndNextPreviewSequence(t *testing.T, s *workflowScenario, args finalizeAndPreviewArgs) {
	t.Helper()

	bugfix2SHA := runFinalizeV110AndFirstV120Preview(t, s, args)
	runBackportsAndSecondV120Preview(t, s, args, bugfix2SHA)
}

func runFinalizeV110AndFirstV120Preview(t *testing.T, s *workflowScenario, args finalizeAndPreviewArgs) string {
	t.Helper()

	promotedStable110 := s.prepareAndMerge(args.stableV110, args.releaseV110)
	assertVersionOrder(t, promotedStable110, args.stableV110, args.previewV110p2)
	assertVersionSectionContains(
		t, promotedStable110, args.stableV110, "Preview track feature", "Critical bugfix",
	)
	s.release(args.stableV110, args.releaseV110, false)

	s.landFeature(
		"feature/v120-preview1",
		"Prepare v1.2.0-preview.1",
		s.changelogFile(changelogDoc(
			[]changelogCategory{cat("Added", "Start v1.2 preview track")},
			rel(
				args.stableV110,
				"2025-01-05",
				cat("Added", "Preview track feature"),
				cat("Fixed", "Critical bugfix"),
			),
			rel(args.previewV110p2, "2025-01-03", cat("Fixed", "Critical bugfix")),
			rel(args.previewV110p1, "2025-01-02", cat("Added", "Preview track feature")),
		)),
	)
	promotedPreview120p1 := s.prepareAndMerge(args.previewV120p1, mainBranchName)
	assertVersionOrder(t, promotedPreview120p1, args.previewV120p1, args.stableV110)
	s.release(args.previewV120p1, mainBranchName, true)

	s.landFeature(
		"feature/v120-bugfix2",
		"Fix shared hotfix two on main",
		repoFile{
			path:    filepath.Join(s.repo.dir, "bugfix2.txt"),
			content: "fix2\n",
		},
		s.changelogFile(changelogDoc(
			[]changelogCategory{cat("Fixed", "Shared hotfix two")},
			rel(args.previewV120p1, "2025-01-06", cat("Added", "Start v1.2 preview track")),
			rel(
				args.stableV110,
				"2025-01-05",
				cat("Added", "Preview track feature"),
				cat("Fixed", "Critical bugfix"),
			),
			rel(args.previewV110p2, "2025-01-03", cat("Fixed", "Critical bugfix")),
		)),
	)
	return s.headSHA()
}

func runBackportsAndSecondV120Preview(
	t *testing.T,
	s *workflowScenario,
	args finalizeAndPreviewArgs,
	bugfix2SHA string,
) {
	t.Helper()

	s.backportAndMerge(bugfix2SHA, args.lineV100, args.releaseV100, "Merge backport v1.0 for hotfix two")
	s.backportAndMerge(bugfix2SHA, args.lineV110, args.releaseV110, "Merge backport v1.1 for hotfix two")

	promotedPreview120p2 := s.prepareAndMerge(args.previewV120p2, mainBranchName)
	assertVersionOrder(t, promotedPreview120p2, args.previewV120p2, args.previewV120p1)
	assertVersionOrder(t, promotedPreview120p2, args.previewV120p1, args.stableV110)
	s.release(args.previewV120p2, mainBranchName, true)
}

func squashMergeBranch(t *testing.T, log internal.Logger, repoDir, sourceBranch, commitMsg string) {
	t.Helper()

	runGit(t, log, repoDir, "merge", "--squash", sourceBranch)
	runGit(t, log, repoDir, "commit", "-m", commitMsg)
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

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir for file %s: %v", path, err)
	}
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
	prBase            string
	releasePrerelease bool
	releaseCreated    bool
	prCreated         bool
}

func (g *fakeGH) CreateRelease(_ context.Context, opts internal.Options) error {
	g.releaseCreated = true
	g.releaseTag = opts.Tag
	g.releaseTarget = opts.Target
	g.releasePrerelease = opts.Prerelease
	if g.log != nil {
		g.log.Info(
			"gh create release: tag=%s target=%s prerelease=%v assets=%d",
			g.releaseTag,
			g.releaseTarget,
			g.releasePrerelease,
			len(opts.Assets),
		)
	}
	return nil
}

func (g *fakeGH) CreatePR(_ context.Context, opts internal.PullRequestOptions) error {
	g.prCreated = true
	g.prBase = opts.Base
	if g.log != nil {
		g.log.Info("gh pr create: title=%s base=%s", opts.Title, g.prBase)
	}
	return nil
}

func (g *fakeGH) SetWorkdir(_ string) {}

func (g *fakeGH) reset() {
	g.releaseTag = ""
	g.releaseTarget = ""
	g.releasePrerelease = false
	g.releaseCreated = false
	g.prBase = ""
	g.prCreated = false
}

type fakeBuilder struct {
	log internal.Logger
}

func (b *fakeBuilder) Build(_ context.Context, _ *semver.Version, outputDir string) ([]string, error) {
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
