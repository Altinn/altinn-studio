package cmd_test

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/cmd"
	"altinn.studio/studioctl/internal/config"
)

func TestParseGlobalFlags(t *testing.T) {
	tests := []struct {
		name        string
		wantHome    string
		wantSocket  string
		args        []string
		wantArgs    []string
		wantVerbose bool
	}{
		{
			name:        "no flags",
			args:        []string{"studioctl", "run"},
			wantArgs:    []string{"run"},
			wantVerbose: false,
		},
		{
			name:        "verbose flag",
			args:        []string{"studioctl", "-v", "run"},
			wantArgs:    []string{"run"},
			wantVerbose: true,
		},
		{
			name:        "home flag with value",
			args:        []string{"studioctl", "--home", "/custom/home", "run"},
			wantArgs:    []string{"run"},
			wantHome:    "/custom/home",
			wantVerbose: false,
		},
		{
			name:        "home flag with equals",
			args:        []string{"studioctl", "--home=/custom/home", "run"},
			wantArgs:    []string{"run"},
			wantHome:    "/custom/home",
			wantVerbose: false,
		},
		{
			name:        "socket-dir flag",
			args:        []string{"studioctl", "--socket-dir", "/custom/sockets", "env", "up"},
			wantArgs:    []string{"env", "up"},
			wantSocket:  "/custom/sockets",
			wantVerbose: false,
		},
		{
			name:        "home flag accepts dash-prefixed value",
			args:        []string{"studioctl", "--home", "--custom-home", "run"},
			wantArgs:    []string{"run"},
			wantHome:    "--custom-home",
			wantVerbose: false,
		},
		{
			name:        "multiple flags",
			args:        []string{"studioctl", "-v", "--home", "/home", "doctor"},
			wantArgs:    []string{"doctor"},
			wantHome:    "/home",
			wantVerbose: true,
		},
		{
			name:        "help flag preserved",
			args:        []string{"studioctl", "--help"},
			wantArgs:    []string{"--help"},
			wantVerbose: false,
		},
		{
			name:        "version flag preserved",
			args:        []string{"studioctl", "-V"},
			wantArgs:    []string{"-V"},
			wantVerbose: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set os.Args for the test
			oldArgs := os.Args
			os.Args = tt.args
			defer func() { os.Args = oldArgs }()

			flags, args, err := cmd.ParseGlobalFlags()
			if err != nil {
				t.Fatalf("ParseGlobalFlags() error = %v", err)
			}

			if flags.Home != tt.wantHome {
				t.Errorf("Home = %q, want %q", flags.Home, tt.wantHome)
			}

			if flags.SocketDir != tt.wantSocket {
				t.Errorf("SocketDir = %q, want %q", flags.SocketDir, tt.wantSocket)
			}

			if flags.Verbose != tt.wantVerbose {
				t.Errorf("Verbose = %v, want %v", flags.Verbose, tt.wantVerbose)
			}

			if !slices.Equal(args, tt.wantArgs) {
				t.Errorf("args = %v, want %v", args, tt.wantArgs)
			}
		})
	}
}

func TestParseGlobalFlags_Errors(t *testing.T) {
	tests := []struct {
		name       string
		wantErrMsg string
		args       []string
	}{
		{
			name:       "home flag missing value",
			args:       []string{"studioctl", "--home"},
			wantErrMsg: "flag --home requires a value",
		},
		{
			name:       "home flag followed by known flag",
			args:       []string{"studioctl", "--home", "-v", "run"},
			wantErrMsg: "flag --home requires a value, got flag -v",
		},
		{
			name:       "socket-dir flag missing value",
			args:       []string{"studioctl", "--socket-dir"},
			wantErrMsg: "flag --socket-dir requires a value",
		},
		{
			name:       "socket-dir flag followed by known flag",
			args:       []string{"studioctl", "--socket-dir", "--home=/tmp", "run"},
			wantErrMsg: "flag --socket-dir requires a value, got flag --home=/tmp",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			oldArgs := os.Args
			os.Args = tt.args
			defer func() { os.Args = oldArgs }()

			_, _, err := cmd.ParseGlobalFlags()
			if err == nil {
				t.Fatal("ParseGlobalFlags() expected error, got nil")
			}

			// Check that error message contains the expected text
			errMsg := err.Error()
			if !strings.Contains(errMsg, tt.wantErrMsg) {
				t.Errorf(
					"ParseGlobalFlags() error = %q, want containing %q",
					errMsg, tt.wantErrMsg,
				)
			}
		})
	}
}

func TestCLI_Run(t *testing.T) {
	tempDir := t.TempDir()
	cfg, err := config.New(config.Flags{Home: tempDir, SocketDir: "", Verbose: false}, "test-version")
	if err != nil {
		t.Fatalf("config.New() error = %v", err)
	}

	cli := cmd.NewCLI(cfg)

	tests := []struct {
		name     string
		args     []string
		wantCode int
	}{
		{
			name:     "no args shows usage",
			args:     []string{},
			wantCode: 0,
		},
		{
			name:     "help flag",
			args:     []string{"--help"},
			wantCode: 0,
		},
		{
			name:     "version flag",
			args:     []string{"--version"},
			wantCode: 0,
		},
		{
			name:     "unknown command",
			args:     []string{"unknown"},
			wantCode: 1,
		},
		{
			name:     "run command exists",
			args:     []string{"run", "--help"},
			wantCode: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := t.Context()
			code := cli.Run(ctx, tt.args)
			if code != tt.wantCode {
				t.Errorf("Run() = %d, want %d", code, tt.wantCode)
			}
		})
	}
}

func TestMain_DoctorRunsWithInvalidConfigFile(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "config.yaml")
	if err := os.WriteFile(configPath, []byte("invalid: [yaml"), 0o600); err != nil {
		t.Fatalf("write invalid config: %v", err)
	}

	oldArgs := os.Args
	defer func() {
		os.Args = oldArgs
	}()

	os.Args = []string{"studioctl", "doctor", "--json"}
	t.Setenv(config.EnvHome, tempDir)

	exitCode := cmd.Main()
	if exitCode != 0 {
		t.Fatalf("Main() exit code = %d, want 0", exitCode)
	}
}

func TestMain_HelpSkipsConfigInitialization(t *testing.T) {
	tempDir := t.TempDir()
	homeFile := filepath.Join(tempDir, "home-file")
	if err := os.WriteFile(homeFile, []byte("x"), 0o600); err != nil {
		t.Fatalf("write home file: %v", err)
	}

	oldArgs := os.Args
	defer func() {
		os.Args = oldArgs
	}()

	os.Args = []string{"studioctl", "--help", "--home", homeFile}
	exitCode := cmd.Main()
	if exitCode != 0 {
		t.Fatalf("Main() exit code = %d, want 0", exitCode)
	}
}
