//go:build !windows

package osutil

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"golang.org/x/sys/unix"
)

const fileLockPollInterval = 100 * time.Millisecond

// FileLock is an exclusive advisory file lock.
type FileLock struct {
	file *os.File
}

// AcquireFileLock opens path and waits until an exclusive advisory lock is held.
func AcquireFileLock(ctx context.Context, path string) (*FileLock, error) {
	if err := os.MkdirAll(filepath.Dir(path), DirPermDefault); err != nil {
		return nil, fmt.Errorf("create lock directory: %w", err)
	}

	file, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, FilePermDefault)
	if err != nil {
		return nil, fmt.Errorf("open lock file: %w", err)
	}

	for {
		err = unix.Flock(int(file.Fd()), unix.LOCK_EX|unix.LOCK_NB)
		if err == nil {
			return &FileLock{file: file}, nil
		}
		if !errors.Is(err, unix.EWOULDBLOCK) && !errors.Is(err, unix.EAGAIN) {
			_ = file.Close()
			return nil, fmt.Errorf("lock file: %w", err)
		}

		timer := time.NewTimer(fileLockPollInterval)
		select {
		case <-ctx.Done():
			timer.Stop()
			_ = file.Close()
			return nil, fmt.Errorf("lock file: %w", ctx.Err())
		case <-timer.C:
		}
	}
}

// Close releases the lock and closes the lock file.
func (l *FileLock) Close() error {
	if l == nil || l.file == nil {
		return nil
	}

	err := unix.Flock(int(l.file.Fd()), unix.LOCK_UN)
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
