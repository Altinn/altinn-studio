//go:build windows

package install

import (
	"errors"
	"fmt"
	"os"

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

	return UninstallResult{RemovedPath: execPath}, nil
}
