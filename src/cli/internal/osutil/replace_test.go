//nolint:testpackage // Tests inject retry behavior into the package-private helper.
package osutil

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestReplacePathReplacesNonEmptyDirectory(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	source := filepath.Join(root, "source")
	target := filepath.Join(root, "target")
	if err := os.Mkdir(source, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(target, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(source, "new.txt"), []byte("new"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(target, "old.txt"), []byte("old"), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := ReplacePath(source, target); err != nil {
		t.Fatalf("ReplacePath() error = %v", err)
	}
	if _, err := os.Stat(filepath.Join(target, "new.txt")); err != nil {
		t.Fatalf("replacement file missing: %v", err)
	}
	if _, err := os.Stat(filepath.Join(target, "old.txt")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("old target file still exists: %v", err)
	}
}

func TestRetryOperationRetriesTransientErrors(t *testing.T) {
	t.Parallel()

	attempts := 0
	err := retryOperation(
		func() error {
			attempts++
			if attempts < 3 {
				return os.ErrPermission
			}
			return nil
		},
		func(err error) bool { return errors.Is(err, os.ErrPermission) },
		0,
		time.Second,
	)
	if err != nil {
		t.Fatalf("retryOperation() error = %v", err)
	}
	if attempts != 3 {
		t.Fatalf("retryOperation() attempts = %d, want 3", attempts)
	}
}

func TestRetryOperationStopsOnPermanentError(t *testing.T) {
	t.Parallel()

	attempts := 0
	err := retryOperation(
		func() error {
			attempts++
			return os.ErrInvalid
		},
		func(error) bool { return false },
		0,
		time.Second,
	)
	if !errors.Is(err, os.ErrInvalid) {
		t.Fatalf("retryOperation() error = %v, want permanent error", err)
	}
	if attempts != 1 {
		t.Fatalf("retryOperation() attempts = %d, want 1", attempts)
	}
}
