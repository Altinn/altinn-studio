// Package config provides configuration management for studioctl.
// Configuration is resolved in order: CLI flags → environment variables → defaults.
package config

import (
	_ "embed"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"gopkg.in/yaml.v3"

	"altinn.studio/studioctl/internal/osutil"
)

//go:embed config.yaml
var embeddedConfig []byte

const (
	// AppName is the application name used for platform-specific directories.
	AppName = "altinn-studio"

	// EnvHome overrides the home directory.
	EnvHome = "STUDIOCTL_HOME"

	// EnvSocketDir overrides the socket directory.
	EnvSocketDir = "STUDIOCTL_SOCKET_DIR"

	// EnvInternalDevMode enables local internal dev image mode.
	EnvInternalDevMode = "STUDIOCTL_INTERNAL_DEV"

	// EnvResourcesTarball overrides resource install source with a local tarball path.
	// Intended for development/tooling, not normal end-user flows.
	EnvResourcesTarball = "STUDIOCTL_RESOURCES_TARBALL"
)

// Sentinel errors for configuration validation.
var (
	// ErrHomeRequired is returned when the home directory is not set.
	ErrHomeRequired = errors.New("home directory is required")

	// ErrSocketDirRequired is returned when the socket directory is not set.
	ErrSocketDirRequired = errors.New("socket directory is required")

	// ErrInvalidConfigVersion is returned when config file version is invalid.
	ErrInvalidConfigVersion = errors.New("invalid config version")
)

// Config holds all configuration for studioctl.
type Config struct {
	Home      string       // Base directory for studioctl data
	SocketDir string       // Directory for Unix domain sockets
	LogDir    string       // Directory for log files
	DataDir   string       // Directory for container volumes
	BinDir    string       // Directory for binaries (app-manager)
	Images    ImagesConfig // Container image configuration
	Version   string       // Build version (embedded at build time)
	Verbose   bool         // Verbose output (-v)
}

// Flags holds CLI flag values that override config.
type Flags struct {
	Home      string
	SocketDir string
	Verbose   bool
}

// New creates a Config with values resolved from flags, environment, and defaults.
// Directories are created if they don't exist.
func New(flags Flags, version string) (*Config, error) {
	home, err := resolveHome(flags.Home)
	if err != nil {
		return nil, fmt.Errorf("resolve home: %w", err)
	}

	socketDir, err := resolveSocketDir(flags.SocketDir, home)
	if err != nil {
		return nil, fmt.Errorf("resolve socket dir: %w", err)
	}

	// Load persisted config (images, etc.) with embedded defaults fallback
	persisted, err := Load(home)
	if err != nil {
		return nil, fmt.Errorf("load config: %w", err)
	}

	return newResolvedConfig(flags, version, home, socketDir, persisted.Images, true)
}

// NewDoctorFallback creates a minimal config for running doctor when normal config init fails.
// It resolves paths the same way as New but uses embedded defaults and does not create directories.
func NewDoctorFallback(flags Flags, version string) (*Config, error) {
	home, err := resolveHome(flags.Home)
	if err != nil {
		return nil, fmt.Errorf("resolve fallback home: %w", err)
	}

	socketDir, err := resolveSocketDir(flags.SocketDir, home)
	if err != nil {
		return nil, fmt.Errorf("resolve fallback socket dir: %w", err)
	}
	defaults, err := LoadDefaults()
	if err != nil {
		return nil, fmt.Errorf("load embedded defaults: %w", err)
	}

	images := defaults.Images
	if images.Utility.Busybox.Image == "" {
		images.Utility.Busybox = ImageSpec{
			Image: "busybox",
			Tag:   "stable",
		}
	}

	return newResolvedConfig(flags, version, home, socketDir, images, false)
}

func newResolvedConfig(
	flags Flags,
	version string,
	home string,
	socketDir string,
	images ImagesConfig,
	ensureDirs bool,
) (*Config, error) {
	cfg := &Config{
		Home:      home,
		SocketDir: socketDir,
		LogDir:    filepath.Join(home, "logs"),
		DataDir:   filepath.Join(home, "data"),
		BinDir:    filepath.Join(home, "bin"),
		Images:    images,
		Version:   version,
		Verbose:   flags.Verbose,
	}

	if ensureDirs {
		if err := cfg.ensureDirectories(); err != nil {
			return nil, err
		}
	}

	return cfg, nil
}

// resolveHome determines the home directory from flags, env, or platform default.
// Platform defaults:
//   - Linux: $XDG_CONFIG_HOME/altinn-studio (defaults to ~/.config/altinn-studio)
//   - macOS: ~/Library/Application Support/altinn-studio
//   - Windows: %APPDATA%\altinn-studio
func resolveHome(flagValue string) (string, error) {
	if flagValue != "" {
		absPath, err := filepath.Abs(flagValue)
		if err != nil {
			return "", fmt.Errorf("getting absolute path for flag value: %w", err)
		}
		return absPath, nil
	}

	if envValue := os.Getenv(EnvHome); envValue != "" {
		absPath, err := filepath.Abs(envValue)
		if err != nil {
			return "", fmt.Errorf("getting absolute path for env value: %w", err)
		}
		return absPath, nil
	}

	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("get user config directory: %w", err)
	}

	return filepath.Join(configDir, AppName), nil
}

// resolveSocketDir determines the socket directory from flags, env, or home.
func resolveSocketDir(flagValue, home string) (string, error) {
	if flagValue != "" {
		absPath, err := filepath.Abs(flagValue)
		if err != nil {
			return "", fmt.Errorf("getting absolute socket dir path for flag value: %w", err)
		}
		return absPath, nil
	}

	if envValue := os.Getenv(EnvSocketDir); envValue != "" {
		absPath, err := filepath.Abs(envValue)
		if err != nil {
			return "", fmt.Errorf("getting absolute socket dir path for env value: %w", err)
		}
		return absPath, nil
	}

	return home, nil
}

// AppManagerSocketPath returns the path to the app-manager Unix socket.
func (c *Config) AppManagerSocketPath() string {
	return filepath.Join(c.SocketDir, "app-manager.sock")
}

// AppManagerPIDPath returns the path to the app-manager PID file.
func (c *Config) AppManagerPIDPath() string {
	return filepath.Join(c.Home, "app-manager.pid")
}

// AppManagerBinaryPath returns the path to the app-manager binary.
// On Windows, the .exe suffix is automatically appended.
func (c *Config) AppManagerBinaryPath() string {
	name := "app-manager"
	if runtime.GOOS == "windows" {
		name += ".exe"
	}
	return filepath.Join(c.BinDir, name)
}

// persistedConfigPath returns the path to the persisted config file.
func persistedConfigPath(homeDir string) string {
	return filepath.Join(homeDir, "config.yaml")
}

// CredentialsPath returns the path to the credentials file.
func (c *Config) CredentialsPath() string {
	return filepath.Join(c.Home, "credentials.yaml")
}

// Validate checks that the configuration is valid.
func (c *Config) Validate() error {
	if c.Home == "" {
		return ErrHomeRequired
	}
	if c.SocketDir == "" {
		return ErrSocketDirRequired
	}
	return nil
}

// ensureDirectories creates all required directories if they don't exist.
func (c *Config) ensureDirectories() error {
	dirs := []string{c.Home, c.SocketDir, c.LogDir, c.DataDir, c.BinDir}

	for _, dir := range dirs {
		if err := os.MkdirAll(dir, osutil.DirPermDefault); err != nil {
			return fmt.Errorf("create directory %s: %w", dir, err)
		}
	}

	return nil
}

// ImageSpec defines an image reference with repository and tag.
type ImageSpec struct {
	Image string `yaml:"image"`
	Tag   string `yaml:"tag"`
}

// Ref returns the full image reference (image:tag).
func (s ImageSpec) Ref() string {
	if s.Tag == "" {
		return s.Image + ":latest"
	}
	return s.Image + ":" + s.Tag
}

// CoreImages holds image configuration for core studioctl containers.
type CoreImages struct {
	Localtest ImageSpec `yaml:"localtest"`
	PDF3      ImageSpec `yaml:"pdf3"`
}

// MonitoringImages holds image configuration for monitoring stack containers.
type MonitoringImages struct {
	Tempo         ImageSpec `yaml:"tempo"`
	Mimir         ImageSpec `yaml:"mimir"`
	Loki          ImageSpec `yaml:"loki"`
	OtelCollector ImageSpec `yaml:"otel-collector"` //nolint:tagliatelle // kebab-case for YAML consistency
	Grafana       ImageSpec `yaml:"grafana"`
}

// UtilityImages holds image configuration for utility containers.
type UtilityImages struct {
	Busybox ImageSpec `yaml:"busybox"`
}

// ImagesConfig holds all image configuration grouped by purpose.
type ImagesConfig struct {
	Core       CoreImages       `yaml:"core"`
	Monitoring MonitoringImages `yaml:"monitoring"`
	Utility    UtilityImages    `yaml:"utility"`
}

// PersistedConfig is the root structure for the persisted config file.
type PersistedConfig struct {
	Images  ImagesConfig `yaml:"images"`
	Version int          `yaml:"version"`
}

// Install writes the embedded config to the home directory.
// If force is false and the file already exists, it does nothing.
func Install(homeDir string, force bool) error {
	path := persistedConfigPath(homeDir)
	if !force {
		if _, err := os.Stat(path); err == nil {
			return nil // already exists
		}
	}

	if err := os.WriteFile(path, embeddedConfig, osutil.FilePermOwnerOnly); err != nil {
		return fmt.Errorf("write config file: %w", err)
	}
	return nil
}

// loadEmbedded returns the embedded default configuration.
func loadEmbedded() (PersistedConfig, error) {
	var cfg PersistedConfig
	if err := yaml.Unmarshal(embeddedConfig, &cfg); err != nil {
		return PersistedConfig{}, fmt.Errorf("parse embedded config: %w", err)
	}

	return cfg, nil
}

// LoadDefaults loads only the embedded default configuration.
// Unlike Load, it ignores user config files on disk.
func LoadDefaults() (PersistedConfig, error) {
	return loadEmbedded()
}

// loadFromFile loads configuration from a YAML file.
func loadFromFile(path string) (PersistedConfig, error) {
	data, err := os.ReadFile(path) //nolint:gosec // path is from trusted config
	if err != nil {
		return PersistedConfig{}, fmt.Errorf("read config file: %w", err)
	}
	var cfg PersistedConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return PersistedConfig{}, fmt.Errorf("parse config file: %w", err)
	}
	return cfg, nil
}

// Load loads configuration from the home directory with embedded defaults fallback.
// Non-empty user values override defaults.
func Load(homeDir string) (PersistedConfig, error) {
	defaults, err := loadEmbedded()
	if err != nil {
		return PersistedConfig{}, err
	}

	userCfg, err := loadFromFile(persistedConfigPath(homeDir))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return defaults, nil
		}
		return PersistedConfig{}, fmt.Errorf("load user config: %w", err)
	}

	migratedUser, err := migrate(userCfg, defaults.Version)
	if err != nil {
		return PersistedConfig{}, fmt.Errorf("migrate user config: %w", err)
	}

	return merge(defaults, migratedUser), nil
}

// mergeImageSpec merges Image and Tag fields independently.
// Non-empty user values override defaults for each field.
func mergeImageSpec(defaults, user ImageSpec) ImageSpec {
	result := defaults
	if user.Image != "" {
		result.Image = user.Image
	}
	if user.Tag != "" {
		result.Tag = user.Tag
	}
	return result
}

// merge combines defaults with user overrides.
// Non-empty user values override defaults.
func merge(defaults, user PersistedConfig) PersistedConfig {
	result := defaults

	// Core images
	result.Images.Core.Localtest = mergeImageSpec(defaults.Images.Core.Localtest, user.Images.Core.Localtest)
	result.Images.Core.PDF3 = mergeImageSpec(defaults.Images.Core.PDF3, user.Images.Core.PDF3)

	// Monitoring images
	result.Images.Monitoring.Tempo = mergeImageSpec(defaults.Images.Monitoring.Tempo, user.Images.Monitoring.Tempo)
	result.Images.Monitoring.Mimir = mergeImageSpec(defaults.Images.Monitoring.Mimir, user.Images.Monitoring.Mimir)
	result.Images.Monitoring.Loki = mergeImageSpec(defaults.Images.Monitoring.Loki, user.Images.Monitoring.Loki)
	result.Images.Monitoring.OtelCollector = mergeImageSpec(
		defaults.Images.Monitoring.OtelCollector,
		user.Images.Monitoring.OtelCollector,
	)
	result.Images.Monitoring.Grafana = mergeImageSpec(
		defaults.Images.Monitoring.Grafana,
		user.Images.Monitoring.Grafana,
	)

	// Utility images
	result.Images.Utility.Busybox = mergeImageSpec(defaults.Images.Utility.Busybox, user.Images.Utility.Busybox)

	return result
}

// migrate upgrades a persisted config to currentVersion.
func migrate(cfg PersistedConfig, currentVersion int) (PersistedConfig, error) {
	version := cfg.Version

	if version > currentVersion {
		return PersistedConfig{}, fmt.Errorf(
			"%w: %d (current version: %d)",
			ErrInvalidConfigVersion,
			version,
			currentVersion,
		)
	}

	// TODO: migration

	return cfg, nil
}
