package osutil

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os/exec"
	"runtime"

	"altinn.studio/devenv/pkg/processutil"
)

// ErrUnsupportedPlatform is returned when the current platform is not supported.
var (
	ErrUnsupportedPlatform   = errors.New("unsupported platform")
	errBrowserURLMissingHost = errors.New("browser url is missing host")
	errUnsupportedURLScheme  = errors.New("unsupported browser url scheme")
)

const goosLinux = "linux"

// OpenContext opens the given URL in the default browser with context support.
func OpenContext(ctx context.Context, rawURL string) error {
	safeURL, err := validateBrowserURL(rawURL)
	if err != nil {
		return err
	}

	if runtime.GOOS == goosLinux && IsWSL() {
		return openWSL(ctx, safeURL)
	}

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case goosLinux:
		cmd = processutil.CommandContext(ctx, "xdg-open", safeURL)
	case "darwin":
		cmd = processutil.CommandContext(ctx, "open", safeURL)
	case "windows":
		cmd = processutil.CommandContext(ctx, "cmd", "/c", "start", "", safeURL)
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
