//go:build !windows

package osutil

import (
	"errors"
	"fmt"
	"os"
	"syscall"
)

func interruptProcess(process *os.Process, _ int) error {
	if err := process.Signal(os.Interrupt); err != nil {
		return fmt.Errorf("interrupt process: %w", err)
	}
	return nil
}

// ProcessRunning reports whether pid is still running.
func ProcessRunning(pid int) (bool, error) {
	if pid <= 0 {
		return false, nil
	}

	process, err := os.FindProcess(pid)
	if err != nil {
		return false, fmt.Errorf("find process: %w", err)
	}

	err = process.Signal(syscall.Signal(0))
	switch {
	case err == nil:
		return true, nil
	case errors.Is(err, syscall.ESRCH), errors.Is(err, os.ErrProcessDone):
		return false, nil
	case errors.Is(err, syscall.EPERM):
		return true, nil
	default:
		return false, fmt.Errorf("signal process: %w", err)
	}
}
