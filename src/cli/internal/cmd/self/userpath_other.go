//go:build !windows

package self

import (
	"errors"

	"altinn.studio/studioctl/internal/ui"
)

var errUserPathUnsupported = errors.New("changing the user PATH is only supported on Windows")

// AddToUserPath is only supported on Windows.
func AddToUserPath(string, *ui.Output) (bool, error) {
	return false, errUserPathUnsupported
}
