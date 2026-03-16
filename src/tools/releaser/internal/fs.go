package internal

import (
	"fmt"
	"io"
	"os"
	"path/filepath"

	"altinn.studio/releaser/internal/perm"
)

// EnsureDir creates a directory and all parent directories if they don't exist.
func EnsureDir(path string) error {
	if err := os.MkdirAll(path, perm.DirPermDefault); err != nil {
		return fmt.Errorf("create directory %s: %w", path, err)
	}
	return nil
}

// EnsureCleanDir creates the directory when missing and removes all existing contents.
func EnsureCleanDir(path string) error {
	if path == "" {
		return fmt.Errorf("%w: %s", errUnsafeCleanDirPath, path)
	}
	cleanPath := filepath.Clean(path)
	if isUnsafeCleanDirPath(cleanPath) {
		return fmt.Errorf("%w: %s", errUnsafeCleanDirPath, path)
	}
	if err := EnsureDir(cleanPath); err != nil {
		return err
	}

	entries, err := os.ReadDir(cleanPath)
	if err != nil {
		return fmt.Errorf("read directory %s: %w", cleanPath, err)
	}

	for _, entry := range entries {
		target := filepath.Join(cleanPath, entry.Name())
		if err := os.RemoveAll(target); err != nil {
			return fmt.Errorf("remove %s: %w", target, err)
		}
	}
	return nil
}

func isUnsafeCleanDirPath(cleanPath string) bool {
	if cleanPath == "." || cleanPath == ".." || cleanPath == string(filepath.Separator) {
		return true
	}
	return isWindowsVolumeRootPath(cleanPath)
}

func isWindowsVolumeRootPath(cleanPath string) bool {
	volume := filepath.VolumeName(cleanPath)
	if volume != "" {
		return cleanPath == volume || cleanPath == volume+`\` || cleanPath == volume+"/"
	}

	// filepath.VolumeName("C:\\") is empty on non-Windows, so guard this literal form too.
	if len(cleanPath) < 2 || len(cleanPath) > 3 || cleanPath[1] != ':' {
		return false
	}
	drive := cleanPath[0]
	if (drive < 'A' || drive > 'Z') && (drive < 'a' || drive > 'z') {
		return false
	}
	if len(cleanPath) == 2 {
		return true
	}
	return cleanPath[2] == '\\' || cleanPath[2] == '/'
}

// CopyFile copies a file from src to dst, creating parent directories as needed.
func CopyFile(src, dst string) (err error) {
	//nolint:gosec // G304: src path is from trusted dev tooling input
	srcFile, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("open source file: %w", err)
	}
	defer func() { err = closeWithError(srcFile, "close source", err) }()

	srcInfo, err := srcFile.Stat()
	if err != nil {
		return fmt.Errorf("stat source file: %w", err)
	}

	if ensureErr := EnsureDir(filepath.Dir(dst)); ensureErr != nil {
		return fmt.Errorf("create destination directory: %w", ensureErr)
	}

	//nolint:gosec // G304: dst path is from trusted dev tooling input
	dstFile, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, srcInfo.Mode())
	if err != nil {
		return fmt.Errorf("create destination file: %w", err)
	}
	defer func() { err = closeWithError(dstFile, "close destination", err) }()

	if _, copyErr := io.Copy(dstFile, srcFile); copyErr != nil {
		return fmt.Errorf("copy file content: %w", copyErr)
	}

	return nil
}
