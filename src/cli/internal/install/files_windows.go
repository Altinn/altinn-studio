//go:build windows

package install

import (
	"errors"
	"os"

	"golang.org/x/sys/windows"
)

func isRetryableWindowsReplaceError(err error) bool {
	return errors.Is(err, os.ErrPermission) ||
		errors.Is(err, windows.ERROR_ACCESS_DENIED) ||
		errors.Is(err, windows.ERROR_SHARING_VIOLATION) ||
		errors.Is(err, windows.ERROR_LOCK_VIOLATION)
}
