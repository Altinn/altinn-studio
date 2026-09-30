//go:build !windows && !linux && !darwin

package osutil

import "errors"

var errProcessStartTimeUnsupported = errors.New("reading the start time of a process is not supported on this platform")

func processStartTime(int) (uint64, error) {
	return 0, errProcessStartTimeUnsupported
}
