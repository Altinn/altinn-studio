//nolint:testpackage // Same-package tests verify private marker lifecycle details.
package localtest

import (
	"context"
	"errors"
	"io"
	"testing"

	containermock "altinn.studio/devenv/pkg/container/mock"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

var errWorkflowEngineResetFailed = errors.New("workflow-engine reset failed")

func TestPreflightAppliesScheduledWorkflowEngineResetOnce(t *testing.T) {
	t.Parallel()

	dataDir := t.TempDir()
	if err := ScheduleWorkflowEngineDataReset(dataDir); err != nil {
		t.Fatalf("ScheduleWorkflowEngineDataReset() error = %v", err)
	}

	client := containermock.New()
	resetCount := 0
	client.VolumeRemoveFunc = func(context.Context, string, bool) error {
		resetCount++
		return nil
	}
	localtest := NewEnv(
		&config.Config{DataDir: dataDir, Images: testResetImages()},
		ui.NewOutput(io.Discard, io.Discard, false),
		client,
	)

	if err := localtest.Preflight(t.Context(), envtypes.UpOptions{}); err != nil {
		t.Fatalf("Preflight() error = %v", err)
	}
	if err := localtest.Preflight(t.Context(), envtypes.UpOptions{}); err != nil {
		t.Fatalf("second Preflight() error = %v", err)
	}
	if resetCount != 1 {
		t.Fatalf("workflow-engine reset count = %d, want 1", resetCount)
	}
}

func TestPreflightKeepsScheduledWorkflowEngineResetAfterFailure(t *testing.T) {
	t.Parallel()

	dataDir := t.TempDir()
	if err := ScheduleWorkflowEngineDataReset(dataDir); err != nil {
		t.Fatalf("ScheduleWorkflowEngineDataReset() error = %v", err)
	}

	client := containermock.New()
	client.VolumeRemoveFunc = func(context.Context, string, bool) error {
		return errWorkflowEngineResetFailed
	}
	localtest := NewEnv(
		&config.Config{DataDir: dataDir, Images: testResetImages()},
		ui.NewOutput(io.Discard, io.Discard, false),
		client,
	)

	err := localtest.Preflight(t.Context(), envtypes.UpOptions{})
	if !errors.Is(err, errWorkflowEngineResetFailed) {
		t.Fatalf("Preflight() error = %v, want wrapped reset failure", err)
	}
}
