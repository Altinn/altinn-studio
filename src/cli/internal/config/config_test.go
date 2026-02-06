package config_test

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"altinn.studio/studioctl/internal/config"
)

// newTestFlags creates Flags with only home specified, other fields use defaults.
func newTestFlags(home string) config.Flags {
	return config.Flags{Home: home, SocketDir: "", Verbose: 0}
}

// newTestFlagsWithVerbose creates Flags with home and verbose level.
func newTestFlagsWithVerbose(home string, verbose int) config.Flags {
	return config.Flags{Home: home, SocketDir: "", Verbose: verbose}
}

// newTestConfig creates a Config for validation tests with only required fields.
func newTestConfig(home, socketDir string) config.Config {
	return config.Config{
		Home:      home,
		SocketDir: socketDir,
		LogDir:    "",
		DataDir:   "",
		BinDir:    "",
		Version:   "",
		Verbose:   false,
		Debug:     false,
	}
}

func TestNew(t *testing.T) {
	t.Parallel()

	t.Run("default home", func(t *testing.T) {
		t.Parallel()
		tempDir := t.TempDir()

		cfg, err := config.New(newTestFlags(tempDir), "test-version")
		if err != nil {
			t.Fatalf("New() error = %v", err)
		}

		if cfg.Home != tempDir {
			t.Errorf("Home = %q, want %q", cfg.Home, tempDir)
		}
	})

	t.Run("socket dir defaults to home", func(t *testing.T) {
		t.Parallel()
		tempDir := t.TempDir()

		cfg, err := config.New(newTestFlags(tempDir), "test-version")
		if err != nil {
			t.Fatalf("New() error = %v", err)
		}

		if cfg.SocketDir != cfg.Home {
			t.Errorf("SocketDir = %q, want %q (same as Home)", cfg.SocketDir, cfg.Home)
		}
	})

	t.Run("verbose flag level 1", func(t *testing.T) {
		t.Parallel()
		tempDir := t.TempDir()

		cfg, err := config.New(newTestFlagsWithVerbose(tempDir, 1), "test-version")
		if err != nil {
			t.Fatalf("New() error = %v", err)
		}

		if !cfg.Verbose {
			t.Error("Verbose should be true when flag is 1")
		}
		if cfg.Debug {
			t.Error("Debug should be false when flag is 1")
		}
	})

	t.Run("verbose flag level 2 enables debug", func(t *testing.T) {
		t.Parallel()
		tempDir := t.TempDir()

		cfg, err := config.New(newTestFlagsWithVerbose(tempDir, 2), "test-version")
		if err != nil {
			t.Fatalf("New() error = %v", err)
		}

		if !cfg.Verbose {
			t.Error("Verbose should be true when flag is 2")
		}
		if !cfg.Debug {
			t.Error("Debug should be true when flag is 2")
		}
	})
}

func TestNewWithCustomHome(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	customHome := filepath.Join(tempDir, "custom-home")

	cfg, err := config.New(newTestFlags(customHome), "1.0.0")
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	if cfg.Home != customHome {
		t.Errorf("Home = %q, want %q", cfg.Home, customHome)
	}

	// Verify directories were created
	dirs := []string{cfg.Home, cfg.SocketDir, cfg.LogDir, cfg.DataDir, cfg.BinDir}
	for _, dir := range dirs {
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			t.Errorf("Directory %q was not created", dir)
		}
	}
}

// Tests that use t.Setenv cannot use t.Parallel.
func TestNewWithEnvHome(t *testing.T) {
	tempDir := t.TempDir()
	envHome := filepath.Join(tempDir, "env-home")
	t.Setenv(config.EnvHome, envHome)

	cfg, err := config.New(newTestFlags(""), "1.0.0")
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	if cfg.Home != envHome {
		t.Errorf("Home = %q, want %q", cfg.Home, envHome)
	}
}

func TestNewWithEnvSocketDir(t *testing.T) {
	tempDir := t.TempDir()
	home := filepath.Join(tempDir, "home")
	socketDir := filepath.Join(tempDir, "sockets")
	t.Setenv(config.EnvSocketDir, socketDir)

	cfg, err := config.New(newTestFlags(home), "1.0.0")
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	if cfg.SocketDir != socketDir {
		t.Errorf("SocketDir = %q, want %q", cfg.SocketDir, socketDir)
	}
}

func TestNewWithEnvDebug(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv(config.EnvDebug, "1")

	cfg, err := config.New(newTestFlags(tempDir), "1.0.0")
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	if !cfg.Debug {
		t.Error("Debug should be true when STUDIOCTL_DEBUG=1")
	}
}

func TestConfigPaths(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	cfg, err := config.New(newTestFlags(tempDir), "1.0.0")
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	tests := []struct {
		name string
		got  string
		want string
	}{
		{
			name: "AppManagerSocketPath",
			got:  cfg.AppManagerSocketPath(),
			want: filepath.Join(tempDir, "app-manager.sock"),
		},
		{
			name: "AppManagerPIDPath",
			got:  cfg.AppManagerPIDPath(),
			want: filepath.Join(tempDir, "app-manager.pid"),
		},
		{
			name: "AppManagerBinaryPath",
			got:  cfg.AppManagerBinaryPath(),
			want: func() string {
				name := "app-manager"
				if runtime.GOOS == "windows" {
					name += ".exe"
				}
				return filepath.Join(tempDir, "bin", name)
			}(),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if tt.got != tt.want {
				t.Errorf("%s = %q, want %q", tt.name, tt.got, tt.want)
			}
		})
	}
}

func TestConfigValidate(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		config  config.Config
		wantErr bool
	}{
		{
			name:    "valid config",
			config:  newTestConfig("/some/path", "/some/path"),
			wantErr: false,
		},
		{
			name:    "empty home",
			config:  newTestConfig("", "/some/path"),
			wantErr: true,
		},
		{
			name:    "empty socket dir",
			config:  newTestConfig("/some/path", ""),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			err := tt.config.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
