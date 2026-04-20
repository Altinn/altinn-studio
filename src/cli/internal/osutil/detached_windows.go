//go:build windows

package osutil

import (
	"os/exec"
	"syscall"

	"altinn.studio/devenv/pkg/processutil"
)

const detachedProcess = 0x00000008

// ApplyDetachedAttrs configures cmd to run independently from the parent console.
func ApplyDetachedAttrs(cmd *exec.Cmd) {
	processutil.ApplyNoWindow(cmd)
	cmd.SysProcAttr.CreationFlags |= detachedProcess | syscall.CREATE_NEW_PROCESS_GROUP
}
