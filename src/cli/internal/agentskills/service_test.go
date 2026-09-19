//nolint:testpackage // Tests exercise managed-install failure states through package-private test hooks.
package agentskills

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/config"
)

const testSkillName = "altinn-studio-apps"

func TestListAndPath(t *testing.T) {
	t.Parallel()

	service, source := newTestService(t)
	writeTestSkill(t, source, "first")

	skills, err := service.List()
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if len(skills) != 1 {
		t.Fatalf("List() returned %d skills, want 1", len(skills))
	}
	if skills[0].Name != testSkillName || skills[0].Description != "Develop Altinn apps" {
		t.Fatalf("List() skill = %#v", skills[0])
	}

	path, err := service.Path(testSkillName)
	if err != nil {
		t.Fatalf("Path() error = %v", err)
	}
	if path != filepath.Join(source, testSkillName) {
		t.Fatalf("Path() = %q, want %q", path, filepath.Join(source, testSkillName))
	}
}

func TestInstallExplicitTargetIsManagedAndIdempotent(t *testing.T) {
	t.Parallel()

	service, source := newTestService(t)
	writeTestSkill(t, source, "first")
	targetRoot := filepath.Join(t.TempDir(), "skills")
	options := InstallOptions{Name: testSkillName, TargetDir: targetRoot}

	results, err := service.Install(options)
	if err != nil {
		t.Fatalf("Install() error = %v", err)
	}
	assertSingleResult(t, results, InstallStatusInstalled, filepath.Join(targetRoot, testSkillName))
	assertFileContent(t, filepath.Join(targetRoot, testSkillName, "reference.txt"), "first")
	if _, statErr := os.Stat(filepath.Join(targetRoot, testSkillName, managedMetadataFileName)); statErr != nil {
		t.Fatalf("managed metadata missing: %v", statErr)
	}

	results, err = service.Install(options)
	if err != nil {
		t.Fatalf("second Install() error = %v", err)
	}
	assertSingleResult(t, results, InstallStatusUnchanged, filepath.Join(targetRoot, testSkillName))
}

func TestInstallUpdatesOnlyUnmodifiedManagedSkill(t *testing.T) {
	t.Parallel()

	service, source := newTestService(t)
	writeTestSkill(t, source, "first")
	targetRoot := filepath.Join(t.TempDir(), "skills")
	options := InstallOptions{Name: testSkillName, TargetDir: targetRoot}
	if _, err := service.Install(options); err != nil {
		t.Fatalf("initial Install() error = %v", err)
	}

	writeTestSkill(t, source, "second")
	results, err := service.Install(options)
	if err != nil {
		t.Fatalf("update Install() error = %v", err)
	}
	assertSingleResult(t, results, InstallStatusUpdated, filepath.Join(targetRoot, testSkillName))
	assertFileContent(t, filepath.Join(targetRoot, testSkillName, "reference.txt"), "second")

	writeFile(t, filepath.Join(targetRoot, testSkillName, "reference.txt"), "user edit")
	writeTestSkill(t, source, "third")
	_, err = service.Install(options)
	if !errors.Is(err, ErrModifiedTarget) {
		t.Fatalf("modified Install() error = %v, want ErrModifiedTarget", err)
	}
	assertFileContent(t, filepath.Join(targetRoot, testSkillName, "reference.txt"), "user edit")
}

func TestInstallRefusesUnmanagedTarget(t *testing.T) {
	t.Parallel()

	service, source := newTestService(t)
	writeTestSkill(t, source, "source")
	targetRoot := filepath.Join(t.TempDir(), "skills")
	writeFile(t, filepath.Join(targetRoot, testSkillName, "SKILL.md"), "user-owned")

	_, err := service.Install(InstallOptions{Name: testSkillName, TargetDir: targetRoot})
	if !errors.Is(err, ErrUnmanagedTarget) {
		t.Fatalf("Install() error = %v, want ErrUnmanagedTarget", err)
	}
	assertFileContent(t, filepath.Join(targetRoot, testSkillName, "SKILL.md"), "user-owned")
}

func TestInstallRepoScopeUsesRepositoryRoot(t *testing.T) {
	t.Parallel()

	service, source := newTestService(t)
	writeTestSkill(t, source, "source")
	repo := t.TempDir()
	writeFile(t, filepath.Join(repo, ".git"), "gitdir: elsewhere")
	nested := filepath.Join(repo, "src", "nested")
	if err := os.MkdirAll(nested, 0o755); err != nil {
		t.Fatal(err)
	}

	results, err := service.Install(InstallOptions{
		Name:       testSkillName,
		Harness:    HarnessCodex,
		Scope:      ScopeRepo,
		WorkingDir: nested,
	})
	if err != nil {
		t.Fatalf("Install() error = %v", err)
	}
	want := filepath.Join(repo, ".agents", "skills", testSkillName)
	assertSingleResult(t, results, InstallStatusInstalled, want)
}

func TestInstallAutoDetectsHarnessDirectories(t *testing.T) {
	service, source := newTestService(t)
	writeTestSkill(t, source, "source")
	userHome := t.TempDir()
	service.homeDir = func() (string, error) { return userHome, nil }
	t.Setenv("PATH", "")
	if err := os.MkdirAll(filepath.Join(userHome, ".claude"), 0o755); err != nil {
		t.Fatal(err)
	}

	results, err := service.Install(InstallOptions{Name: testSkillName})
	if err != nil {
		t.Fatalf("Install() error = %v", err)
	}
	assertSingleResult(
		t,
		results,
		InstallStatusInstalled,
		filepath.Join(userHome, ".claude", "skills", testSkillName),
	)
}

func TestInstallAllValidatesEveryTargetBeforeWriting(t *testing.T) {
	t.Parallel()

	service, source := newTestService(t)
	writeTestSkill(t, source, "source")
	userHome := t.TempDir()
	service.homeDir = func() (string, error) { return userHome, nil }
	unmanaged := filepath.Join(userHome, ".claude", "skills", testSkillName, "SKILL.md")
	writeFile(t, unmanaged, "user-owned")

	_, err := service.Install(InstallOptions{Name: testSkillName, Harness: HarnessAll})
	if !errors.Is(err, ErrUnmanagedTarget) {
		t.Fatalf("Install() error = %v, want ErrUnmanagedTarget", err)
	}
	if _, err := os.Stat(filepath.Join(userHome, ".agents", "skills", testSkillName)); !os.IsNotExist(err) {
		t.Fatalf("Codex target was written before validation completed: %v", err)
	}
}

func TestInstallWithoutDetectedHarnessExplainsOverride(t *testing.T) {
	service, source := newTestService(t)
	writeTestSkill(t, source, "source")
	service.homeDir = func() (string, error) { return t.TempDir(), nil }
	t.Setenv("PATH", "")

	_, err := service.Install(InstallOptions{Name: testSkillName})
	if !errors.Is(err, ErrNoHarnessDetected) {
		t.Fatalf("Install() error = %v, want ErrNoHarnessDetected", err)
	}
}

func newTestService(t *testing.T) (*Service, string) {
	t.Helper()
	cfg := &config.Config{Home: t.TempDir(), Version: config.NewVersion("v1.2.3")}
	source := cfg.AgentSkillsDir()
	return &Service{
		cfg:     cfg,
		homeDir: func() (string, error) { return t.TempDir(), nil },
	}, source
}

func writeTestSkill(t *testing.T, root, reference string) {
	t.Helper()
	skill := "---\nname: " + testSkillName + "\ndescription: Develop Altinn apps\n---\n\n# Test skill\n"
	writeFile(t, filepath.Join(root, testSkillName, "SKILL.md"), skill)
	writeFile(t, filepath.Join(root, testSkillName, "reference.txt"), reference)
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

func assertFileContent(t *testing.T, path, want string) {
	t.Helper()
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%q) error = %v", path, err)
	}
	if string(content) != want {
		t.Fatalf("ReadFile(%q) = %q, want %q", path, content, want)
	}
}

func assertSingleResult(t *testing.T, results []InstallResult, status InstallStatus, path string) {
	t.Helper()
	if len(results) != 1 {
		t.Fatalf("Install() returned %d results, want 1", len(results))
	}
	if results[0].Status != status || results[0].Path != path {
		t.Fatalf("Install() result = %#v, want status %q and path %q", results[0], status, path)
	}
}
