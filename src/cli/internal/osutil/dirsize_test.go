package osutil_test

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"altinn.studio/studioctl/internal/osutil"
)

func writeSizedFile(t *testing.T, path string, size int) {
	t.Helper()

	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	if err := os.WriteFile(path, make([]byte, size), 0o600); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
}

func assertDirSize(t *testing.T, root string, want int64) {
	t.Helper()

	got, err := osutil.DirSize(root)
	if err != nil {
		t.Fatalf("DirSize() error = %v", err)
	}
	if got != want {
		t.Fatalf("DirSize() = %d, want %d", got, want)
	}
}

func TestDirSize_SumsNestedFiles(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	writeSizedFile(t, filepath.Join(root, "top.txt"), 1)
	writeSizedFile(t, filepath.Join(root, "logs", "a.log"), 10)
	writeSizedFile(t, filepath.Join(root, "logs", "apps", "ttd", "app", "run.log"), 100)
	writeSizedFile(t, filepath.Join(root, "data", "storage", "deep", "er", "blob"), 1000)

	assertDirSize(t, root, 1111)
}

func TestDirSize_MissingRootMeasuresZero(t *testing.T) {
	t.Parallel()

	assertDirSize(t, filepath.Join(t.TempDir(), "missing"), 0)
}

func TestDirSize_RootThatIsAFileFails(t *testing.T) {
	t.Parallel()

	root := filepath.Join(t.TempDir(), "home-file")
	writeSizedFile(t, root, 3)

	if _, err := osutil.DirSize(root); err == nil {
		t.Fatal("DirSize() error = nil, want an error for a root that is not a directory")
	}
}

func TestDirSize_UnreadableSubdirectoryFails(t *testing.T) {
	t.Parallel()
	if runtime.GOOS == osutil.OSWindows {
		t.Skip("directory permission bits do not restrict reads on Windows")
	}
	if os.Geteuid() == 0 {
		t.Skip("root reads directories regardless of permission bits")
	}

	root := t.TempDir()
	writeSizedFile(t, filepath.Join(root, "open"), 1)
	locked := filepath.Join(root, "locked")
	writeSizedFile(t, filepath.Join(locked, "secret"), 100)
	if err := os.Chmod(locked, 0); err != nil {
		t.Fatalf("Chmod() error = %v", err)
	}
	t.Cleanup(func() {
		if err := os.Chmod(locked, 0o700); err != nil {
			t.Errorf("restore permissions on %s: %v", locked, err)
		}
	})

	if size, err := osutil.DirSize(root); err == nil {
		t.Fatalf("DirSize() = %d, want an error for the unreadable directory", size)
	}
}

func TestDirSize_DoesNotFollowSymlinks(t *testing.T) {
	t.Parallel()

	outside := t.TempDir()
	writeSizedFile(t, filepath.Join(outside, "big"), 5000)

	root := t.TempDir()
	writeSizedFile(t, filepath.Join(root, "a.log"), 7)
	if err := os.Symlink(outside, filepath.Join(root, "linked-dir")); err != nil {
		t.Skipf("symlinks unavailable: %v", err)
	}
	if err := os.Symlink(filepath.Join(outside, "big"), filepath.Join(root, "linked-file")); err != nil {
		t.Fatalf("Symlink() error = %v", err)
	}

	assertDirSize(t, root, 7)
}
