package install

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"

	"altinn.studio/studioctl/internal/osutil"
)

var (
	errAlreadyInstalled   = errors.New("already installed")
	errSourceRequired     = errors.New("install source is required")
	errTargetRequired     = errors.New("install target is required")
	errSourceNotDirectory = errors.New("install source is not a directory")
)

func copyDir(src, dst string) error {
	walkErr := filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return fmt.Errorf("compute relative path: %w", err)
		}
		targetPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			if err := os.MkdirAll(targetPath, osutil.DirPermDefault); err != nil {
				return fmt.Errorf("create directory: %w", err)
			}
			return nil
		}

		if err := copyFile(path, targetPath); err != nil {
			return err
		}
		if runtime.GOOS != osutil.OSWindows {
			if err := os.Chmod(targetPath, info.Mode().Perm()); err != nil {
				return fmt.Errorf("preserve file mode: %w", err)
			}
		}
		return nil
	})
	if walkErr != nil {
		return fmt.Errorf("walk source directory: %w", walkErr)
	}
	return nil
}

func copyFile(src, dst string) (err error) {
	info, err := os.Stat(src)
	if err != nil {
		return fmt.Errorf("stat source file: %w", err)
	}
	return copyFileContent(src, dst, info.Mode().Perm())
}

func copyFileContent(srcPath, dstPath string, mode os.FileMode) (err error) {
	if mkdirErr := os.MkdirAll(filepath.Dir(dstPath), osutil.DirPermDefault); mkdirErr != nil {
		return fmt.Errorf("create destination parent: %w", mkdirErr)
	}

	//nolint:gosec // G304: source path comes from a validated local resource directory walk.
	src, err := os.Open(srcPath)
	if err != nil {
		return fmt.Errorf("open source: %w", err)
	}
	defer func() { err = closeWithError(src, "close source", err) }()

	//nolint:gosec // G304: destination path is derived from the configured studioctl data directory.
	dst, err := os.OpenFile(dstPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, defaultFileMode(mode))
	if err != nil {
		return fmt.Errorf("open destination: %w", err)
	}
	defer func() { err = closeWithError(dst, "close destination", err) }()

	if _, err := io.Copy(dst, src); err != nil {
		return fmt.Errorf("copy contents: %w", err)
	}

	return nil
}

func defaultFileMode(mode os.FileMode) os.FileMode {
	if mode == 0 {
		return osutil.FilePermDefault
	}
	return mode
}

func atomicCopyFile(src, dst string) (string, error) {
	if src == "" {
		return "", errSourceRequired
	}
	if dst == "" {
		return "", errTargetRequired
	}

	absSource, err := filepath.Abs(src)
	if err != nil {
		return "", fmt.Errorf("resolve source path: %w", err)
	}
	absTarget, err := filepath.Abs(dst)
	if err != nil {
		return "", fmt.Errorf("resolve target path: %w", err)
	}
	if filepath.Clean(absSource) == filepath.Clean(absTarget) {
		return absTarget, errAlreadyInstalled
	}

	if mkdirErr := os.MkdirAll(filepath.Dir(absTarget), osutil.DirPermDefault); mkdirErr != nil {
		return "", fmt.Errorf("create target directory: %w", mkdirErr)
	}

	//nolint:gosec // G304: source is resolved from caller-owned install/package input.
	srcFile, err := os.OpenFile(absSource, os.O_RDONLY, 0)
	if err != nil {
		return "", fmt.Errorf("open source: %w", err)
	}

	tmpFile, err := os.CreateTemp(filepath.Dir(absTarget), "."+filepath.Base(absTarget)+".tmp-*")
	if err != nil {
		return "", errors.Join(
			fmt.Errorf("create destination temp file: %w", err),
			closeWithError(srcFile, "close source", nil),
		)
	}
	tmpPath := tmpFile.Name()

	if _, err := io.Copy(tmpFile, srcFile); err != nil {
		return "", cleanupTempFile(
			tmpPath,
			fmt.Errorf("copy content: %w", err),
			closeWithError(srcFile, "close source", nil),
			closeWithError(tmpFile, "close destination temp file", nil),
		)
	}

	if err := closeWithError(srcFile, "close source", nil); err != nil {
		return "", cleanupTempFile(tmpPath, err, closeWithError(tmpFile, "close destination temp file", nil))
	}
	if err := closeWithError(tmpFile, "close destination temp file", nil); err != nil {
		return "", cleanupTempFile(tmpPath, err)
	}
	if err := osutil.ReplacePathAtomic(tmpPath, absTarget); err != nil {
		return "", cleanupTempFile(tmpPath, err)
	}

	return absTarget, nil
}

func installDir(srcDir, targetDir string, validate func(string) error) error {
	if srcDir == "" {
		return errSourceRequired
	}
	if targetDir == "" {
		return errTargetRequired
	}

	absSource, err := filepath.Abs(srcDir)
	if err != nil {
		return fmt.Errorf("resolve source directory: %w", err)
	}
	absTarget, err := filepath.Abs(targetDir)
	if err != nil {
		return fmt.Errorf("resolve target directory: %w", err)
	}
	if mkdirErr := os.MkdirAll(filepath.Dir(absTarget), osutil.DirPermDefault); mkdirErr != nil {
		return fmt.Errorf("create target parent directory: %w", mkdirErr)
	}

	info, err := os.Stat(absSource)
	if err != nil {
		return fmt.Errorf("stat source directory: %w", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("%w: %s", errSourceNotDirectory, absSource)
	}

	stagingDir, err := os.MkdirTemp(filepath.Dir(absTarget), "."+filepath.Base(absTarget)+".tmp-*")
	if err != nil {
		return fmt.Errorf("create staging directory: %w", err)
	}

	if err := copyDir(absSource, stagingDir); err != nil {
		return cleanupTempDir(stagingDir, fmt.Errorf("copy payload directory: %w", err))
	}
	if validate != nil {
		if err := validate(stagingDir); err != nil {
			return cleanupTempDir(stagingDir, err)
		}
	}
	if err := osutil.ReplacePath(stagingDir, absTarget); err != nil {
		return cleanupTempDir(stagingDir, err)
	}

	return nil
}

func writeFile(path, content string) error {
	return writeFileWithMode(path, content, osutil.FilePermDefault)
}

func writeFileWithMode(path, content string, mode os.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(path), osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create file parent: %w", err)
	}
	if err := os.WriteFile(path, []byte(content), mode); err != nil {
		return fmt.Errorf("write file: %w", err)
	}
	return nil
}

func cleanupTempDir(path string, errs ...error) error {
	joined := errors.Join(errs...)
	if removeErr := os.RemoveAll(path); removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
		return errors.Join(joined, fmt.Errorf("remove temp directory %q: %w", path, removeErr))
	}
	return joined
}

func cleanupTempFile(path string, errs ...error) error {
	joined := errors.Join(errs...)
	if removeErr := os.Remove(path); removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
		return errors.Join(joined, fmt.Errorf("remove temp file %q: %w", path, removeErr))
	}
	return joined
}

func closeWithError(c io.Closer, msg string, existingErr error) error {
	closeErr := c.Close()
	if closeErr == nil {
		return existingErr
	}
	if existingErr == nil {
		return fmt.Errorf("%s: %w", msg, closeErr)
	}
	return existingErr
}
