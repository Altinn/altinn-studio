//go:build windows

package osutil

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"golang.org/x/sys/windows"
)

const fileLockPollInterval = 100 * time.Millisecond

// FileLock is an exclusive advisory file lock.
type FileLock struct {
	file       *os.File
	overlapped windows.Overlapped
}

// AcquireFileLock opens path and waits until an exclusive advisory lock is held.
func AcquireFileLock(ctx context.Context, path string) (*FileLock, error) {
	if err := os.MkdirAll(filepath.Dir(path), DirPermDefault); err != nil {
		return nil, fmt.Errorf("create lock directory: %w", err)
	}

	//nolint:gosec // G304: lock path is provided by resolved studioctl config, not user content.
	file, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, FilePermDefault)
	if err != nil {
		return nil, fmt.Errorf("open lock file: %w", err)
	}

	lock := new(FileLock)
	lock.file = file
	handle := windows.Handle(file.Fd())
	flags := uint32(windows.LOCKFILE_EXCLUSIVE_LOCK | windows.LOCKFILE_FAIL_IMMEDIATELY)
	for {
		err = windows.LockFileEx(handle, flags, 0, 1, 0, &lock.overlapped)
		if err == nil {
			return lock, nil
		}
		if !errors.Is(err, windows.ERROR_LOCK_VIOLATION) {
			return nil, errors.Join(fmt.Errorf("lock file: %w", err), closeLockFile(file))
		}

		timer := time.NewTimer(fileLockPollInterval)
		select {
		case <-ctx.Done():
			timer.Stop()
			return nil, errors.Join(fmt.Errorf("lock file: %w", ctx.Err()), closeLockFile(file))
		case <-timer.C:
		}
	}
}

// Close releases the lock and closes the lock file.
func (l *FileLock) Close() error {
	if l == nil || l.file == nil {
		return nil
	}

	err := windows.UnlockFileEx(windows.Handle(l.file.Fd()), 0, 1, 0, &l.overlapped)
	closeErr := l.file.Close()
	l.file = nil
	if err != nil {
		return fmt.Errorf("unlock file: %w", err)
	}
	if closeErr != nil {
		return fmt.Errorf("close lock file: %w", closeErr)
	}
	return nil
}
