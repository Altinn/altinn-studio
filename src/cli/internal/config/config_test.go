package config_test

import (
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/config"
)

// newTestFlags creates Flags with only home specified, other fields use defaults.
func newTestFlags(home string) config.Flags {
	return config.Flags{Home: home, SocketDir: "", Verbose: false}
}

// newTestFlagsWithVerbose creates Flags with home and verbose level.
func newTestFlagsWithVerbose(home string, verbose bool) config.Flags {
	return config.Flags{Home: home, SocketDir: "", Verbose: verbose}
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

	t.Run("verbose flag", func(t *testing.T) {
		t.Parallel()
		tempDir := t.TempDir()

		cfg, err := config.New(newTestFlagsWithVerbose(tempDir, true), "test-version")
		if err != nil {
			t.Fatalf("New() error = %v", err)
		}

		if !cfg.Verbose {
			t.Error("Verbose should be true when flag is set")
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

func TestNewDoctorFallback(t *testing.T) {
	t.Run("does not create directories", func(t *testing.T) {
		tempDir := t.TempDir()
		home := filepath.Join(tempDir, "fallback-home")

		cfg, err := config.NewDoctorFallback(newTestFlags(home), "1.0.0")
		if err != nil {
			t.Fatalf("NewDoctorFallback() error = %v", err)
		}

		if cfg.Home != home {
			t.Errorf("Home = %q, want %q", cfg.Home, home)
		}
		if cfg.SocketDir != home {
			t.Errorf("SocketDir = %q, want %q (same as Home)", cfg.SocketDir, home)
		}
		if cfg.Images.Utility.Busybox.Image == "" {
			t.Error("expected fallback Busybox image to be set")
		}

		if _, err := os.Stat(home); !os.IsNotExist(err) {
			t.Errorf("home directory should not be created in fallback mode, stat err = %v", err)
		}
	})

	t.Run("resolves env overrides", func(t *testing.T) {
		tempDir := t.TempDir()
		envHome := filepath.Join(tempDir, "env-home")
		envSocket := filepath.Join(tempDir, "env-socket")
		t.Setenv(config.EnvHome, envHome)
		t.Setenv(config.EnvSocketDir, envSocket)

		cfg, err := config.NewDoctorFallback(newTestFlags(""), "1.0.0")
		if err != nil {
			t.Fatalf("NewDoctorFallback() error = %v", err)
		}

		if cfg.Home != envHome {
			t.Errorf("Home = %q, want %q", cfg.Home, envHome)
		}
		if cfg.SocketDir != envSocket {
			t.Errorf("SocketDir = %q, want %q", cfg.SocketDir, envSocket)
		}
	})
}

func TestNew_RelativeSocketDirFlagIsResolvedToAbsolute(t *testing.T) {
	tempDir := t.TempDir()
	t.Chdir(tempDir)

	home := filepath.Join(tempDir, "home")
	cfg, err := config.NewDoctorFallback(config.Flags{
		Home:      home,
		SocketDir: "sockets",
	}, "1.0.0")
	if err != nil {
		t.Fatalf("NewDoctorFallback() error = %v", err)
	}

	want := filepath.Join(tempDir, "sockets")
	if cfg.SocketDir != want {
		t.Errorf("SocketDir = %q, want %q", cfg.SocketDir, want)
	}
}

func TestNew_EnvRelativeSocketDirIsResolvedToAbsolute(t *testing.T) {
	tempDir := t.TempDir()
	t.Chdir(tempDir)
	t.Setenv(config.EnvSocketDir, "env-socket")

	home := filepath.Join(tempDir, "home")
	cfg, err := config.NewDoctorFallback(newTestFlags(home), "1.0.0")
	if err != nil {
		t.Fatalf("NewDoctorFallback() error = %v", err)
	}

	want := filepath.Join(tempDir, "env-socket")
	if cfg.SocketDir != want {
		t.Errorf("SocketDir = %q, want %q", cfg.SocketDir, want)
	}
}
