package env

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
)

const currentRuntimeFile = "generated/runtime"

// CurrentRuntime returns the runtime the last `env up` started, or "" when none was recorded. Only one
// runtime runs at a time, so the other env commands act on this one unless told otherwise.
func CurrentRuntime(cfg *config.Config) (string, error) {
	data, err := os.ReadFile(filepath.Join(cfg.DataDir, currentRuntimeFile))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "", nil
		}
		return "", fmt.Errorf("read current runtime: %w", err)
	}
	return strings.TrimSpace(string(data)), nil
}

// RecordCurrentRuntime records the runtime `env up` is starting.
func RecordCurrentRuntime(cfg *config.Config, name string) error {
	path := filepath.Join(cfg.DataDir, currentRuntimeFile)
	if err := os.MkdirAll(filepath.Dir(path), osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create runtime record directory: %w", err)
	}
	if err := os.WriteFile(path, []byte(name+"\n"), osutil.FilePermDefault); err != nil {
		return fmt.Errorf("record current runtime: %w", err)
	}
	return nil
}
