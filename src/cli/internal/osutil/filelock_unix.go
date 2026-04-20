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

var errFileDescriptorOverflow = errors.New("file descriptor exceeds int range")

// FileLock is an exclusive advisory file lock.
type FileLock struct {
	file *os.File
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

	fd, err := fileDescriptor(file)
	if err != nil {
		return nil, errors.Join(err, closeLockFile(file))
	}

	for {
		err = unix.Flock(fd, unix.LOCK_EX|unix.LOCK_NB)
		if err == nil {
			return &FileLock{file: file}, nil
		}
		if !errors.Is(err, unix.EWOULDBLOCK) && !errors.Is(err, unix.EAGAIN) {
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

	fd, fdErr := fileDescriptor(l.file)
	if fdErr != nil {
		closeErr := l.file.Close()
		l.file = nil
		return errors.Join(fdErr, closeErr)
	}

	err := unix.Flock(fd, unix.LOCK_UN)
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

func fileDescriptor(file *os.File) (int, error) {
	fd := file.Fd()
	if fd > uintptr(^uint(0)>>1) {
		return 0, errFileDescriptorOverflow
	}

	return int(fd), nil
}
