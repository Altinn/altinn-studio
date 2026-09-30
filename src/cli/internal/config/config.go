// Package config provides configuration management for studioctl.
// Configuration is resolved in order: CLI flags → environment variables → defaults.
package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
)

// IsTruthyEnv reports whether an environment variable value is enabled.
func IsTruthyEnv(value string) bool {
	return value == "1" || strings.EqualFold(value, "true")
}

// IsCI reports whether the process is running in CI.
func IsCI() bool {
	return IsTruthyEnv(os.Getenv(EnvCI))
}

const (
	// EnvCI is the common CI marker used by GitHub Actions and other CI systems.
	EnvCI = "CI"

	// AppName is the application name used for platform-specific directories.
	AppName = "altinn-studio"

	// StudioctlServerName is the host service identity used in runtime files and logs.
	StudioctlServerName = "studioctl-server"

	// StudioctlServerBinaryName is the executable name of the installed host service.
	StudioctlServerBinaryName = StudioctlServerName

	// StudioctlServerResourcesDirName is the resources archive directory containing the host service payload.
	StudioctlServerResourcesDirName = StudioctlServerName

	// EnvHome overrides the home directory.
	EnvHome = "STUDIOCTL_HOME"

	// EnvSocketDir overrides the socket directory.
	EnvSocketDir = "STUDIOCTL_SOCKET_DIR"

	// EnvInternalDevMode enables local internal dev image mode.
	EnvInternalDevMode = "STUDIOCTL_INTERNAL_DEV"

	// EnvPrebuiltDevImages uses locally available dev images without rebuilding them.
	EnvPrebuiltDevImages = "STUDIOCTL_PREBUILT_DEV_IMAGES"

	// EnvRegistryCacheWrite enables pushing BuildKit registry cache entries.
	EnvRegistryCacheWrite = "STUDIOCTL_REGISTRY_CACHE_WRITE"

	// EnvResourcesArchive overrides resources install source with a local archive path.
	// Intended for development/tooling, not normal end-user flows.
	EnvResourcesArchive = "STUDIOCTL_RESOURCES_ARCHIVE"
)

// Sentinel errors for configuration validation.
var (
	// ErrHomeRequired is returned when the home directory is not set.
	ErrHomeRequired = errors.New("home directory is required")

	// ErrSocketDirRequired is returned when the socket directory is not set.
	ErrSocketDirRequired = errors.New("socket directory is required")
)

// Config holds all configuration for studioctl.
type Config struct {
	Home      string       // Base directory for studioctl data
	SocketDir string       // Directory for Unix domain sockets
	LogDir    string       // Directory for log files
	DataDir   string       // Directory for container volumes
	BinDir    string       // Directory for binaries and installed payloads
	Version   Version      // Build version (embedded at build time)
	Images    ImagesConfig // Container image configuration
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

	return newResolvedConfig(flags, version, home, socketDir, DefaultImages(), true)
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
	return newResolvedConfig(flags, version, home, socketDir, DefaultImages(), false)
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
		Version:   NewVersion(version),
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

// StudioctlServerSocketPath returns the path to the studioctl server Unix socket.
func (c *Config) StudioctlServerSocketPath() string {
	return filepath.Join(c.SocketDir, StudioctlServerName+".sock")
}

// StudioctlServerPIDPath returns the path to the persisted studioctl server runtime state file.
func (c *Config) StudioctlServerPIDPath() string {
	return filepath.Join(c.Home, StudioctlServerName+".pid")
}

// StudioctlServerLockPath returns the path to the studioctl server lifecycle lock file.
func (c *Config) StudioctlServerLockPath() string {
	return filepath.Join(c.SocketDir, StudioctlServerName+".lock")
}

// StudioctlServerLogDir returns the directory containing studioctl server log files.
func (c *Config) StudioctlServerLogDir() string {
	return filepath.Join(c.LogDir, StudioctlServerName)
}

// AppLogsDir returns the directory containing app log directories.
func (c *Config) AppLogsDir() string {
	return filepath.Join(c.LogDir, "apps")
}

// AppLogDir returns the directory containing logs for one app.
func (c *Config) AppLogDir(appID string) string {
	return filepath.Join(c.AppLogsDir(), appID)
}

// ErrInvalidAppID is returned when an app id cannot name a directory safely.
var ErrInvalidAppID = errors.New("invalid app id")

// AppSecretsDir returns the directory studioctl provisions one app's secrets into for local runs - what
// /mnt/app-secrets is to a deployed app. It lives under the home directory alongside the credentials file
// rather than under the data directory, whose contents are container volumes that env down may discard.
func (c *Config) AppSecretsDir(appID string) (string, error) {
	return c.appDir(appID, "secrets")
}

// AppKeysDir returns the directory a containerized local run persists its data-protection keys in - what
// the /mnt/keys volume is to a deployed app. A native run keeps using the developer's own home directory.
func (c *Config) AppKeysDir(appID string) (string, error) {
	return c.appDir(appID, "keys")
}

func isSafePathSegment(segment string) bool {
	return segment != "" && segment != "." && segment != ".." && !strings.ContainsAny(segment, `/\`)
}

// StudioctlServerBinaryPath returns the path to the studioctl server binary.
// On Windows, the .exe suffix is automatically appended.
func (c *Config) StudioctlServerBinaryPath() string {
	name := StudioctlServerBinaryName
	if runtime.GOOS == osutil.OSWindows {
		name += ".exe"
	}
	return filepath.Join(c.StudioctlServerInstallDir(), name)
}

// StudioctlServerInstallDir returns the directory containing the installed studioctl server payload.
func (c *Config) StudioctlServerInstallDir() string {
	return filepath.Join(c.BinDir, StudioctlServerName)
}

// AgentSkillsDir returns the directory containing the Agent Skills distributed with studioctl.
func (c *Config) AgentSkillsDir() string {
	return filepath.Join(c.Home, "agent", "skills")
}

// BoundTopologyConfigDir returns the directory containing generated bound topology files.
func (c *Config) BoundTopologyConfigDir() string {
	return filepath.Join(c.DataDir, envtopology.BoundTopologyConfigDirName)
}

// BoundTopologyConfigPath returns the path to the generated bound topology.
func (c *Config) BoundTopologyConfigPath() string {
	return filepath.Join(c.BoundTopologyConfigDir(), envtopology.BoundTopologyConfigFileName)
}

// BoundTopologyBaseConfigPath returns the path to the generated base topology.
func (c *Config) BoundTopologyBaseConfigPath() string {
	return filepath.Join(c.BoundTopologyConfigDir(), envtopology.BoundTopologyBaseConfigFileName)
}

// CredentialsPath returns the path to the credentials file.
func (c *Config) CredentialsPath() string {
	return filepath.Join(c.Home, "credentials.yaml")
}

// UpdateCheckCachePath returns the path to the passive update-check cache file.
func (c *Config) UpdateCheckCachePath() string {
	return filepath.Join(c.Home, "update-check.yaml")
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

// appDir places one app's state under the home directory. The id's two parts are two path segments, so
// distinct ids never share a directory (flattening org/app with a separator would make a/b-c and a-b/c the
// same), and a part that could escape the tree is refused.
func (c *Config) appDir(appID, kind string) (string, error) {
	org, app, ok := strings.Cut(appID, "/")
	if !ok || !isSafePathSegment(org) || !isSafePathSegment(app) {
		return "", fmt.Errorf("%w: %q", ErrInvalidAppID, appID)
	}
	return filepath.Join(c.Home, "apps", org, app, kind), nil
}
