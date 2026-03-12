package osutil

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

// ErrUnsupportedPlatform is returned when the current platform is not supported.
var (
	ErrUnsupportedPlatform   = errors.New("unsupported platform")
	errBrowserURLMissingHost = errors.New("browser url is missing host")
	errUnsupportedURLScheme  = errors.New("unsupported browser url scheme")
)

// OpenContext opens the given URL in the default browser with context support.
func OpenContext(ctx context.Context, rawURL string) error {
	safeURL, err := validateBrowserURL(rawURL)
	if err != nil {
		return err
	}

	if runtime.GOOS == "linux" && isWSL() {
		return openWSL(ctx, safeURL)
	}

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "linux":
		//nolint:gosec // G204: safeURL is validated to an http/https URL before reaching the platform opener.
		cmd = exec.CommandContext(ctx, "xdg-open", safeURL)
	case "darwin":
		//nolint:gosec // G204: safeURL is validated to an http/https URL before reaching the platform opener.
		cmd = exec.CommandContext(ctx, "open", safeURL)
	case "windows":
		//nolint:gosec // G204: safeURL is validated to an http/https URL before reaching the platform opener.
		cmd = exec.CommandContext(ctx, "cmd", "/c", "start", "", safeURL)
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

func validateBrowserURL(rawURL string) (string, error) {
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return "", fmt.Errorf("parse browser url: %w", err)
	}
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return "", fmt.Errorf("%w: %s", errUnsupportedURLScheme, parsedURL.Scheme)
	}
	if parsedURL.Host == "" {
		return "", errBrowserURLMissingHost
	}
	return parsedURL.String(), nil
}

// openWSL opens a URL in the Windows host browser from WSL.
func openWSL(_ context.Context, browserURL string) error {
	// Use cmd.exe to open URL on Windows host via WSL interop.
	// The empty string argument is the window title (required when URL contains special chars).
	// We use Background() so the browser process survives program exit
	// (CommandContext kills subprocess when context is cancelled).
	//nolint:contextcheck,gosec // intentionally detached; browserURL is validated to http/https by OpenContext.
	cmd := exec.CommandContext(context.Background(), "cmd.exe", "/c", "start", "", browserURL)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("open browser via cmd.exe: %w", err)
	}

	go cmd.Wait() //nolint:errcheck // browser process lifecycle is not our concern

	return nil
}
