package apps_test

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"testing"
	"time"

	"altinn.studio/studioctl/internal/cmd/apps"
	"altinn.studio/studioctl/internal/osutil"
)

const retention = 30 * 24 * time.Hour

func retentionNow() time.Time {
	return time.Date(2026, 10, 23, 12, 0, 0, 0, time.UTC)
}

func TestDeleteExpiredLogsDeletesExpiredRunsByModTime(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	dir := filepath.Join(root, "ttd-app")
	expired := retentionNow().Add(-retention - time.Second)
	boundary := retentionNow().Add(-retention)
	recent := retentionNow().Add(-time.Hour)

	writeRetentionFile(t, dir, "2026-09-01-1.log", expired)
	writeRetentionFile(t, dir, "2026-09-01-1.json", expired)
	writeRetentionFile(t, dir, "2026-09-01-2.log", expired)
	writeRetentionFile(t, dir, "2026-09-01-3.json", expired)
	writeRetentionFile(t, dir, "2026-09-02-1.log", boundary)
	writeRetentionFile(t, dir, "2026-09-02-1.json", boundary)
	// A long run started on an old date and kept writing to its log.
	writeRetentionFile(t, dir, "2026-01-01-1.log", recent)
	writeRetentionFile(t, dir, "2026-01-01-1.json", expired)
	for _, name := range []string{"notes.log", "2026-01-01.log", "2026-01-01-0.log", "2026-01-01-1.txt", "app.json"} {
		writeRetentionFile(t, dir, name, expired)
	}

	if err := apps.DeleteExpiredLogs(root, retentionNow()); err != nil {
		t.Fatalf("DeleteExpiredLogs() error = %v", err)
	}

	assertDirFiles(t, dir,
		"2026-01-01-0.log",
		"2026-01-01-1.json",
		"2026-01-01-1.log",
		"2026-01-01-1.txt",
		"2026-01-01.log",
		"2026-09-02-1.json",
		"2026-09-02-1.log",
		"app.json",
		"notes.log",
	)
}

func TestDeleteExpiredLogsCoversEveryAppAndRemovesEmptyDirectories(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	expired := retentionNow().Add(-retention - time.Hour)
	recent := retentionNow().Add(-time.Hour)

	writeRetentionFile(t, filepath.Join(root, "ttd-gone"), "2026-08-01-1.log", expired)
	writeRetentionFile(t, filepath.Join(root, "ttd-gone"), "2026-08-01-1.json", expired)
	writeRetentionFile(t, filepath.Join(root, "ttd-mixed"), "2026-08-01-1.log", expired)
	writeRetentionFile(t, filepath.Join(root, "ttd-mixed"), "2026-10-22-1.log", recent)
	writeRetentionFile(t, filepath.Join(root, "ttd-other"), "2026-08-01-1.log", expired)
	writeRetentionFile(t, filepath.Join(root, "ttd-other"), "readme.txt", expired)
	if err := os.MkdirAll(filepath.Join(root, "ttd-empty"), osutil.DirPermOwnerOnly); err != nil {
		t.Fatalf("create empty app log directory: %v", err)
	}
	writeRetentionFile(t, root, "2026-08-01-1.log", expired)

	if err := apps.DeleteExpiredLogs(root, retentionNow()); err != nil {
		t.Fatalf("DeleteExpiredLogs() error = %v", err)
	}

	assertDirFiles(t, root, "2026-08-01-1.log", "ttd-mixed", "ttd-other")
	assertDirFiles(t, filepath.Join(root, "ttd-mixed"), "2026-10-22-1.log")
	assertDirFiles(t, filepath.Join(root, "ttd-other"), "readme.txt")
}

func TestDeleteExpiredLogsKeepsRunOfRunningProcess(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	dir := filepath.Join(root, "ttd-app")
	expired := retentionNow().Add(-retention - time.Hour)
	writeRetentionFile(t, dir, "2026-08-01-1.log", expired)
	writeRetentionMetadata(t, dir, "2026-08-01-1.json", os.Getpid(), expired)
	writeRetentionFile(t, dir, "2026-08-01-2.log", expired)
	writeRetentionMetadata(t, dir, "2026-08-01-2.json", 0, expired)

	if err := apps.DeleteExpiredLogs(root, retentionNow()); err != nil {
		t.Fatalf("DeleteExpiredLogs() error = %v", err)
	}

	assertDirFiles(t, dir, "2026-08-01-1.json", "2026-08-01-1.log")
}

func TestDeleteExpiredLogsMissingDirectory(t *testing.T) {
	t.Parallel()

	if err := apps.DeleteExpiredLogs(filepath.Join(t.TempDir(), "apps"), retentionNow()); err != nil {
		t.Fatalf("DeleteExpiredLogs() error = %v", err)
	}
}

func TestDeleteExpiredLogsContinuesPastDeleteErrors(t *testing.T) {
	t.Parallel()
	if runtime.GOOS == "windows" || os.Geteuid() == 0 {
		t.Skip("needs directory permissions that block deletion")
	}

	root := t.TempDir()
	expired := retentionNow().Add(-retention - time.Hour)
	locked := filepath.Join(root, "ttd-a")
	writeRetentionFile(t, locked, "2026-08-01-1.log", expired)
	writeRetentionFile(t, locked, "2026-08-01-1.json", expired)
	writeRetentionFile(t, locked, "2026-08-01-2.log", expired)
	writeRetentionFile(t, filepath.Join(root, "ttd-b"), "2026-08-01-1.log", expired)
	if err := os.Chmod(locked, 0o500); err != nil {
		t.Fatalf("Chmod() error = %v", err)
	}
	t.Cleanup(func() {
		if err := os.Chmod(locked, osutil.DirPermOwnerOnly); err != nil {
			t.Errorf("restore permissions: %v", err)
		}
	})

	err := apps.DeleteExpiredLogs(root, retentionNow())
	if !errors.Is(err, os.ErrPermission) {
		t.Fatalf("DeleteExpiredLogs() error = %v, want permission error", err)
	}
	if want := "app log directory ttd-a: delete 2026-08-01-1.log: permission denied"; !slices.Contains(
		strings.Split(err.Error(), "\n"),
		want,
	) {
		t.Fatalf("DeleteExpiredLogs() error = %q, want line %q", err, want)
	}

	// The metadata stays with the log it could not delete, and the other run and app are still pruned.
	assertDirFiles(t, locked, "2026-08-01-1.json", "2026-08-01-1.log", "2026-08-01-2.log")
	assertDirFiles(t, root, "ttd-a")
}

func writeRetentionFile(t *testing.T, dir, name string, modTime time.Time) {
	t.Helper()
	writeRetentionContent(t, dir, name, []byte("line\n"), modTime)
}

func writeRetentionMetadata(t *testing.T, dir, name string, processID int, modTime time.Time) {
	t.Helper()
	data, err := json.Marshal(apps.RunMetadata{ProcessID: processID})
	if err != nil {
		t.Fatalf("encode metadata: %v", err)
	}
	writeRetentionContent(t, dir, name, data, modTime)
}

func writeRetentionContent(t *testing.T, dir, name string, data []byte, modTime time.Time) {
	t.Helper()
	if err := os.MkdirAll(dir, osutil.DirPermOwnerOnly); err != nil {
		t.Fatalf("create directory: %v", err)
	}
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, data, osutil.FilePermOwnerOnly); err != nil {
		t.Fatalf("write %s: %v", name, err)
	}
	if err := os.Chtimes(path, modTime, modTime); err != nil {
		t.Fatalf("set modification time of %s: %v", name, err)
	}
}

func assertDirFiles(t *testing.T, dir string, want ...string) {
	t.Helper()
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read %s: %v", dir, err)
	}
	got := make([]string, 0, len(entries))
	for _, entry := range entries {
		got = append(got, entry.Name())
	}
	if !slices.Equal(got, want) {
		t.Fatalf("%s contains %v, want %v", filepath.Base(dir), got, want)
	}
}
