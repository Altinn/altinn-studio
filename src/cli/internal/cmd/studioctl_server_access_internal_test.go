package cmd

import (
	"context"
	"testing"

	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/config"
)

// app logs, app ps and stop start studioctl-server through this path, so it has to use the recorded port too.
func TestStudioctlServerAccessStartsTheServerAtTheRecordedPort(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{DataDir: t.TempDir()}
	if err := envlocaltest.WriteState(cfg, envlocaltest.State{PublicPort: 8100}); err != nil {
		t.Fatalf("WriteState() error = %v", err)
	}
	var startedWith string
	access := studioctlServerAccess{
		cfg:    cfg,
		client: nil,
		ensureStarted: func(_ context.Context, _ *config.Config, port string) error {
			startedWith = port
			return nil
		},
	}

	if err := access.ensure(t.Context()); err != nil {
		t.Fatalf("ensure() error = %v", err)
	}
	if startedWith != "8100" {
		t.Fatalf("ensureStarted port = %q, want 8100", startedWith)
	}
}
