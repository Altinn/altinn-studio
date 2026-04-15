//go:build !windows

package processutil

import "os/exec"

func applyNoWindow(_ *exec.Cmd) {}
