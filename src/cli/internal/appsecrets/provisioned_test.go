package appsecrets_test

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"altinn.studio/studioctl/internal/appsecrets"
	"altinn.studio/studioctl/internal/osutil"
)

func TestEnsureDir_CreatesTheDirectoryAndItsParents(t *testing.T) {
	t.Parallel()

	dir := filepath.Join(t.TempDir(), "apps", "ttd", "test-app", "secrets")
	if err := appsecrets.EnsureDir(dir); err != nil {
		t.Fatalf("EnsureDir() error = %v", err)
	}

	info, err := os.Stat(dir)
	if err != nil || !info.IsDir() {
		t.Fatalf("%s is not a directory: %v", dir, err)
	}
	assertOwnerOnlyDir(t, dir)
}

// A directory left behind by an earlier studioctl, or created by hand under the default umask, is listable
// by everyone on the machine - and its file names say which integrations the app has credentials for.
// MkdirAll would leave such a directory as it found it, so the mode is tightened on every run.
func TestEnsureDir_TightensADirectoryThatIsTooOpen(t *testing.T) {
	t.Parallel()

	if runtime.GOOS == osutil.OSWindows {
		t.Skip("permission bits are not the access control on Windows")
	}

	dir := filepath.Join(t.TempDir(), "secrets")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	if err := os.Chmod(dir, 0o755); err != nil {
		t.Fatalf("Chmod() error = %v", err)
	}

	if err := appsecrets.EnsureDir(dir); err != nil {
		t.Fatalf("EnsureDir() error = %v", err)
	}

	assertOwnerOnlyDir(t, dir)
}

func TestEnsureDir_LeavesAnOwnerOnlyDirectoryAlone(t *testing.T) {
	t.Parallel()

	if runtime.GOOS == osutil.OSWindows {
		t.Skip("permission bits are not the access control on Windows")
	}

	dir := filepath.Join(t.TempDir(), "secrets")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	before, statErr := os.Stat(dir)
	if statErr != nil {
		t.Fatalf("Stat() error = %v", statErr)
	}

	if err := appsecrets.EnsureDir(dir); err != nil {
		t.Fatalf("EnsureDir() error = %v", err)
	}

	after, statErr := os.Stat(dir)
	if statErr != nil {
		t.Fatalf("Stat() error = %v", statErr)
	}
	if after.Mode() != before.Mode() {
		t.Fatalf("mode = %v, want it left at %v", after.Mode(), before.Mode())
	}
}

func TestEnsureDir_FailsWhenTheDirectoryCannotBeCreated(t *testing.T) {
	t.Parallel()

	// A file where a parent directory should be: the one failure every caller has to report rather than
	// carry on without a secrets directory.
	blocker := filepath.Join(t.TempDir(), "apps")
	if err := os.WriteFile(blocker, []byte("not a directory"), 0o600); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}

	err := appsecrets.EnsureDir(filepath.Join(blocker, "ttd", "test-app", "secrets"))
	if err == nil {
		t.Fatal("EnsureDir() error = nil, want an error")
	}
}

func assertOwnerOnlyDir(t *testing.T, dir string) {
	t.Helper()

	if runtime.GOOS == osutil.OSWindows {
		return
	}
	info, err := os.Stat(dir)
	if err != nil {
		t.Fatalf("Stat() error = %v", err)
	}
	if mode := info.Mode().Perm(); mode != 0o700 {
		t.Fatalf("mode = %#o, want 0700", mode)
	}
}
