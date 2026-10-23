package osutil

import (
	"errors"
	"fmt"
	"io/fs"
	"path/filepath"
)

var errDirSizeRootNotDir = errors.New("not a directory")

// DirSize sums the apparent sizes of the regular files under root: the bytes they hold rather than the
// blocks they occupy, and a file with several hard links counts once per link. Symbolic links are
// neither followed nor counted, so the walk never leaves root, and only directories are opened.
// Entries removed while the walk runs are skipped, as is a missing root, which measures zero. Any
// other error makes the size unknown: the walk carries on where it can, and DirSize returns the first
// error.
func DirSize(root string) (int64, error) {
	var size int64
	var firstErr error
	record := func(err error) {
		if firstErr == nil && !errors.Is(err, fs.ErrNotExist) {
			firstErr = err
		}
	}

	err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
		switch {
		case err != nil:
			record(err)
		case path == root && !entry.IsDir():
			// A PathError like the walk's own errors, so callers can report the cause alone.
			record(&fs.PathError{Op: "measure", Path: root, Err: errDirSizeRootNotDir})
		case entry.Type().IsRegular():
			info, infoErr := entry.Info()
			if infoErr != nil {
				record(infoErr)
				return nil
			}
			size += info.Size()
		}
		return nil
	})
	if err == nil {
		err = firstErr
	}
	if err != nil {
		return 0, fmt.Errorf("measure directory: %w", err)
	}
	return size, nil
}
