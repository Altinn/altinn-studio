package cmd_test

import (
	"os"
	"testing"

	"altinn.studio/studioctl/internal/cmd"
	"altinn.studio/studioctl/internal/config"
)

// flagTestCase holds test parameters for ParseGlobalFlags tests.
type flagTestCase struct {
	name        string
	wantHome    string
	wantSocket  string
	args        []string
	wantArgs    []string
	wantVerbose int
}

// newFlagTestCase creates a test case with all fields explicitly set.
func newFlagTestCase(name string, args, wantArgs []string, wantVerbose int) flagTestCase {
	return flagTestCase{
		name:        name,
		wantHome:    "",
		wantSocket:  "",
		args:        args,
		wantArgs:    wantArgs,
		wantVerbose: wantVerbose,
	}
}

// newFlagTestCaseWithHome creates a test case expecting a specific home value.
func newFlagTestCaseWithHome(name string, args, wantArgs []string, wantHome string, wantVerbose int) flagTestCase {
	return flagTestCase{
		name:        name,
		wantHome:    wantHome,
		wantSocket:  "",
		args:        args,
		wantArgs:    wantArgs,
		wantVerbose: wantVerbose,
	}
}

// newFlagTestCaseWithSocket creates a test case expecting a specific socket dir.
func newFlagTestCaseWithSocket(name string, args, wantArgs []string, wantSocket string, wantVerbose int) flagTestCase {
	return flagTestCase{
		name:        name,
		wantHome:    "",
		wantSocket:  wantSocket,
		args:        args,
		wantArgs:    wantArgs,
		wantVerbose: wantVerbose,
	}
}

func TestParseGlobalFlags(t *testing.T) {
	tests := []flagTestCase{
		newFlagTestCase("no flags",
			[]string{"studioctl", "run"}, []string{"run"}, 0),

		newFlagTestCase("verbose flag",
			[]string{"studioctl", "-v", "run"}, []string{"run"}, 1),

		newFlagTestCase("double verbose flag",
			[]string{"studioctl", "-vv", "run"}, []string{"run"}, 2),

		newFlagTestCase("debug flag",
			[]string{"studioctl", "--debug", "run"}, []string{"run"}, 2),

		newFlagTestCaseWithHome("home flag with value",
			[]string{"studioctl", "--home", "/custom/home", "run"}, []string{"run"}, "/custom/home", 0),

		newFlagTestCaseWithHome("home flag with equals",
			[]string{"studioctl", "--home=/custom/home", "run"}, []string{"run"}, "/custom/home", 0),

		newFlagTestCaseWithSocket("socket-dir flag",
			[]string{"studioctl", "--socket-dir", "/custom/sockets", "env", "up"},
			[]string{"env", "up"}, "/custom/sockets", 0),

		newFlagTestCaseWithHome("multiple flags",
			[]string{"studioctl", "-v", "--home", "/home", "doctor"}, []string{"doctor"}, "/home", 1),

		newFlagTestCase("help flag preserved",
			[]string{"studioctl", "--help"}, []string{"--help"}, 0),

		newFlagTestCase("version flag preserved",
			[]string{"studioctl", "-V"}, []string{"-V"}, 0),
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
				t.Errorf("Verbose = %d, want %d", flags.Verbose, tt.wantVerbose)
			}

			if len(args) != len(tt.wantArgs) {
				t.Errorf("args = %v, want %v", args, tt.wantArgs)
			} else {
				for i, arg := range args {
					if arg != tt.wantArgs[i] {
						t.Errorf("args[%d] = %q, want %q", i, arg, tt.wantArgs[i])
					}
				}
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
			name:       "home flag followed by another flag",
			args:       []string{"studioctl", "--home", "--foo"},
			wantErrMsg: "flag --home requires a value, got flag --foo",
		},
		{
			name:       "home flag followed by short flag",
			args:       []string{"studioctl", "--home", "-v"},
			wantErrMsg: "flag --home requires a value, got flag -v",
		},
		{
			name:       "socket-dir flag followed by another flag",
			args:       []string{"studioctl", "--socket-dir", "--home", "/path"},
			wantErrMsg: "flag --socket-dir requires a value, got flag --home",
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
			if !containsSubstr(errMsg, tt.wantErrMsg) {
				t.Errorf(
					"ParseGlobalFlags() error = %q, want containing %q",
					errMsg, tt.wantErrMsg,
				)
			}
		})
	}
}

// containsSubstr checks if s contains substr.
func containsSubstr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func TestCLI_Run(t *testing.T) {
	tempDir := t.TempDir()
	cfg, err := config.New(config.Flags{Home: tempDir, SocketDir: "", Verbose: 0}, "test-version")
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
		{
			name:     "env command exists",
			args:     []string{"env"},
			wantCode: 0,
		},
		{
			name:     "doctor command exists",
			args:     []string{"doctor", "--help"},
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
