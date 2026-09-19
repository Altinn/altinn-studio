package osutil

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"
)

const (
	windowsReplaceRetryDelay   = 100 * time.Millisecond
	windowsReplaceRetryTimeout = 5 * time.Second
)

// ReplacePath moves src onto dst, moving an existing target aside first when a direct rename cannot replace it.
// Transient Windows file-locking errors are retried.
func ReplacePath(src, dst string) error {
	if runtime.GOOS == OSWindows {
		return retryOperation(
			func() error { return replacePathOnce(src, dst) },
			isRetryableReplaceError,
			windowsReplaceRetryDelay,
			windowsReplaceRetryTimeout,
		)
	}
	return replacePathOnce(src, dst)
}

func replacePathOnce(src, dst string) error {
	renameErr := os.Rename(src, dst)
	if renameErr == nil {
		return nil
	}
	wrappedRenameErr := fmt.Errorf("rename %q to %q: %w", src, dst, renameErr)

	backupPath, err := reserveReplaceBackupPath(dst)
	if err != nil {
		return errors.Join(wrappedRenameErr, err)
	}

	if moveErr := os.Rename(dst, backupPath); moveErr != nil {
		if errors.Is(moveErr, os.ErrNotExist) {
			return wrappedRenameErr
		}
		return errors.Join(wrappedRenameErr, fmt.Errorf("rename %q to %q: %w", dst, backupPath, moveErr))
	}
	if moveErr := os.Rename(src, dst); moveErr != nil {
		wrappedMoveErr := fmt.Errorf("rename %q to %q: %w", src, dst, moveErr)
		if restoreErr := os.Rename(backupPath, dst); restoreErr != nil {
			return errors.Join(wrappedMoveErr, fmt.Errorf("rename %q to %q: %w", backupPath, dst, restoreErr))
		}
		return wrappedMoveErr
	}
	if removeErr := os.RemoveAll(backupPath); removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
		return fmt.Errorf("remove backup %q: %w", backupPath, removeErr)
	}
	return nil
}

func reserveReplaceBackupPath(dst string) (string, error) {
	backup, err := os.CreateTemp(filepath.Dir(dst), "."+filepath.Base(dst)+".old-*")
	if err != nil {
		return "", fmt.Errorf("reserve backup path for %q: %w", dst, err)
	}
	backupPath := backup.Name()
	if closeErr := backup.Close(); closeErr != nil {
		removeErr := RemoveIfExists(backupPath)
		return "", errors.Join(fmt.Errorf("close %q: %w", backupPath, closeErr), removeErr)
	}
	if removeErr := RemoveIfExists(backupPath); removeErr != nil {
		return "", removeErr
	}
	return backupPath, nil
}

func retryOperation(
	operation func() error,
	retryable func(error) bool,
	delay time.Duration,
	timeout time.Duration,
) error {
	deadline := time.Now().Add(timeout)
	for {
		err := operation()
		if err == nil || !retryable(err) || time.Now().After(deadline) {
			return err
		}
		time.Sleep(delay)
	}
}
