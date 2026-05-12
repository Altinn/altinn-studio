// Package osutil provides shared OS and filesystem helpers.
package osutil

import (
	"os"
	"path/filepath"
	"strings"
)

const fallbackCommandName = "studioctl"

const (
	// OSLinux is the runtime.GOOS value for Linux.
	OSLinux = "linux"
	// OSDarwin is the runtime.GOOS value for macOS.
	OSDarwin = "darwin"
	// OSWindows is the runtime.GOOS value for Windows.
	OSWindows = "windows"
)

// CurrentBin returns the invoked binary basename, with a stable fallback.
func CurrentBin() string {
	if len(os.Args) == 0 || os.Args[0] == "" {
		return fallbackCommandName
	}
	name := displayCommandName(filepath.Base(os.Args[0]))
	if name == "." || name == string(filepath.Separator) || name == "" {
		return fallbackCommandName
	}
	return name
}

// CurrentBinPath returns the current executable path when available, with a stable fallback.
func CurrentBinPath() string {
	path, err := os.Executable()
	if err == nil && path != "" {
		return path
	}
	if len(os.Args) == 0 || os.Args[0] == "" {
		return fallbackCommandName
	}
	if filepath.IsAbs(os.Args[0]) {
		return os.Args[0]
	}
	abs, err := filepath.Abs(os.Args[0])
	if err != nil || abs == "" {
		return os.Args[0]
	}
	return abs
}

func displayCommandName(name string) string {
	if strings.EqualFold(filepath.Ext(name), ".exe") {
		return strings.TrimSuffix(name, filepath.Ext(name))
	}
	return name
}
