//go:build !windows

package appmanager

import (
	"os/exec"
	"syscall"
)

func applyProcessAttrs(cmd *exec.Cmd) {
	var attr syscall.SysProcAttr
	attr.Setsid = true
	cmd.SysProcAttr = &attr
}
