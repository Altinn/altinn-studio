package osutil

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
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

// ProcessRunsExecutable reports whether pid runs the executable at path.
// Use it before trusting a saved PID, because the OS can give that PID to another process.
func ProcessRunsExecutable(pid int, path string) (bool, error) {
	if pid <= 0 || path == "" {
		return false, nil
	}

	actual, err := processExecutable(pid)
	if err != nil {
		return false, err
	}
	if sameExecutablePath(actual, path) {
		return true, nil
	}
	// A path that does not resolve cannot be the executable of pid.
	if resolved, resolveErr := filepath.EvalSymlinks(path); resolveErr == nil {
		return sameExecutablePath(actual, resolved), nil
	}
	return false, nil
}

func sameExecutablePath(actual, expected string) bool {
	actual = filepath.Clean(actual)
	expected = filepath.Clean(expected)
	if runtime.GOOS == "windows" {
		return strings.EqualFold(actual, expected)
	}
	return actual == expected
}
