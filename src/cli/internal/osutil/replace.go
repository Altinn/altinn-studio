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
	renameErr := os.Rename(src, dst)
	if runtime.GOOS == OSWindows && isRetryableReplaceError(renameErr) {
		if _, statErr := os.Lstat(dst); errors.Is(statErr, os.ErrNotExist) {
			renameErr = runReplaceOperation(func() error { return os.Rename(src, dst) })
		}
	}
	if renameErr == nil {
		return nil
	}
	wrappedRenameErr := fmt.Errorf("rename %q to %q: %w", src, dst, renameErr)

	backupPath, err := reserveReplaceBackupPath(dst)
	if err != nil {
		return errors.Join(wrappedRenameErr, err)
	}

	if moveErr := runReplaceOperation(func() error { return os.Rename(dst, backupPath) }); moveErr != nil {
		if errors.Is(moveErr, os.ErrNotExist) {
			return wrappedRenameErr
		}
		return errors.Join(wrappedRenameErr, fmt.Errorf("rename %q to %q: %w", dst, backupPath, moveErr))
	}
	if moveErr := runReplaceOperation(func() error { return os.Rename(src, dst) }); moveErr != nil {
		wrappedMoveErr := fmt.Errorf("rename %q to %q: %w", src, dst, moveErr)
		if restoreErr := runReplaceOperation(func() error { return os.Rename(backupPath, dst) }); restoreErr != nil {
			return errors.Join(wrappedMoveErr, fmt.Errorf("rename %q to %q: %w", backupPath, dst, restoreErr))
		}
		return wrappedMoveErr
	}
	removeErr := runReplaceOperation(func() error { return os.RemoveAll(backupPath) })
	if removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
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
		removeErr := runReplaceOperation(func() error { return RemoveIfExists(backupPath) })
		return "", errors.Join(fmt.Errorf("close %q: %w", backupPath, closeErr), removeErr)
	}
	if removeErr := runReplaceOperation(func() error { return RemoveIfExists(backupPath) }); removeErr != nil {
		return "", removeErr
	}
	return backupPath, nil
}

func runReplaceOperation(operation func() error) error {
	if runtime.GOOS != OSWindows {
		return operation()
	}
	return retryOperation(operation, isRetryableReplaceError, windowsReplaceRetryDelay, windowsReplaceRetryTimeout)
}

func retryOperation(operation func() error, retryable func(error) bool, delay, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for {
		err := operation()
		if err == nil || !retryable(err) || time.Now().After(deadline) {
			return err
		}
		time.Sleep(delay)
	}
}
