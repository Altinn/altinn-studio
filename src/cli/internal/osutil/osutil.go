// Package osutil provides shared OS and filesystem helpers.
package osutil

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

const fallbackCommandName = "studioctl"

const (
	// DisableTerminalDecorationsEnv disables ANSI colors, animated spinners, and Unicode status markers.
	DisableTerminalDecorationsEnv = "STUDIOCTL_DISABLE_TERMINAL_DECORATIONS"
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

// IsSamePath reports whether two paths are equal after filepath.Clean. It does not resolve symbolic links.
// On Windows, the comparison ignores case, because Windows paths are not case-sensitive.
func IsSamePath(left, right string) bool {
	left = filepath.Clean(left)
	right = filepath.Clean(right)
	if runtime.GOOS == OSWindows {
		return strings.EqualFold(left, right)
	}
	return left == right
}

func displayCommandName(name string) string {
	if strings.EqualFold(filepath.Ext(name), ".exe") {
		return strings.TrimSuffix(name, filepath.Ext(name))
	}
	return name
}
