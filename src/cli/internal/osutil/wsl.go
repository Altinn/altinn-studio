package osutil

import (
	"context"
	"fmt"
	"os"
	"strings"

	"altinn.studio/devenv/pkg/processutil"
)

// IsWSL detects if running in Windows Subsystem for Linux.
func IsWSL() bool {
	if os.Getenv("WSL_DISTRO_NAME") != "" || os.Getenv("WSL_INTEROP") != "" {
		return true
	}

	data, err := os.ReadFile("/proc/version")
	if err != nil {
		return false
	}

	version := strings.ToLower(string(data))
	return strings.Contains(version, "microsoft")
}

// openWSL opens a URL in the Windows host browser from WSL.
func openWSL(_ context.Context, browserURL string) error {
	// Use cmd.exe to open URL on Windows host via WSL interop.
	// The empty string argument is the window title (required when URL contains special chars).
	// We use Background() so the browser process survives program exit
	// (CommandContext kills subprocess when context is cancelled).
	//nolint:contextcheck // intentionally detached; browserURL is validated to http/https by OpenContext.
	cmd := processutil.CommandContext(context.Background(), "cmd.exe", "/c", "start", "", browserURL)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("open browser via cmd.exe: %w", err)
	}

	go cmd.Wait() //nolint:errcheck // browser process lifecycle is not our concern

	return nil
}
