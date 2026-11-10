package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"

	"altinn.studio/studioctl/internal/osutil"
)

const settingsFileName = "config.yaml"

// Settings are the defaults a user sets with studioctl env config.
type Settings struct {
	Env EnvSettings `yaml:"env,omitempty"`
}

// EnvSettings are the defaults of studioctl env.
type EnvSettings struct {
	// Port is the host port env up starts a new environment on without --port. Zero is the built-in default.
	Port int `yaml:"port,omitempty"`
}

// SettingsPath returns the path to the settings file.
func (c *Config) SettingsPath() string {
	return filepath.Join(c.Home, settingsFileName)
}

// LoadSettings returns the saved settings, or the zero Settings when there are none.
func LoadSettings(c *Config) (Settings, error) {
	data, err := os.ReadFile(c.SettingsPath())
	if errors.Is(err, os.ErrNotExist) {
		return Settings{Env: EnvSettings{Port: 0}}, nil
	}
	if err != nil {
		return Settings{}, fmt.Errorf("read settings: %w", err)
	}
	var settings Settings
	if err := yaml.Unmarshal(data, &settings); err != nil {
		return Settings{}, fmt.Errorf("parse settings %s: %w", c.SettingsPath(), err)
	}
	return settings, nil
}

// SaveSettings writes the settings.
func SaveSettings(c *Config, settings Settings) error {
	if err := os.MkdirAll(c.Home, osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create studioctl home: %w", err)
	}
	data, err := yaml.Marshal(settings)
	if err != nil {
		return fmt.Errorf("encode settings: %w", err)
	}
	if err := osutil.WriteFileAtomic(c.SettingsPath(), data, osutil.AtomicWriteOptions{
		Perm:      osutil.FilePermDefault,
		OwnerOnly: false,
	}); err != nil {
		return fmt.Errorf("write settings: %w", err)
	}
	return nil
}
