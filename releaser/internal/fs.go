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
