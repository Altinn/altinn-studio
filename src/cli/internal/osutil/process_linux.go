//go:build linux

package osutil

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"strconv"
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
		if zombie, zombieErr := processZombie(pid); zombie || zombieErr != nil {
			return false, zombieErr
		}
		return true, nil
	case errors.Is(err, syscall.ESRCH), errors.Is(err, os.ErrProcessDone):
		return false, nil
	case errors.Is(err, syscall.EPERM):
		return true, nil
	default:
		return false, fmt.Errorf("signal process: %w", err)
	}
}

func processZombie(pid int) (bool, error) {
	status, err := os.ReadFile("/proc/" + strconv.Itoa(pid) + "/status")
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return false, nil
		}
		return false, fmt.Errorf("read process status: %w", err)
	}

	for line := range bytes.SplitSeq(status, []byte{'\n'}) {
		if !bytes.HasPrefix(line, []byte("State:")) {
			continue
		}

		return bytes.Contains(line, []byte("(zombie)")) || bytes.Contains(line, []byte("\tZ")), nil
	}

	return false, nil
}
