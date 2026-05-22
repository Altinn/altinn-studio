//go:build windows

package install

import (
	"os"
	"path/filepath"
	"slices"
	"testing"
)

func TestUninstallBinaryAtWindowsRemovesManagedArtifactsAndEmptyInstallDir(t *testing.T) {
	dir := t.TempDir()
	execPath := filepath.Join(dir, "studioctl.exe")
	writeWindowsInstallTestFile(t, execPath)
	writeWindowsInstallTestFile(t, filepath.Join(dir, "studioctl.new.exe"))
	writeWindowsInstallTestFile(t, filepath.Join(dir, ".studioctl.exe.old-123"))
	writeWindowsInstallTestFile(t, filepath.Join(dir, ".studioctl.exe.old-456"))

	result, err := uninstallBinaryAtWindows(execPath)
	if err != nil {
		t.Fatalf("uninstallBinaryAtWindows() error = %v", err)
	}
	if result.RemovedPath != execPath {
		t.Fatalf("RemovedPath = %q, want %q", result.RemovedPath, execPath)
	}
	if result.RemovedDir != dir {
		t.Fatalf("RemovedDir = %q, want %q", result.RemovedDir, dir)
	}
	if _, err := os.Stat(dir); !os.IsNotExist(err) {
		t.Fatalf("install dir still exists after cleanup: %v", err)
	}
}

func TestUninstallBinaryAtWindowsKeepsInstallDirWithUnmanagedFile(t *testing.T) {
	dir := t.TempDir()
	execPath := filepath.Join(dir, "studioctl.exe")
	unmanagedPath := filepath.Join(dir, "notes.txt")
	writeWindowsInstallTestFile(t, execPath)
	writeWindowsInstallTestFile(t, filepath.Join(dir, "studioctl.new.exe"))
	writeWindowsInstallTestFile(t, filepath.Join(dir, ".studioctl.exe.old-123"))
	writeWindowsInstallTestFile(t, unmanagedPath)

	result, err := uninstallBinaryAtWindows(execPath)
	if err != nil {
		t.Fatalf("uninstallBinaryAtWindows() error = %v", err)
	}
	if result.RemovedDir != "" {
		t.Fatalf("RemovedDir = %q, want empty when install dir has unmanaged files", result.RemovedDir)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read install dir: %v", err)
	}
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		names = append(names, entry.Name())
	}
	if !slices.Equal(names, []string{"notes.txt"}) {
		t.Fatalf("install dir entries = %v, want only unmanaged file", names)
	}
}

func TestWindowsInstallDirArtifacts(t *testing.T) {
	got := windowsInstallDirArtifacts(`C:\Users\me\AppData\Local\Programs\studioctl\studioctl.exe`)
	wantNew := `C:\Users\me\AppData\Local\Programs\studioctl\studioctl.new.exe`
	if len(got) == 0 || got[0] != wantNew {
		t.Fatalf("windowsInstallDirArtifacts()[0] = %q, want %q", got, wantNew)
	}
}

func writeWindowsInstallTestFile(t *testing.T, path string) {
	t.Helper()

	if err := os.WriteFile(path, []byte("test"), 0o600); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}
