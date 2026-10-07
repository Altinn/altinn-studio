//go:build windows

package osutil

import (
	"errors"
	"os"

	"golang.org/x/sys/windows"
)

func isRetryableReplaceError(err error) bool {
	return errors.Is(err, os.ErrPermission) ||
		errors.Is(err, windows.ERROR_ACCESS_DENIED) ||
		errors.Is(err, windows.ERROR_SHARING_VIOLATION) ||
		errors.Is(err, windows.ERROR_LOCK_VIOLATION)
}
