package cache

import (
	"fmt"
	"os"
	"path/filepath"
)

const BinSubdir string = "bin"
const ConfigSubdir string = "config"

func EnsureCache(cachePath string) error {
	err := EnsureDirExists(cachePath)
	if err != nil {
		return err
	}

	binDir := filepath.Join(cachePath, BinSubdir)
	configDir := filepath.Join(cachePath, ConfigSubdir)

	err = EnsureDirExists(binDir)
	if err != nil {
		return err
	}
	err = EnsureDirExists(configDir)
	if err != nil {
		return err
	}
	return nil
}

func EnsureDirExists(dir string) error {
	info, err := os.Stat(dir)
	if err != nil {
		if os.IsNotExist(err) {
			if err := os.MkdirAll(dir, 0755); err != nil {
				return fmt.Errorf("failed to create directory: %w", err)
			}
			return nil
		}
		return fmt.Errorf("failed to stat path: %w", err)
	}

	if !info.IsDir() {
		return fmt.Errorf("path exists but is not a directory: %s", dir)
	}

	return nil
}
