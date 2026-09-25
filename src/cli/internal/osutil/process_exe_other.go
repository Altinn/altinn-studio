//go:build !windows && !linux && !darwin

package osutil

import "errors"

var errProcessExecutableUnsupported = errors.New(
	"reading the executable of a process is not supported on this platform",
)

func processExecutable(int) (string, error) {
	return "", errProcessExecutableUnsupported
}
