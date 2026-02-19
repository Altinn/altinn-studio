package osutil

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

// ErrUnsupportedPlatform is returned when the current platform is not supported.
var ErrUnsupportedPlatform = errors.New("unsupported platform")

// OpenContext opens the given URL in the default browser with context support.
func OpenContext(ctx context.Context, url string) error {
	if runtime.GOOS == "linux" && isWSL() {
		return openWSL(ctx, url)
	}

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "linux":
		cmd = exec.CommandContext(ctx, "xdg-open", url)
	case "darwin":
		cmd = exec.CommandContext(ctx, "open", url)
	case "windows":
		cmd = exec.CommandContext(ctx, "cmd", "/c", "start", "", url)
	default:
		return fmt.Errorf("%w: %s", ErrUnsupportedPlatform, runtime.GOOS)
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start browser: %w", err)
	}

	// Don't wait for browser to close - fire and forget
	go cmd.Wait() //nolint:errcheck // intentionally ignoring - browser process lifecycle is not our concern

	return nil
}

// isWSL detects if running in Windows Subsystem for Linux.
func isWSL() bool {
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
func openWSL(_ context.Context, url string) error {
	// Use cmd.exe to open URL on Windows host via WSL interop.
	// The empty string argument is the window title (required when URL contains special chars).
	// We use Background() so the browser process survives program exit
	// (CommandContext kills subprocess when context is cancelled).
	//nolint:contextcheck // intentionally detaching from parent context
	cmd := exec.CommandContext(context.Background(), "cmd.exe", "/c", "start", "", url)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("open browser via cmd.exe: %w", err)
	}

	go cmd.Wait() //nolint:errcheck // browser process lifecycle is not our concern

	return nil
}
