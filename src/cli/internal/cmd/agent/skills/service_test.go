//nolint:testpackage // Tests exercise managed-install failure states through package-private test hooks.
package skills

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"altinn.studio/studioctl/internal/config"
)

const testSkillName = "altinn-studio-app-development"

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
	if skills[0].Name != testSkillName || skills[0].Description != "Develop Altinn Studio apps" {
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

func TestCanonicalizeResourceDirsUsesFrontmatterName(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	source := filepath.Join(root, "app-development")
	writeFile(
		t,
		filepath.Join(source, "SKILL.md"),
		"---\nname: "+testSkillName+"\ndescription: Develop Altinn Studio apps\n---\n",
	)

	if err := CanonicalizeResourceDirs(root); err != nil {
		t.Fatalf("CanonicalizeResourceDirs() error = %v", err)
	}
	if _, err := os.Stat(source); !os.IsNotExist(err) {
		t.Fatalf("source directory still exists: %v", err)
	}
	if _, err := os.Stat(filepath.Join(root, testSkillName, "SKILL.md")); err != nil {
		t.Fatalf("canonical skill missing: %v", err)
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

func TestInstallRefusesTargetOverlappingSource(t *testing.T) {
	t.Parallel()

	t.Run("same directory", func(t *testing.T) {
		t.Parallel()

		service, source := newTestService(t)
		writeTestSkill(t, source, "source")
		assertOverlappingTargetRejected(t, service, source)
	})
	t.Run("nested directory", func(t *testing.T) {
		t.Parallel()

		service, source := newTestService(t)
		writeTestSkill(t, source, "source")
		assertOverlappingTargetRejected(t, service, filepath.Join(source, testSkillName))
	})
}

func TestInstallRefusesSymlinkedTargetInsideSource(t *testing.T) {
	t.Parallel()

	service, source := newTestService(t)
	writeTestSkill(t, source, "source")
	skillSource := filepath.Join(source, testSkillName)
	targetRoot := filepath.Join(t.TempDir(), "skills")
	if err := os.Symlink(skillSource, targetRoot); err != nil {
		t.Skipf("create test symlink: %v", err)
	}

	_, err := service.Install(InstallOptions{Name: testSkillName, TargetDir: targetRoot})
	if !errors.Is(err, errOverlappingSkillPaths) {
		t.Fatalf("Install() error = %v, want errOverlappingSkillPaths", err)
	}
}

func TestEnsureSeparateTreesRefusesSourceInsideTarget(t *testing.T) {
	t.Parallel()

	target := t.TempDir()
	source := filepath.Join(target, "source")
	if err := os.Mkdir(source, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := ensureSeparateTrees(source, target); !errors.Is(err, errOverlappingSkillPaths) {
		t.Fatalf("ensureSeparateTrees() error = %v, want errOverlappingSkillPaths", err)
	}
}

func TestInstallDetectsEmptyDirectoryModification(t *testing.T) {
	t.Parallel()

	service, source := newTestService(t)
	writeTestSkill(t, source, "source")
	targetRoot := filepath.Join(t.TempDir(), "skills")
	options := InstallOptions{Name: testSkillName, TargetDir: targetRoot}
	if _, err := service.Install(options); err != nil {
		t.Fatalf("initial Install() error = %v", err)
	}
	if err := os.Mkdir(filepath.Join(targetRoot, testSkillName, "user-directory"), 0o755); err != nil {
		t.Fatal(err)
	}

	_, err := service.Install(options)
	if !errors.Is(err, ErrModifiedTarget) {
		t.Fatalf("modified Install() error = %v, want ErrModifiedTarget", err)
	}
}

func TestInstallDetectsNestedManagementFilenameModification(t *testing.T) {
	t.Parallel()

	service, source := newTestService(t)
	writeTestSkill(t, source, "source")
	nestedMetadata := filepath.Join("references", managedMetadataFileName)
	writeFile(t, filepath.Join(source, testSkillName, nestedMetadata), "source content")
	targetRoot := filepath.Join(t.TempDir(), "skills")
	options := InstallOptions{Name: testSkillName, TargetDir: targetRoot}
	if _, err := service.Install(options); err != nil {
		t.Fatalf("initial Install() error = %v", err)
	}
	writeFile(t, filepath.Join(targetRoot, testSkillName, nestedMetadata), "user edit")

	_, err := service.Install(options)
	if !errors.Is(err, ErrModifiedTarget) {
		t.Fatalf("modified Install() error = %v, want ErrModifiedTarget", err)
	}
}

func TestInstallPreservesAndProtectsExecutableMode(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Windows does not expose POSIX executable mode bits")
	}
	t.Parallel()

	service, source := newTestService(t)
	writeTestSkill(t, source, "source")
	scriptRel := filepath.Join("scripts", "verify.sh")
	scriptSource := filepath.Join(source, testSkillName, scriptRel)
	writeFile(t, scriptSource, "#!/bin/sh\n")
	if err := os.Chmod(scriptSource, 0o755); err != nil {
		t.Fatal(err)
	}
	targetRoot := filepath.Join(t.TempDir(), "skills")
	options := InstallOptions{Name: testSkillName, TargetDir: targetRoot}
	if _, err := service.Install(options); err != nil {
		t.Fatalf("initial Install() error = %v", err)
	}
	targetScript := filepath.Join(targetRoot, testSkillName, scriptRel)
	info, err := os.Stat(targetScript)
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm() != 0o755 {
		t.Fatalf("installed script mode = %o, want 755", info.Mode().Perm())
	}
	if chmodErr := os.Chmod(targetScript, 0o644); chmodErr != nil {
		t.Fatal(chmodErr)
	}

	_, err = service.Install(options)
	if !errors.Is(err, ErrModifiedTarget) {
		t.Fatalf("modified Install() error = %v, want ErrModifiedTarget", err)
	}
}

func assertOverlappingTargetRejected(t *testing.T, service *Service, targetRoot string) {
	t.Helper()
	_, err := service.Install(InstallOptions{Name: testSkillName, TargetDir: targetRoot})
	if !errors.Is(err, errOverlappingSkillPaths) {
		t.Fatalf("Install() error = %v, want errOverlappingSkillPaths", err)
	}
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

func TestInstallAutoDetectionValidatesEveryTargetBeforeWriting(t *testing.T) {
	service, source := newTestService(t)
	writeTestSkill(t, source, "source")
	userHome := t.TempDir()
	service.homeDir = func() (string, error) { return userHome, nil }
	t.Setenv("PATH", "")
	if err := os.MkdirAll(filepath.Join(userHome, ".agents"), 0o755); err != nil {
		t.Fatal(err)
	}
	unmanaged := filepath.Join(userHome, ".claude", "skills", testSkillName, "SKILL.md")
	writeFile(t, unmanaged, "user-owned")

	_, err := service.Install(InstallOptions{Name: testSkillName})
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
	skill := "---\nname: " + testSkillName + "\ndescription: Develop Altinn Studio apps\n---\n\n# Test skill\n"
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
