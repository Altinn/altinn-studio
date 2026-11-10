package cmd

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

func TestEnvConfigSetsGetsAndUnsetsThePort(t *testing.T) {
	t.Parallel()

	command, out := newEnvConfigCommand(t)
	if err := command.Run(t.Context(), []string{"config", "set", "port", "8100"}); err != nil {
		t.Fatalf("set error = %v", err)
	}
	if got := getPortSetting(t, command, out); got.Value != 8100 || !got.Set {
		t.Fatalf("after set: %+v, want port 8100, set", got)
	}

	if err := command.Run(t.Context(), []string{"config", "unset", "port"}); err != nil {
		t.Fatalf("unset error = %v", err)
	}
	if got := getPortSetting(t, command, out); got.Value != 8000 || got.Set {
		t.Fatalf("after unset: %+v, want the built-in 8000, not set", got)
	}
}

func TestEnvConfigListShowsTheBuiltInPort(t *testing.T) {
	t.Parallel()

	command, out := newEnvConfigCommand(t)
	if err := command.Run(t.Context(), []string{"config"}); err != nil {
		t.Fatalf("list error = %v", err)
	}
	if !strings.Contains(out.String(), "8000 (built-in)") {
		t.Fatalf("output = %q, want the built-in port", out.String())
	}
}

func TestEnvConfigRefusesBadInput(t *testing.T) {
	t.Parallel()

	tests := []struct {
		want error
		args []string
	}{
		{args: []string{"config", "set", "port", "70000"}, want: ErrInvalidFlagValue},
		{args: []string{"config", "set", "port", "-1"}, want: ErrInvalidFlagValue},
		{args: []string{"config", "set", "port", "80"}, want: ErrInvalidFlagValue},
		{args: []string{"config", "set", "port", "abc"}, want: ErrInvalidFlagValue},
		{args: []string{"config", "set", "port"}, want: ErrInvalidFlagValue},
		{args: []string{"config", "get", "colour"}, want: errUnknownSetting},
		{args: []string{"config", "rename"}, want: ErrUnknownSubcommand},
	}
	for _, tt := range tests {
		command, _ := newEnvConfigCommand(t)
		if err := command.Run(t.Context(), tt.args); !errors.Is(err, tt.want) {
			t.Fatalf("Run(%v) error = %v, want %v", tt.args, err, tt.want)
		}
	}
}

// set and unset print no value, so --json would be silently ignored.
func TestEnvConfigRefusesJSONWhereThereIsNothingToFormat(t *testing.T) {
	t.Parallel()

	for _, args := range [][]string{{"config", "set", "port", "8100", "--json"}, {"config", "unset", "port", "--json"}} {
		command, _ := newEnvConfigCommand(t)
		if err := command.Run(t.Context(), args); err == nil {
			t.Fatalf("Run(%v) error = nil, want --json refused", args)
		}
	}
}

func newEnvConfigCommand(t *testing.T) (*EnvCommand, *bytes.Buffer) {
	t.Helper()
	home := t.TempDir()
	var out bytes.Buffer
	return &EnvCommand{
		cfg: &config.Config{Home: home, DataDir: filepath.Join(home, "data")},
		out: ui.NewOutput(&out, io.Discard, false),
	}, &out
}

func getPortSetting(t *testing.T, command *EnvCommand, out *bytes.Buffer) envConfigSetting {
	t.Helper()
	out.Reset()
	if err := command.Run(t.Context(), []string{"config", "get", "port", "--json"}); err != nil {
		t.Fatalf("get error = %v", err)
	}
	var setting envConfigSetting
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &setting); err != nil {
		t.Fatalf("json.Unmarshal(%q) error = %v", out.String(), err)
	}
	return setting
}

// An environment with no recorded port was started at the default port, whatever env config says now. env up --port
// with the configured port must move it there, not report it as already running at 8000.
func TestLocaltestPortChangedComparesAnUnrecordedEnvironmentWithTheDefault(t *testing.T) {
	t.Parallel()

	home := t.TempDir()
	cfg := &config.Config{Home: home, DataDir: filepath.Join(home, "data")}
	if err := config.SaveSettings(cfg, config.Settings{Env: config.EnvSettings{Port: 8300}}); err != nil {
		t.Fatalf("SaveSettings() error = %v", err)
	}

	changed, err := localtestPortChanged(cfg, 8300)
	if err != nil {
		t.Fatalf("localtestPortChanged() error = %v", err)
	}
	if !changed {
		t.Fatal("localtestPortChanged(8300) = false, want true: nothing recorded, so localtest serves 8000")
	}
}

// Flags before the key, and the conventional -- before the values, are both how env config list already reads its
// flags (env config --json) and how the flag package reads every other studioctl command.
func TestEnvConfigTakesFlagsBeforeTheKeyAndValuesAfterDoubleDash(t *testing.T) {
	t.Parallel()

	for _, args := range [][]string{
		{"config", "get", "--json", "port"},
		{"config", "set", "port", "--", "8100"},
		{"config", "set", "--", "port", "8100"},
	} {
		command, _ := newEnvConfigCommand(t)
		if err := command.Run(t.Context(), args); err != nil {
			t.Errorf("Run(%v) error = %v, want nil", args, err)
		}
	}
}
