//go:build darwin

package osutil

import (
	"bytes"
	"errors"
	"fmt"

	"golang.org/x/sys/unix"
)

var errInvalidProcessArguments = errors.New("invalid process arguments")

// kern.procargs2 starts with argc as a 32-bit integer, followed by the executable path.
const procArgsCountSize = 4

func processExecutable(pid int) (string, error) {
	args, err := unix.SysctlRaw("kern.procargs2", pid)
	if err != nil {
		return "", fmt.Errorf("read process arguments: %w", err)
	}
	if len(args) <= procArgsCountSize {
		return "", errInvalidProcessArguments
	}
	path, _, found := bytes.Cut(args[procArgsCountSize:], []byte{0})
	if !found || len(path) == 0 {
		return "", errInvalidProcessArguments
	}
	return string(path), nil
}
