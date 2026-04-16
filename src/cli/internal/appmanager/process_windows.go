//go:build windows

package appmanager

import (
	"errors"
	"fmt"

	"golang.org/x/sys/windows"
)

const stillActiveExitCode = 259

var errPIDExceedsWindowsLimit = errors.New("pid exceeds windows limit")

func isProcessRunning(pid int) (bool, error) {
	if pid <= 0 {
		return false, nil
	}
	if pid > int(^uint32(0)) {
		return false, fmt.Errorf("%w: %d", errPIDExceedsWindowsLimit, pid)
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

	var exitCode uint32
	if err := windows.GetExitCodeProcess(handle, &exitCode); err != nil {
		closeErr := windows.CloseHandle(handle)
		if closeErr != nil {
			return false, errors.Join(
				fmt.Errorf("get exit code: %w", err),
				fmt.Errorf("close process handle: %w", closeErr),
			)
		}
		return false, fmt.Errorf("get exit code: %w", err)
	}
	if err := windows.CloseHandle(handle); err != nil {
		return false, fmt.Errorf("close process handle: %w", err)
	}

	return exitCode == stillActiveExitCode, nil
}
