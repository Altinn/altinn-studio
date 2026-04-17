package self

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	installpkg "altinn.studio/studioctl/internal/install"
	"altinn.studio/studioctl/internal/osutil"
)

// InstallDir replaces targetDir with the contents of srcDir.
func InstallDir(srcDir, targetDir string, validate func(string) error) (string, error) {
	if srcDir == "" {
		return "", errInstallFileSourceRequired
	}
	if targetDir == "" {
		return "", errInstallFileTargetRequired
	}

	absSource, err := filepath.Abs(srcDir)
	if err != nil {
		return "", fmt.Errorf("resolve source directory: %w", err)
	}
	absTarget, err := filepath.Abs(targetDir)
	if err != nil {
		return "", fmt.Errorf("resolve target directory: %w", err)
	}
	err = os.MkdirAll(filepath.Dir(absTarget), osutil.DirPermDefault)
	if err != nil {
		return "", fmt.Errorf("create target parent directory: %w", err)
	}

	//nolint:gosec // G304/G703: source path is resolved from an explicit developer-supplied path.
	info, err := os.Stat(absSource)
	if err != nil {
		return "", fmt.Errorf("stat source directory: %w", err)
	}
	if !info.IsDir() {
		return "", fmt.Errorf("%w: %s", errInstallFileSourceNotDirectory, absSource)
	}

	stagingDir, err := os.MkdirTemp(filepath.Dir(absTarget), "."+filepath.Base(absTarget)+".tmp-*")
	if err != nil {
		return "", fmt.Errorf("create staging directory: %w", err)
	}

	if err := copyDirectoryContents(absSource, stagingDir); err != nil {
		return "", cleanupTempDir(stagingDir, fmt.Errorf("copy payload directory: %w", err))
	}
	if validate != nil {
		if err := validate(stagingDir); err != nil {
			return "", cleanupTempDir(stagingDir, err)
		}
	}

	if err := replacePath(stagingDir, absTarget); err != nil {
		return "", cleanupTempDir(stagingDir, err)
	}

	return absTarget, nil
}

// InstallTarGz replaces targetDir with the extracted archive contents.
func InstallTarGz(
	archivePath,
	targetDir string,
	options installpkg.ExtractTarGzOptions,
	validate func(string) error,
) (string, error) {
	if archivePath == "" {
		return "", errInstallFileSourceRequired
	}
	if targetDir == "" {
		return "", errInstallFileTargetRequired
	}

	absArchive, err := filepath.Abs(archivePath)
	if err != nil {
		return "", fmt.Errorf("resolve archive path: %w", err)
	}
	absTarget, err := filepath.Abs(targetDir)
	if err != nil {
		return "", fmt.Errorf("resolve target directory: %w", err)
	}
	err = os.MkdirAll(filepath.Dir(absTarget), osutil.DirPermDefault)
	if err != nil {
		return "", fmt.Errorf("create target parent directory: %w", err)
	}

	stagingDir, err := os.MkdirTemp(filepath.Dir(absTarget), "."+filepath.Base(absTarget)+".tmp-*")
	if err != nil {
		return "", fmt.Errorf("create staging directory: %w", err)
	}

	if err := installpkg.ExtractTarGzFile(absArchive, stagingDir, options); err != nil {
		return "", cleanupTempDir(stagingDir, fmt.Errorf("extract payload archive: %w", err))
	}
	if validate != nil {
		if err := validate(stagingDir); err != nil {
			return "", cleanupTempDir(stagingDir, err)
		}
	}

	if err := replacePath(stagingDir, absTarget); err != nil {
		return "", cleanupTempDir(stagingDir, err)
	}

	return absTarget, nil
}

func copyDirectoryContents(srcDir, dstDir string) error {
	entries, err := os.ReadDir(srcDir)
	if err != nil {
		return fmt.Errorf("read source directory: %w", err)
	}

	for _, entry := range entries {
		srcPath := filepath.Join(srcDir, entry.Name())
		dstPath := filepath.Join(dstDir, entry.Name())

		info, err := entry.Info()
		if err != nil {
			return fmt.Errorf("stat source entry %q: %w", srcPath, err)
		}

		if info.IsDir() {
			//nolint:gosec // G304/G703: destination path is derived from the staged install directory.
			if err := os.MkdirAll(dstPath, osutil.DirPermDefault); err != nil {
				return fmt.Errorf("create destination directory %q: %w", dstPath, err)
			}
			if err := copyDirectoryContents(srcPath, dstPath); err != nil {
				return err
			}
			continue
		}

		if err := copyFile(srcPath, dstPath); err != nil {
			return fmt.Errorf("copy payload file %q: %w", srcPath, err)
		}
		if runtime.GOOS != osWindows {
			//nolint:gosec // G304/G703: destination path is derived from the staged install directory.
			if err := os.Chmod(dstPath, info.Mode().Perm()); err != nil {
				return fmt.Errorf("set permissions on %q: %w", dstPath, err)
			}
		}
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
