//go:build windows

package appmanager

import (
	"os/exec"
	"syscall"
)

func applyProcessAttrs(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: detachedProcess | syscall.CREATE_NEW_PROCESS_GROUP,
	}
}

const detachedProcess = 0x00000008
