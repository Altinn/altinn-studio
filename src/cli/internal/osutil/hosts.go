package osutil

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

// HostsTarget describes one system hosts file that may need localtest entries.
type HostsTarget struct {
	Label    string `json:"label"`
	Path     string `json:"path"`
	Required bool   `json:"required"`
}

// LocalHostsFileTargets returns hosts files that should be updated on the current system.
func LocalHostsFileTargets() ([]HostsTarget, error) {
	switch runtime.GOOS {
	case OSDarwin:
		return []HostsTarget{{Label: "macOS", Path: "/etc/hosts", Required: true}}, nil
	case OSLinux:
		return []HostsTarget{{Label: "Linux", Path: "/etc/hosts", Required: true}}, nil
	case OSWindows:
		path, err := windowsHostsPathNative()
		if err != nil {
			return nil, err
		}
		return []HostsTarget{{Label: "Windows", Path: path, Required: true}}, nil
	default:
		return nil, fmt.Errorf("%w: %s", ErrUnsupportedPlatform, runtime.GOOS)
	}
}

// IsPermissionError reports whether err is a filesystem permission failure.
func IsPermissionError(err error) bool {
	return errors.Is(err, os.ErrPermission)
}

func windowsHostsPathNative() (string, error) {
	systemRoot := os.Getenv("SystemRoot")
	if systemRoot == "" {
		systemRoot = os.Getenv("WINDIR")
	}
	if systemRoot == "" {
		return "", fmt.Errorf("resolve Windows SystemRoot: %w", os.ErrNotExist)
	}
	return filepath.Join(systemRoot, "System32", "drivers", "etc", "hosts"), nil
}
