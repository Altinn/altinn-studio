package cmd_test

import (
	"context"
	"io"
	"strings"
	"testing"

	cmd "altinn.studio/studioctl/internal/cmd"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

func TestEnvCommand_RunUp_PortValidation(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		args []string
	}{
		{name: "negative", args: []string{"up", "--port=-1"}},
		{name: "too large", args: []string{"up", "--port=65536"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			command := newTestEnvCommand(t)
			err := command.Run(context.Background(), tt.args)
			if err == nil {
				t.Fatal("Run() error = nil, want invalid port error")
			}
			if !strings.Contains(err.Error(), "invalid port") {
				t.Fatalf("Run() error = %v, want invalid port", err)
			}
		})
	}
}

func TestEnvCommand_RunUp_Help(t *testing.T) {
	t.Parallel()

	command := newTestEnvCommand(t)
	err := command.Run(context.Background(), []string{"up", "--help"})
	if err != nil {
		t.Fatalf("Run() error = %v", err)
	}
}

func newTestEnvCommand(t *testing.T) *cmd.EnvCommand {
	t.Helper()

	cfg, err := config.New(config.Flags{Home: t.TempDir(), SocketDir: "", Verbose: false}, "test-version")
	if err != nil {
		t.Fatalf("config.New() error = %v", err)
	}

	out := ui.NewOutput(io.Discard, io.Discard, false)
	return cmd.NewEnvCommand(cfg, out)
}
