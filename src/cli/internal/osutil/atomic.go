package osutil

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

// AtomicWriteOptions configures WriteFileAtomic.
type AtomicWriteOptions struct {
	// Perm is the mode of the written file.
	Perm os.FileMode
	// OwnerOnly additionally applies SecureFile to the temporary file before it replaces the target, so that
	// on Windows, where modes mean nothing, the file never exists at its final path with an inherited ACL.
	OwnerOnly bool
}

// WriteFileAtomic writes data to path so that a reader never sees a partial file: the data goes to a
// temporary file in the same directory, which then replaces path in one step. The temporary file is removed
// on every failure.
func WriteFileAtomic(path string, data []byte, opts AtomicWriteOptions) (retErr error) {
	dir := filepath.Dir(path)
	tmp, err := os.CreateTemp(dir, "."+filepath.Base(path)+".tmp-*")
	if err != nil {
		return fmt.Errorf("create temporary file for %q: %w", path, err)
	}
	tmpPath := tmp.Name()
	cleanup := true
	defer func() {
		if !cleanup {
			return
		}
		if tmp != nil {
			if closeErr := tmp.Close(); closeErr != nil {
				retErr = errors.Join(retErr, fmt.Errorf("close %q: %w", tmpPath, closeErr))
			}
		}
		if removeErr := RemoveIfExists(tmpPath); removeErr != nil {
			retErr = errors.Join(retErr, removeErr)
		}
	}()

	if err := tmp.Chmod(opts.Perm); err != nil {
		return fmt.Errorf("set permissions on %q: %w", tmpPath, err)
	}
	if _, err := tmp.Write(data); err != nil {
		return fmt.Errorf("write %q: %w", tmpPath, err)
	}
	if err := tmp.Sync(); err != nil {
		return fmt.Errorf("sync %q: %w", tmpPath, err)
	}
	closeErr := tmp.Close()
	tmp = nil
	if closeErr != nil {
		return fmt.Errorf("close %q: %w", tmpPath, closeErr)
	}
	if opts.OwnerOnly {
		if err := SecureFile(tmpPath); err != nil {
			return fmt.Errorf("secure %q: %w", tmpPath, err)
		}
	}
	if err := commitAtomicWrite(tmpPath, path); err != nil {
		return err
	}
	cleanup = false
	return SyncDirIfSupported(dir)
}

func commitAtomicWrite(src, dst string) error {
	if runtime.GOOS == OSWindows {
		return ReplacePath(src, dst)
	}
	if err := os.Rename(src, dst); err != nil {
		return fmt.Errorf("rename %q to %q: %w", src, dst, err)
	}
	return nil
}

// RemoveIfExists removes path, treating a path that is already gone as done.
func RemoveIfExists(path string) error {
	err := os.Remove(path)
	if err == nil || errors.Is(err, os.ErrNotExist) {
		return nil
	}
	return fmt.Errorf("remove %q: %w", path, err)
}

// SyncDirIfSupported flushes a directory's entries to disk where the platform supports it, so that a file
// that was just renamed into it survives a crash. Windows has no directory sync.
func SyncDirIfSupported(path string) error {
	if runtime.GOOS == OSWindows {
		return nil
	}
	dir, err := os.Open(path) //nolint:gosec // The directory is the one the caller just wrote into.
	if err != nil {
		return fmt.Errorf("open directory %q: %w", path, err)
	}
	syncErr := dir.Sync()
	closeErr := dir.Close()
	if syncErr != nil {
		return errors.Join(fmt.Errorf("sync directory %q: %w", path, syncErr), closeErr)
	}
	if closeErr != nil {
		return fmt.Errorf("close directory %q: %w", path, closeErr)
	}
	return nil
}
