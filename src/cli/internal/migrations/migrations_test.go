package migrations_test

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/migrations"
)

func TestRunAppliesPendingMigrationsOnce(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	var applied []string
	steps := []migrations.Migration{
		{
			ID: "001-first",
			Up: func(context.Context, *config.Config) error {
				applied = append(applied, "001-first")
				return nil
			},
		},
		{
			ID: "002-second",
			Up: func(context.Context, *config.Config) error {
				applied = append(applied, "002-second")
				return nil
			},
		},
	}

	if err := migrations.RunAll(t.Context(), cfg, steps); err != nil {
		t.Fatalf("RunAll() error = %v", err)
	}
	if err := migrations.RunAll(t.Context(), cfg, steps); err != nil {
		t.Fatalf("second RunAll() error = %v", err)
	}

	wantApplied := []string{"001-first", "002-second"}
	if !reflect.DeepEqual(applied, wantApplied) {
		t.Fatalf("applied = %+v, want %+v", applied, wantApplied)
	}

	raw, err := os.ReadFile(filepath.Join(cfg.Home, "migrations.json"))
	if err != nil {
		t.Fatalf("read state file: %v", err)
	}
	const wantState = "{\n  \"applied\": [\n    \"001-first\",\n    \"002-second\"\n  ]\n}\n"
	if string(raw) != wantState {
		t.Fatalf("state file = %q, want %q", raw, wantState)
	}
}

func TestRunRejectsInvalidMigration(t *testing.T) {
	t.Parallel()

	err := migrations.RunAll(t.Context(), testConfig(t), []migrations.Migration{{ID: "missing-up", Up: nil}})
	if !errors.Is(err, migrations.ErrMigrationApplyRequired) {
		t.Fatalf("RunAll() error = %v, want ErrMigrationApplyRequired", err)
	}
}

func testConfig(t *testing.T) *config.Config {
	t.Helper()

	cfg, err := config.New(config.Flags{Home: t.TempDir()}, "test-version")
	if err != nil {
		t.Fatalf("config.New() error = %v", err)
	}
	return cfg
}

func markMigrationsApplied(t *testing.T, cfg *config.Config, ids ...string) {
	t.Helper()

	steps := make([]migrations.Migration, 0, len(ids))
	for _, id := range ids {
		steps = append(steps, migrations.Migration{
			ID: id,
			Up: func(context.Context, *config.Config) error {
				return nil
			},
		})
	}
	if err := migrations.RunAll(t.Context(), cfg, steps); err != nil {
		t.Fatalf("mark migrations applied: %v", err)
	}
}

func markOtherMigrationsApplied(t *testing.T, cfg *config.Config, migrationID string) {
	t.Helper()

	registered := migrations.NewRunner().RegisteredMigrations()
	ids := make([]string, 0, len(registered)-1)
	for _, migration := range registered {
		if migration.ID != migrationID {
			ids = append(ids, migration.ID)
		}
	}
	markMigrationsApplied(t, cfg, ids...)
}
