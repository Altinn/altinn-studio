//go:build windows

package install

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/sys/windows"
)

func isRetryableWindowsReplaceError(err error) bool {
	return errors.Is(err, os.ErrPermission) ||
		errors.Is(err, windows.ERROR_ACCESS_DENIED) ||
		errors.Is(err, windows.ERROR_SHARING_VIOLATION) ||
		errors.Is(err, windows.ERROR_LOCK_VIOLATION)
}

func uninstallBinaryAtWindows(execPath string) (UninstallResult, error) {
	if err := os.Remove(execPath); err != nil {
		if isRetryableWindowsReplaceError(err) {
			return UninstallResult{}, fmt.Errorf(
				"%w: %s is still running or locked",
				errUninstallUnsupported,
				execPath,
			)
		}
		return UninstallResult{}, fmt.Errorf("remove binary %q: %w", execPath, err)
	}

	removedDir, err := cleanupWindowsInstallDir(execPath)
	if err != nil {
		return UninstallResult{}, err
	}

	return UninstallResult{
		RemovedPath: execPath,
		RemovedDir:  removedDir,
	}, nil
}

func cleanupWindowsInstallDir(execPath string) (string, error) {
	dir := filepath.Dir(execPath)
	for _, path := range windowsInstallDirArtifacts(execPath) {
		if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
			return "", fmt.Errorf("remove managed install artifact %q: %w", path, err)
		}
	}

	if err := os.Remove(dir); err != nil {
		if errors.Is(err, os.ErrNotExist) || errors.Is(err, windows.ERROR_DIR_NOT_EMPTY) {
			return "", nil
		}
		return "", fmt.Errorf("remove empty install directory %q: %w", dir, err)
	}
	return dir, nil
}

func windowsInstallDirArtifacts(execPath string) []string {
	dir := filepath.Dir(execPath)
	base := filepath.Base(execPath)
	ext := filepath.Ext(base)
	name := strings.TrimSuffix(base, ext)

	artifacts := []string{filepath.Join(dir, name+".new"+ext)}
	matches, err := filepath.Glob(filepath.Join(dir, "."+base+".old-*"))
	if err == nil {
		artifacts = append(artifacts, matches...)
	}
	return artifacts
}
