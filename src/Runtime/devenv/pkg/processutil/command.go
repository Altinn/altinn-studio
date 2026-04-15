package processutil

import (
	"context"
	"os/exec"
)

// CommandContext creates a command with platform-specific process defaults.
func CommandContext(ctx context.Context, name string, args ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, name, args...)
	ApplyNoWindow(cmd)
	return cmd
}

// ApplyNoWindow configures a command so it does not create a console window on Windows.
func ApplyNoWindow(cmd *exec.Cmd) {
	applyNoWindow(cmd)
}
