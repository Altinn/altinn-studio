//go:build windows

package processutil

import (
	"context"
	"os/exec"
	"syscall"
	"testing"
)

func TestCommandContext_HidesWindows(t *testing.T) {
	t.Parallel()

	cmd := CommandContext(context.Background(), "cmd.exe", "/c", "echo", "ok")

	if cmd.SysProcAttr == nil {
		t.Fatal("CommandContext() SysProcAttr = nil")
	}
	if !cmd.SysProcAttr.HideWindow {
		t.Fatal("CommandContext() HideWindow = false")
	}
}

func TestApplyNoWindow_PreservesCreationFlags(t *testing.T) {
	t.Parallel()

	cmd := exec.Command("cmd.exe")
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x00000008}

	ApplyNoWindow(cmd)

	if cmd.SysProcAttr.CreationFlags&0x00000008 == 0 {
		t.Fatalf("ApplyNoWindow() CreationFlags = %#x, missing existing flag", cmd.SysProcAttr.CreationFlags)
	}
}
