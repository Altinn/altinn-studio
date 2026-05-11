package self_test

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	selfcmd "altinn.studio/studioctl/internal/cmd/self"
)

func TestExistingInstallDirUsesPath(t *testing.T) {
	dir := t.TempDir()
	binaryName := "studioctl"
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
		t.Setenv("PATHEXT", ".EXE")
	}
	binaryPath := filepath.Join(dir, binaryName)
	if err := os.WriteFile(binaryPath, []byte(""), 0o755); err != nil {
		t.Fatalf("write binary: %v", err)
	}
	t.Setenv("PATH", dir)

	got, ok := selfcmd.ExistingInstallDir()
	if !ok {
		t.Fatal("ExistingInstallDir() ok = false, want true")
	}
	if got != dir {
		t.Fatalf("ExistingInstallDir() = %q, want %q", got, dir)
	}
}

func TestExistingInstallDirResolvesSymlink(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("symlink setup requires elevated privileges on some Windows hosts")
	}

	pathDir := t.TempDir()
	targetDir := t.TempDir()
	targetPath := filepath.Join(targetDir, "studioctl")
	if err := os.WriteFile(targetPath, []byte(""), 0o755); err != nil {
		t.Fatalf("write target binary: %v", err)
	}
	if err := os.Symlink(targetPath, filepath.Join(pathDir, "studioctl")); err != nil {
		t.Fatalf("create symlink: %v", err)
	}
	t.Setenv("PATH", pathDir)

	got, ok := selfcmd.ExistingInstallDir()
	if !ok {
		t.Fatal("ExistingInstallDir() ok = false, want true")
	}
	if got != targetDir {
		t.Fatalf("ExistingInstallDir() = %q, want %q", got, targetDir)
	}
}

func TestLocationInPathFallsBackToEnvironment(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("PATH", dir)

	if !selfcmd.LocationInPath(dir, nil) {
		t.Fatal("LocationInPath() = false, want true")
	}
}
