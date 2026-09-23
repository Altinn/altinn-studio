package migrations_test

import (
	"context"
	"errors"
	"testing"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/studioctl/internal/migrations"
)

var errUnexpectedContainerRuntime = errors.New("unexpected container runtime connection")

func TestRunSchedulesWorkflowEngineResetWithoutContainerRuntime(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	markOtherMigrationsApplied(t, cfg, "007-reset-workflow-engine-data")

	runner := migrations.NewRunner(
		migrations.WithContainerClient(func(context.Context) (container.ContainerClient, error) {
			t.Fatal("workflow-engine reset migration connected to a container runtime")
			return nil, errUnexpectedContainerRuntime
		}),
	)
	if err := runner.Run(t.Context(), cfg); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
}
