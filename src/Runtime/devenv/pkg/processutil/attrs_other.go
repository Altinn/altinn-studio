//go:build !windows

// Package processutil wraps process creation with platform-specific defaults.
package processutil

import "os/exec"

func applyNoWindow(_ *exec.Cmd) {}
