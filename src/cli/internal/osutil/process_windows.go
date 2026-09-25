//go:build windows

package osutil

import (
	"errors"
	"fmt"
	"math"
	"os"

	"golang.org/x/sys/windows"
)

const stillActiveExitCode = 259

var errPIDExceedsWindowsLimit = errors.New("pid exceeds windows limit")

func interruptProcess(_ *os.Process, pid int) error {
	processID, err := windowsProcessID(pid)
	if err != nil {
		return err
	}
	if err := windows.GenerateConsoleCtrlEvent(windows.CTRL_BREAK_EVENT, processID); err != nil {
		return fmt.Errorf("send ctrl-break: %w", err)
	}
	return nil
}

// ProcessRunning reports whether pid is still running.
func ProcessRunning(pid int) (bool, error) {
	if pid <= 0 {
		return false, nil
	}
	processID, err := windowsProcessID(pid)
	if err != nil {
		return false, err
	}

	handle, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, processID)
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

func windowsProcessID(pid int) (uint32, error) {
	if pid < 0 || uint64(pid) > math.MaxUint32 {
		return 0, fmt.Errorf("%w: %d", errPIDExceedsWindowsLimit, pid)
	}
	return uint32(pid), nil
}

func processExecutable(pid int) (path string, err error) {
	processID, err := windowsProcessID(pid)
	if err != nil {
		return "", err
	}
	handle, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, processID)
	if err != nil {
		return "", fmt.Errorf("open process: %w", err)
	}
	defer func() {
		if closeErr := windows.CloseHandle(handle); closeErr != nil {
			err = errors.Join(err, fmt.Errorf("close process handle: %w", closeErr))
		}
	}()

	buf := make([]uint16, windows.MAX_LONG_PATH)
	size := uint32(len(buf))
	if err := windows.QueryFullProcessImageName(handle, 0, &buf[0], &size); err != nil {
		return "", fmt.Errorf("query process image name: %w", err)
	}
	return windows.UTF16ToString(buf[:size]), nil
}
