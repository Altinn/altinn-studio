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

func assertTreeSize(t *testing.T, name string, got osutil.TreeSize, want int64) {
	t.Helper()

	if got.Err != nil {
		t.Fatalf("%s: Err = %v, want nil", name, got.Err)
	}
	if got.Bytes != want {
		t.Fatalf("%s: Bytes = %d, want %d", name, got.Bytes, want)
	}
}

func TestMeasureTree_SumsNestedFilesIntoTotalAndInnermostPart(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	writeSizedFile(t, filepath.Join(root, "top.txt"), 1)
	writeSizedFile(t, filepath.Join(root, "logs", "a.log"), 10)
	writeSizedFile(t, filepath.Join(root, "logs", "apps", "ttd", "app", "run.log"), 20)
	writeSizedFile(t, filepath.Join(root, "data", "infra", "x.yaml"), 100)
	writeSizedFile(t, filepath.Join(root, "data", "storage", "deep", "er", "blob"), 1000)

	total, parts := osutil.MeasureTree(root, []string{"logs", "data", "data/storage"})

	assertTreeSize(t, "total", total, 1131)
	assertTreeSize(t, "logs", parts[0], 30)
	assertTreeSize(t, "data", parts[1], 100)
	assertTreeSize(t, "data/storage", parts[2], 1000)
}

func TestMeasureTree_MissingRootAndPartsMeasureZero(t *testing.T) {
	t.Parallel()

	root := filepath.Join(t.TempDir(), "missing")

	total, parts := osutil.MeasureTree(root, []string{"logs"})

	assertTreeSize(t, "total", total, 0)
	assertTreeSize(t, "logs", parts[0], 0)
}

func TestMeasureTree_MissingPartMeasuresZero(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	writeSizedFile(t, filepath.Join(root, "logs", "a.log"), 5)

	total, parts := osutil.MeasureTree(root, []string{"logs", "bin"})

	assertTreeSize(t, "total", total, 5)
	assertTreeSize(t, "logs", parts[0], 5)
	assertTreeSize(t, "bin", parts[1], 0)
}

func TestMeasureTree_RootThatIsAFileFails(t *testing.T) {
	t.Parallel()

	root := filepath.Join(t.TempDir(), "home-file")
	writeSizedFile(t, root, 3)

	total, parts := osutil.MeasureTree(root, []string{"logs"})

	if total.Err == nil {
		t.Fatal("total.Err = nil, want an error for a root that is not a directory")
	}
	if parts[0].Err == nil {
		t.Fatal("parts[0].Err = nil, want the part to be unknown when the root cannot be walked")
	}
}

func TestMeasureTree_UnreadableSubdirectoryFailsOnlyItsPartAndTheTotal(t *testing.T) {
	t.Parallel()
	skipUnlessPermissionsApply(t)

	root := t.TempDir()
	writeSizedFile(t, filepath.Join(root, "logs", "a.log"), 10)
	writeSizedFile(t, filepath.Join(root, "data", "locked", "secret"), 100)
	writeSizedFile(t, filepath.Join(root, "data", "open"), 1)
	locked := filepath.Join(root, "data", "locked")
	lockDir(t, locked)

	total, parts := osutil.MeasureTree(root, []string{"logs", "data"})

	if total.Err == nil {
		t.Fatal("total.Err = nil, want the unreadable directory reported")
	}
	if parts[1].Err == nil {
		t.Fatal("data Err = nil, want the unreadable directory reported")
	}
	assertTreeSize(t, "logs", parts[0], 10)
}

func TestMeasureTree_PartBelowUnreadableDirectoryFails(t *testing.T) {
	t.Parallel()
	skipUnlessPermissionsApply(t)

	root := t.TempDir()
	writeSizedFile(t, filepath.Join(root, "data", "storage", "blob"), 100)
	data := filepath.Join(root, "data")
	lockDir(t, data)

	_, parts := osutil.MeasureTree(root, []string{"data/storage"})

	if parts[0].Err == nil {
		t.Fatalf("data/storage = %+v, want an error: the walk never reached it", parts[0])
	}
}

func TestMeasureTree_DoesNotFollowSymlinks(t *testing.T) {
	t.Parallel()

	outside := t.TempDir()
	writeSizedFile(t, filepath.Join(outside, "big"), 5000)

	root := t.TempDir()
	writeSizedFile(t, filepath.Join(root, "logs", "a.log"), 7)
	if err := os.Symlink(outside, filepath.Join(root, "logs", "linked-dir")); err != nil {
		t.Skipf("symlinks unavailable: %v", err)
	}
	if err := os.Symlink(filepath.Join(outside, "big"), filepath.Join(root, "linked-file")); err != nil {
		t.Fatalf("Symlink() error = %v", err)
	}
	if err := os.Symlink(outside, filepath.Join(root, "data")); err != nil {
		t.Fatalf("Symlink() error = %v", err)
	}

	total, parts := osutil.MeasureTree(root, []string{"logs", "data"})

	assertTreeSize(t, "total", total, 7)
	assertTreeSize(t, "logs", parts[0], 7)
	assertTreeSize(t, "data", parts[1], 0)
}

func TestMeasureTree_ResolvesASymlinkedRoot(t *testing.T) {
	t.Parallel()

	target := t.TempDir()
	writeSizedFile(t, filepath.Join(target, "logs", "a.log"), 9)
	root := filepath.Join(t.TempDir(), "home")
	if err := os.Symlink(target, root); err != nil {
		t.Skipf("symlinks unavailable: %v", err)
	}

	total, parts := osutil.MeasureTree(root, []string{"logs"})

	assertTreeSize(t, "total", total, 9)
	assertTreeSize(t, "logs", parts[0], 9)
}

func skipUnlessPermissionsApply(t *testing.T) {
	t.Helper()

	if runtime.GOOS == osutil.OSWindows {
		t.Skip("directory permission bits do not restrict reads on Windows")
	}
	if os.Geteuid() == 0 {
		t.Skip("root reads directories regardless of permission bits")
	}
}

// lockDir removes every permission from dir for the rest of the test, and restores them so the
// temporary directory can be removed.
func lockDir(t *testing.T, dir string) {
	t.Helper()

	if err := os.Chmod(dir, 0); err != nil {
		t.Fatalf("Chmod() error = %v", err)
	}
	t.Cleanup(func() {
		if err := os.Chmod(dir, 0o700); err != nil {
			t.Errorf("restore permissions on %s: %v", dir, err)
		}
	})
}
