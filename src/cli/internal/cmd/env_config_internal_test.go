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

// Without a running environment, an app started from an IDE takes the port env up would start localtest at.
func TestRunEnvUsesTheConfiguredPortWithoutAnEnvironment(t *testing.T) {
	t.Parallel()

	appRoot := writeEnvCommandApp(t)
	command, out := newEnvCommand(t)
	if err := config.SaveSettings(command.cfg, config.Settings{Env: config.EnvSettings{Port: 8300}}); err != nil {
		t.Fatalf("SaveSettings() error = %v", err)
	}

	if err := command.runEnv(t.Context(), []string{"-p", appRoot, "--json"}); err != nil {
		t.Fatalf("runEnv() error = %v", err)
	}

	var got map[string]string
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	assertEnvCommandValue(
		t,
		got,
		"PlatformSettings__ApiStorageEndpoint",
		"http://local.altinn.cloud:8300/storage/api/v1/",
	)
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
