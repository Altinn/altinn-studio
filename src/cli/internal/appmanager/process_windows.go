//go:build windows

package appmanager

import (
	"errors"
	"fmt"

	"golang.org/x/sys/windows"
)

const stillActiveExitCode = 259

func isProcessRunning(pid int) (bool, error) {
	if pid <= 0 {
		return false, nil
	}

	handle, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, uint32(pid))
	switch {
	case err == nil:
	case errors.Is(err, windows.ERROR_INVALID_PARAMETER):
		return false, nil
	case errors.Is(err, windows.ERROR_ACCESS_DENIED):
		return true, nil
	default:
		return false, fmt.Errorf("open process: %w", err)
	}
	defer windows.CloseHandle(handle)

	var exitCode uint32
	if err := windows.GetExitCodeProcess(handle, &exitCode); err != nil {
		return false, fmt.Errorf("get exit code: %w", err)
	}

	return exitCode == stillActiveExitCode, nil
}
