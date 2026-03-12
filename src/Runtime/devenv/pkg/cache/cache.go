// Package cache provides helpers for creating and validating local cache directories.
package cache

import (
	"errors"
	"fmt"
	"os"
)

const dirPermDefault = 0o750

var errPathNotDirectory = errors.New("path exists but is not a directory")

// EnsureCache creates the cache directory when needed.
func EnsureCache(cachePath string) error {
	err := EnsureDirExists(cachePath)
	if err != nil {
		return err
	}
	return nil
}

// EnsureDirExists creates a directory path if it does not exist.
func EnsureDirExists(dir string) error {
	info, err := os.Stat(dir)
	if err != nil {
		if os.IsNotExist(err) {
			if mkdirErr := os.MkdirAll(dir, dirPermDefault); mkdirErr != nil {
				return fmt.Errorf("failed to create directory: %w", mkdirErr)
			}
			return nil
		}
		return fmt.Errorf("failed to stat path: %w", err)
	}

	if !info.IsDir() {
		return fmt.Errorf("%w: %s", errPathNotDirectory, dir)
	}

	return nil
}
