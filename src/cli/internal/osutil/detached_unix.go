//go:build !windows

package osutil

import (
	"os/exec"
	"syscall"
)

// ApplyDetachedAttrs configures cmd to run independently from the parent terminal session.
func ApplyDetachedAttrs(cmd *exec.Cmd) {
	var attr syscall.SysProcAttr
	attr.Setsid = true
	cmd.SysProcAttr = &attr
}
