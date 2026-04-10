//go:build windows

package appmanager

import (
	"os/exec"
	"syscall"
)

func applyProcessAttrs(cmd *exec.Cmd) {
	var attr syscall.SysProcAttr
	attr.HideWindow = true
	attr.CreationFlags = detachedProcess | syscall.CREATE_NEW_PROCESS_GROUP
	cmd.SysProcAttr = &attr
}

const detachedProcess = 0x00000008
