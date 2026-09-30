package osutil

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

const processPollInterval = 100 * time.Millisecond

// StopProcess asks a process to stop, then kills it if it is still running after timeout.
func StopProcess(ctx context.Context, pid int, timeout time.Duration) error {
	if pid <= 0 {
		return nil
	}

	process, err := os.FindProcess(pid)
	if err != nil {
		return fmt.Errorf("find process: %w", err)
	}

	interruptErr := interruptProcess(process, pid)
	if errors.Is(interruptErr, os.ErrProcessDone) {
		return nil
	}
	if interruptErr != nil {
		return KillProcess(pid)
	}

	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		running, runningErr := ProcessRunning(pid)
		if runningErr != nil {
			return runningErr
		}
		if !running {
			return nil
		}

		timer := time.NewTimer(processPollInterval)
		select {
		case <-ctx.Done():
			timer.Stop()
			return fmt.Errorf("stop process: %w", ctx.Err())
		case <-timer.C:
		}
	}

	return KillProcess(pid)
}

// KillProcess kills a process.
func KillProcess(pid int) error {
	if pid <= 0 {
		return nil
	}

	process, err := os.FindProcess(pid)
	if err != nil {
		return fmt.Errorf("find process: %w", err)
	}
	if err := process.Kill(); err != nil && !errors.Is(err, os.ErrProcessDone) {
		return fmt.Errorf("kill process: %w", err)
	}
	return nil
}

// IsProcessRunningExecutable reports whether pid still belongs to the program at pathToExecutable, not to another process.
func IsProcessRunningExecutable(pid int, pathToExecutable string) (bool, error) {
	if pid <= 0 || pathToExecutable == "" {
		return false, nil
	}

	actual, err := getProcessExecutablePath(pid)
	if err != nil {
		return false, err
	}
	if IsSamePath(actual, pathToExecutable) {
		return true, nil
	}
	// If the path does not resolve, we cannot confirm a match, so treat it as not the executable.
	if resolved, resolveErr := filepath.EvalSymlinks(pathToExecutable); resolveErr == nil {
		return IsSamePath(actual, resolved), nil
	}
	return false, nil
}
