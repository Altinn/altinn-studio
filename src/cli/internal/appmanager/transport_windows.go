//go:build windows

package appmanager

import (
	"os/exec"
	"syscall"

	"altinn.studio/devenv/pkg/processutil"
)

func applyProcessAttrs(cmd *exec.Cmd) {
	processutil.ApplyNoWindow(cmd)
	cmd.SysProcAttr.CreationFlags |= detachedProcess | syscall.CREATE_NEW_PROCESS_GROUP
}

const detachedProcess = 0x00000008
