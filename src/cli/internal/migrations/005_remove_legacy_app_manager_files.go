package migrations

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"altinn.studio/studioctl/internal/config"
)

const legacyAppManagerName = "app-manager"

func legacyAppManagerFiles(_ context.Context, cfg *config.Config) error {
	paths := []struct {
		path      string
		kind      string
		recursive bool
	}{
		{path: filepath.Join(cfg.BinDir, legacyAppManagerName), kind: "install directory", recursive: true},
		{path: filepath.Join(cfg.Home, legacyAppManagerName+".pid"), kind: "pid file", recursive: false},
		{path: filepath.Join(cfg.SocketDir, legacyAppManagerName+".sock"), kind: "socket file", recursive: false},
		{path: filepath.Join(cfg.SocketDir, legacyAppManagerName+".lock"), kind: "lock file", recursive: false},
		{path: filepath.Join(cfg.LogDir, legacyAppManagerName), kind: "log directory", recursive: true},
	}

	for _, entry := range paths {
		if err := removeLegacyAppManagerPath(entry.path, entry.recursive); err != nil {
			return fmt.Errorf("remove legacy app-manager %s %s: %w", entry.kind, entry.path, err)
		}
	}

	return nil
}

func removeLegacyAppManagerPath(path string, recursive bool) error {
	var err error
	if recursive {
		err = os.RemoveAll(path)
	} else {
		err = os.Remove(path)
	}
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove path: %w", err)
	}
	return nil
}
