// Package browser provides cross-platform browser opening functionality.
package browser

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

// Open opens the given URL in the default browser.
// Supports Linux, macOS, Windows, and WSL (opens on Windows host).
// Returns an error if the browser could not be opened, but callers
// should typically treat this as non-fatal (user can open manually).
func Open(url string) error {
	return OpenContext(context.Background(), url)
}

// OpenContext opens the given URL in the default browser with context support.
func OpenContext(ctx context.Context, url string) error {
	// WSL detection takes priority on Linux
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
	// Check WSL environment variables (most reliable)
	if os.Getenv("WSL_DISTRO_NAME") != "" || os.Getenv("WSL_INTEROP") != "" {
		return true
	}

	// Check /proc/version for Microsoft signature
	data, err := os.ReadFile("/proc/version")
	if err != nil {
		return false
	}

	version := strings.ToLower(string(data))
	return strings.Contains(version, "microsoft")
}

// openWSL opens a URL in the Windows host browser from WSL.
func openWSL(ctx context.Context, url string) error {
	// Use PowerShell to open URL on Windows host
	// Pass URL as separate argument to avoid shell injection
	cmd := exec.CommandContext(ctx, "powershell.exe", "-Command", "Start-Process", url)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("open browser via powershell: %w", err)
	}

	go cmd.Wait() //nolint:errcheck // browser process lifecycle is not our concern

	return nil
}
