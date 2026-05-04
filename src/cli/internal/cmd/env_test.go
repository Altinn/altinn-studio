package cmd_test

import (
	"context"
	"io"
	"testing"

	cmd "altinn.studio/studioctl/internal/cmd"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

func TestEnvCommand_RunUp_Help(t *testing.T) {
	t.Parallel()

	command := newTestEnvCommand(t)
	err := command.Run(context.Background(), []string{"up", "--help"})
	if err != nil {
		t.Fatalf("Run() error = %v", err)
	}
}

func TestEnvCommand_RunHosts_Help(t *testing.T) {
	t.Parallel()

	command := newTestEnvCommand(t)
	err := command.Run(context.Background(), []string{"hosts", "--help"})
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
