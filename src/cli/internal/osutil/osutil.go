// Package osutil provides shared OS and filesystem helpers.
package osutil

import (
	"os"
	"path/filepath"
)

const fallbackCommandName = "studioctl"

// CurrentBin returns the invoked binary basename, with a stable fallback.
func CurrentBin() string {
	if len(os.Args) == 0 || os.Args[0] == "" {
		return fallbackCommandName
	}
	name := filepath.Base(os.Args[0])
	if name == "." || name == string(filepath.Separator) || name == "" {
		return fallbackCommandName
	}
	return name
}
