package config_test

import (
	"os"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/config"
)

func TestLoadSettingsWithoutAFileIsTheZeroSettings(t *testing.T) {
	t.Parallel()

	settings, err := config.LoadSettings(&config.Config{Home: t.TempDir()})
	if err != nil {
		t.Fatalf("LoadSettings() error = %v", err)
	}
	if settings.Env.Port != 0 {
		t.Fatalf("Env.Port = %d, want 0", settings.Env.Port)
	}
}

func TestSaveSettingsRoundTrips(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{Home: t.TempDir()}
	if err := config.SaveSettings(cfg, config.Settings{Env: config.EnvSettings{Port: 8100}}); err != nil {
		t.Fatalf("SaveSettings() error = %v", err)
	}

	settings, err := config.LoadSettings(cfg)
	if err != nil {
		t.Fatalf("LoadSettings() error = %v", err)
	}
	if settings.Env.Port != 8100 {
		t.Fatalf("Env.Port = %d, want 8100", settings.Env.Port)
	}
}

func TestLoadSettingsRefusesAnUnreadableFile(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{Home: t.TempDir()}
	if err := os.WriteFile(cfg.SettingsPath(), []byte("env: [port"), 0o600); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}

	if _, err := config.LoadSettings(cfg); err == nil || !strings.Contains(err.Error(), cfg.SettingsPath()) {
		t.Fatalf("LoadSettings() error = %v, want an error naming %s", err, cfg.SettingsPath())
	}
}
