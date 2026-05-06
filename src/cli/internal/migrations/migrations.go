// Package migrations runs idempotent studioctl home migrations during install and update.
package migrations

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
)

const stateFileName = "migrations.json"

var (
	// ErrConfigRequired is returned when migrations are run without config.
	ErrConfigRequired = errors.New("config is required")
	// ErrMigrationIDRequired is returned when a migration has no stable ID.
	ErrMigrationIDRequired = errors.New("migration id is required")
	// ErrMigrationApplyRequired is returned when a migration has no apply function.
	ErrMigrationApplyRequired = errors.New("migration apply function is required")
)

// Migration is one idempotent change to the studioctl home/data layout.
type Migration struct {
	Up func(context.Context, *config.Config) error
	ID string
}

type stateFile struct {
	Applied []string `json:"applied"`
}

// Run applies all pending migrations.
func Run(ctx context.Context, cfg *config.Config) error {
	return RunAll(ctx, cfg, registeredMigrations())
}

// RunAll applies the provided migrations.
func RunAll(ctx context.Context, cfg *config.Config, migrations []Migration) error {
	if len(migrations) == 0 {
		return nil
	}
	if cfg == nil {
		return ErrConfigRequired
	}

	state, err := readState(cfg)
	if err != nil {
		return err
	}
	applied := appliedSet(state.Applied)

	for _, migration := range migrations {
		if migration.ID == "" {
			return ErrMigrationIDRequired
		}
		if migration.Up == nil {
			return fmt.Errorf("%w: %s", ErrMigrationApplyRequired, migration.ID)
		}
		if applied[migration.ID] {
			continue
		}
		if err := migration.Up(ctx, cfg); err != nil {
			return fmt.Errorf("apply migration %q: %w", migration.ID, err)
		}
		state.Applied = append(state.Applied, migration.ID)
		applied[migration.ID] = true
		if err := writeState(cfg, state); err != nil {
			return err
		}
	}

	return nil
}

func appliedSet(ids []string) map[string]bool {
	applied := make(map[string]bool, len(ids))
	for _, id := range ids {
		applied[id] = true
	}
	return applied
}

func readState(cfg *config.Config) (stateFile, error) {
	path := statePath(cfg)
	//nolint:gosec // G304: path is derived from the resolved studioctl home directory.
	raw, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return stateFile{Applied: nil}, nil
		}
		return stateFile{}, fmt.Errorf("read migration state: %w", err)
	}

	var state stateFile
	if err := json.Unmarshal(raw, &state); err != nil {
		return stateFile{}, fmt.Errorf("decode migration state: %w", err)
	}
	return state, nil
}

func writeState(cfg *config.Config, state stateFile) error {
	path := statePath(cfg)
	if err := os.MkdirAll(filepath.Dir(path), osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create migration state directory: %w", err)
	}

	raw, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return fmt.Errorf("encode migration state: %w", err)
	}

	tmpPath := path + ".tmp"
	if err := os.WriteFile(tmpPath, append(raw, '\n'), osutil.FilePermDefault); err != nil {
		return fmt.Errorf("write migration state temp file: %w", err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		removeErr := os.Remove(tmpPath)
		if removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
			return errors.Join(
				fmt.Errorf("replace migration state: %w", err),
				fmt.Errorf("remove migration state temp file: %w", removeErr),
			)
		}
		return fmt.Errorf("replace migration state: %w", err)
	}
	return nil
}

func statePath(cfg *config.Config) string {
	return filepath.Join(cfg.Home, stateFileName)
}
