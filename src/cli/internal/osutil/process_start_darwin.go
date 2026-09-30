//go:build darwin

package osutil

import (
	"errors"
	"fmt"

	"golang.org/x/sys/unix"
)

const microsecondsPerSecond = 1_000_000

var errInvalidProcessStartTime = errors.New("invalid process start time")

func processStartTime(pid int) (uint64, error) {
	info, err := unix.SysctlKinfoProc("kern.proc.pid", pid)
	if err != nil {
		return 0, fmt.Errorf("read process info: %w", err)
	}
	start := info.Proc.P_starttime
	if start.Sec < 0 || start.Usec < 0 {
		return 0, fmt.Errorf("%w: %d.%06d", errInvalidProcessStartTime, start.Sec, start.Usec)
	}
	return uint64(start.Sec)*microsecondsPerSecond + uint64(start.Usec), nil
}
