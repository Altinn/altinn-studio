//nolint:testpackage // Tests package-private archive extraction helpers.
package install

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
)

func TestCreateResourcesArchiveOwnsResourcesLayout(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	outputDir := filepath.Join(dir, "dist")
	localtestDir := filepath.Join(dir, "localtest")
	writeTestFile(t, filepath.Join(localtestDir, "infra", "compose.yaml"), "services: {}")
	writeTestFile(t, filepath.Join(localtestDir, "testdata", "apps", "app.json"), "{}")
	writeTestFile(t, filepath.Join(localtestDir, "ignored.txt"), "ignored")

	serverDir := filepath.Join(dir, "published-"+resourcesServerDir)
	writeTestFile(t, filepath.Join(serverDir, config.StudioctlServerBinaryName), "binary")
	agentSkillsDir := filepath.Join(dir, "agent-skills")
	writeTestFile(t, filepath.Join(agentSkillsDir, "altinn-studio-app-development", "SKILL.md"), "skill")

	archivePath, err := CreateResourcesArchive(ResourcesArchiveOptions{
		GOOS:           osutil.OSLinux,
		GOARCH:         "amd64",
		OutputDir:      outputDir,
		ServerDir:      serverDir,
		LocaltestDir:   localtestDir,
		AgentSkillsDir: agentSkillsDir,
	})
	if err != nil {
		t.Fatalf("CreateResourcesArchive() error = %v", err)
	}
	if filepath.Base(archivePath) != "studioctl-resources-linux-amd64.tar.gz" {
		t.Fatalf("archive name = %q", filepath.Base(archivePath))
	}

	extractDir := filepath.Join(dir, "extract")
	if err := extractTarGzFile(archivePath, extractDir, extractTarGzOptions{}); err != nil {
		t.Fatalf("extractTarGzFile() error = %v", err)
	}

	assertFileContent(t, filepath.Join(extractDir, resourcesServerDir, config.StudioctlServerBinaryName), "binary")
	assertFileContent(t, filepath.Join(extractDir, "localtest", "infra", "compose.yaml"), "services: {}")
	assertFileContent(
		t,
		filepath.Join(extractDir, "agent", "skills", "altinn-studio-app-development", "SKILL.md"),
		"skill",
	)
	assertNoFile(t, filepath.Join(extractDir, "localtest", "ignored.txt"))
	// Testdata ships inside the localtest image, not in the resources archive.
	assertNoFile(t, filepath.Join(extractDir, "localtest", "testdata", "apps", "app.json"))
}

func TestInstallBundleResourcesInstallsAgentSkills(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	cfg, err := config.New(config.Flags{Home: filepath.Join(dir, "home")}, "v1.2.3")
	if err != nil {
		t.Fatalf("config.New() error = %v", err)
	}
	localtestDir := filepath.Join(dir, "localtest")
	writeTestFile(t, filepath.Join(localtestDir, "infra", "compose.yaml"), "services: {}")
	serverDir := filepath.Join(dir, "server")
	serverPath := filepath.Join(serverDir, filepath.Base(cfg.StudioctlServerBinaryPath()))
	writeTestFile(t, serverPath, "binary")
	if runtime.GOOS != osutil.OSWindows {
		if chmodErr := os.Chmod(serverPath, 0o755); chmodErr != nil {
			t.Fatal(chmodErr)
		}
	}
	agentSkillsDir := filepath.Join(dir, "agent-skills")
	writeTestFile(t, filepath.Join(agentSkillsDir, "altinn-studio-app-development", "SKILL.md"), "skill")

	archivePath, err := CreateResourcesArchive(ResourcesArchiveOptions{
		GOOS:           runtime.GOOS,
		GOARCH:         runtime.GOARCH,
		OutputDir:      filepath.Join(dir, "dist"),
		ServerDir:      serverDir,
		LocaltestDir:   localtestDir,
		AgentSkillsDir: agentSkillsDir,
	})
	if err != nil {
		t.Fatalf("CreateResourcesArchive() error = %v", err)
	}
	bundle := NewBundle("v1.2.3", "", archivePath, "")
	if err := NewService(cfg).InstallBundleResources(context.Background(), bundle); err != nil {
		t.Fatalf("InstallBundleResources() error = %v", err)
	}
	assertFileContent(t, filepath.Join(cfg.AgentSkillsDir(), "altinn-studio-app-development", "SKILL.md"), "skill")
}

func TestRemoveObsoleteTestdataDir(t *testing.T) {
	t.Parallel()

	dataDir := t.TempDir()
	stalePath := filepath.Join(dataDir, "testdata", "authorization", "roles.json")
	writeTestFile(t, stalePath, "[]")
	keptPath := filepath.Join(dataDir, "infra", "compose.yaml")
	writeTestFile(t, keptPath, "services: {}")

	if err := removeObsoleteTestdataDir(dataDir); err != nil {
		t.Fatalf("removeObsoleteTestdataDir() error = %v", err)
	}
	assertNoFile(t, filepath.Join(dataDir, "testdata"))
	assertFileContent(t, keptPath, "services: {}")

	// Removing again is a no-op once the directory is gone.
	if err := removeObsoleteTestdataDir(dataDir); err != nil {
		t.Fatalf("removeObsoleteTestdataDir() second call error = %v", err)
	}
}

func writeTestFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), osutil.DirPermDefault); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	if err := os.WriteFile(path, []byte(content), osutil.FilePermDefault); err != nil {
		t.Fatalf("writeFile() error = %v", err)
	}
}

func assertFileContent(t *testing.T, path, want string) {
	t.Helper()
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%q) error = %v", path, err)
	}
	if string(got) != want {
		t.Fatalf("ReadFile(%q) = %q, want %q", path, string(got), want)
	}
}

func assertNoFile(t *testing.T, path string) {
	t.Helper()
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("Stat(%q) error = %v, want not exists", path, err)
	}
}
