package internal

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

// OpenBrowser opens the given URL in the default browser.
func OpenBrowser(ctx context.Context, url string) error {
	if runtime.GOOS == "linux" && isWSL() {
		return openBrowserWSL(ctx, url)
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

	go cmd.Wait() //nolint:errcheck // browser process lifecycle is not our concern

	return nil
}

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

func openBrowserWSL(ctx context.Context, url string) error {
	cmd := exec.CommandContext(ctx, "cmd.exe", "/c", "start", "", url)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("open browser via cmd.exe: %w", err)
	}

	go cmd.Wait() //nolint:errcheck // browser process lifecycle is not our concern

	return nil
}
