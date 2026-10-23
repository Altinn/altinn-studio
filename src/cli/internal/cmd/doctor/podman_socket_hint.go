package doctor

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"altinn.studio/devenv/pkg/processutil"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	podmanSocketUnit        = "podman.socket"
	systemdUnitProbeTimeout = 2 * time.Second
)

func (s *Service) containerHostHint(ctx context.Context, host string) string {
	runtimeDir, ok := rootlessPodmanRuntimeDir(host)
	if !ok || !rootlessPodmanSocketMissing(runtimeDir) {
		return ""
	}

	if !s.commandExists("systemctl") {
		return ""
	}
	loadState, err := s.loadSystemdUserUnitState(ctx, podmanSocketUnit)
	if err != nil || strings.TrimSpace(loadState) != "loaded" {
		return ""
	}

	return "socket not found; run 'systemctl --user enable --now podman.socket'"
}

func rootlessPodmanRuntimeDir(host string) (string, bool) {
	if runtime.GOOS != osutil.OSLinux {
		return "", false
	}

	runtimeDir := strings.TrimSpace(os.Getenv("XDG_RUNTIME_DIR"))
	if runtimeDir == "" {
		return "", false
	}

	endpoint, err := url.Parse(host)
	if err != nil || endpoint.Scheme != "unix" || endpoint.Host != "" {
		return "", false
	}

	socketPath := filepath.Clean(endpoint.Path)
	expectedPath := filepath.Join(runtimeDir, "podman", "podman.sock")
	return runtimeDir, socketPath == expectedPath
}

func rootlessPodmanSocketMissing(runtimeDir string) bool {
	root, err := os.OpenRoot(runtimeDir)
	if err != nil {
		return errors.Is(err, os.ErrNotExist)
	}
	_, statErr := root.Stat(filepath.Join("podman", "podman.sock"))
	if err := root.Close(); err != nil {
		return false
	}
	return errors.Is(statErr, os.ErrNotExist)
}

func (s *Service) loadSystemdUserUnitState(ctx context.Context, unit string) (string, error) {
	if s != nil && s.systemdUserUnitLoadState != nil {
		return s.systemdUserUnitLoadState(ctx, unit)
	}
	return commandSystemdUserUnitLoadState(ctx, unit)
}

func commandSystemdUserUnitLoadState(ctx context.Context, unit string) (string, error) {
	probeCtx, cancel := context.WithTimeout(ctx, systemdUnitProbeTimeout)
	defer cancel()

	output, err := processutil.CommandContext(
		probeCtx,
		"systemctl",
		"--user",
		"show",
		unit,
		"--property=LoadState",
		"--value",
	).Output()
	if err != nil {
		return "", fmt.Errorf("inspect systemd user unit %s: %w", unit, err)
	}

	return strings.TrimSpace(string(output)), nil
}
