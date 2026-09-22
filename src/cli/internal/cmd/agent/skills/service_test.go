//nolint:testpackage // Tests exercise installation behavior through package-private test helpers.
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

func TestInstallExplicitTargetIsIdempotent(t *testing.T) {
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

	results, err = service.Install(options)
	if err != nil {
		t.Fatalf("second Install() error = %v", err)
	}
	assertSingleResult(t, results, InstallStatusUnchanged, filepath.Join(targetRoot, testSkillName))
}

func TestInstallSynchronizesDriftedSkill(t *testing.T) {
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
	results, err = service.Install(options)
	if err != nil {
		t.Fatalf("synchronize Install() error = %v", err)
	}
	assertSingleResult(t, results, InstallStatusUpdated, filepath.Join(targetRoot, testSkillName))
	assertFileContent(t, filepath.Join(targetRoot, testSkillName, "reference.txt"), "third")
}

func TestInstallReplacesExistingTarget(t *testing.T) {
	t.Parallel()

	service, source := newTestService(t)
	writeTestSkill(t, source, "source")
	targetRoot := filepath.Join(t.TempDir(), "skills")
	writeFile(t, filepath.Join(targetRoot, testSkillName, "SKILL.md"), "user-owned")

	results, err := service.Install(InstallOptions{Name: testSkillName, TargetDir: targetRoot})
	if err != nil {
		t.Fatalf("Install() error = %v", err)
	}
	assertSingleResult(t, results, InstallStatusUpdated, filepath.Join(targetRoot, testSkillName))
	assertFileContent(t, filepath.Join(targetRoot, testSkillName, "reference.txt"), "source")
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

func TestInstallRemovesExtraDirectory(t *testing.T) {
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

	results, err := service.Install(options)
	if err != nil {
		t.Fatalf("synchronize Install() error = %v", err)
	}
	assertSingleResult(t, results, InstallStatusUpdated, filepath.Join(targetRoot, testSkillName))
	if _, err := os.Stat(filepath.Join(targetRoot, testSkillName, "user-directory")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("extra directory still exists: %v", err)
	}
}

func TestInstallSynchronizesExecutableMode(t *testing.T) {
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

	results, err := service.Install(options)
	if err != nil {
		t.Fatalf("synchronize Install() error = %v", err)
	}
	assertSingleResult(t, results, InstallStatusUpdated, filepath.Join(targetRoot, testSkillName))
	info, err = os.Stat(targetScript)
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm() != 0o755 {
		t.Fatalf("synchronized script mode = %o, want 755", info.Mode().Perm())
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

func TestInstallAutoDetectionSynchronizesEveryTarget(t *testing.T) {
	service, source := newTestService(t)
	writeTestSkill(t, source, "source")
	userHome := t.TempDir()
	service.homeDir = func() (string, error) { return userHome, nil }
	t.Setenv("PATH", "")
	if err := os.MkdirAll(filepath.Join(userHome, ".agents"), 0o755); err != nil {
		t.Fatal(err)
	}
	existing := filepath.Join(userHome, ".claude", "skills", testSkillName, "SKILL.md")
	writeFile(t, existing, "outdated")

	results, err := service.Install(InstallOptions{Name: testSkillName})
	if err != nil {
		t.Fatalf("Install() error = %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("Install() returned %d results, want 2", len(results))
	}
	assertResult(t, results[0], HarnessCodex, InstallStatusInstalled)
	assertResult(t, results[1], HarnessClaude, InstallStatusUpdated)
	assertFileContent(t, filepath.Join(userHome, ".agents", "skills", testSkillName, "reference.txt"), "source")
	assertFileContent(t, filepath.Join(userHome, ".claude", "skills", testSkillName, "reference.txt"), "source")
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

func assertResult(t *testing.T, result InstallResult, harness string, status InstallStatus) {
	t.Helper()
	if result.Harness != harness || result.Status != status {
		t.Fatalf("Install() result = %#v, want harness %q and status %q", result, harness, status)
	}
}
