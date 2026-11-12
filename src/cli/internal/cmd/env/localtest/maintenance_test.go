//nolint:testpackage // Same-package tests verify private marker lifecycle details.
package localtest

import (
	"context"
	"errors"
	"io"
	"sync/atomic"
	"testing"

	containermock "altinn.studio/devenv/pkg/container/mock"
	containertypes "altinn.studio/devenv/pkg/container/types"
	containerbackend "altinn.studio/devenv/pkg/resource/executor/container"
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

func TestPreflightForgetsThePortOfAGoneEnvironment(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{DataDir: t.TempDir(), Images: testResetImages()}
	if err := WriteState(cfg, State{PublicPort: 8100}); err != nil {
		t.Fatalf("WriteState() error = %v", err)
	}
	localtest := NewEnv(cfg, ui.NewOutput(io.Discard, io.Discard, false), containermock.New())

	if err := localtest.Preflight(t.Context(), envtypes.UpOptions{}); err != nil {
		t.Fatalf("Preflight() error = %v", err)
	}
	if state, found, err := ReadState(cfg); err != nil || found {
		t.Fatalf("ReadState() = %+v, %t, %v, want no record", state, found, err)
	}
}

// The scheduled reset removes the containers, but the environment and its port stay.
func TestPreflightKeepsThePortThroughAScheduledWorkflowEngineReset(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{DataDir: t.TempDir(), Images: testResetImages()}
	if err := WriteState(cfg, State{PublicPort: 8100}); err != nil {
		t.Fatalf("WriteState() error = %v", err)
	}
	if err := ScheduleWorkflowEngineDataReset(cfg.DataDir); err != nil {
		t.Fatalf("ScheduleWorkflowEngineDataReset() error = %v", err)
	}
	localtest := NewEnv(cfg, ui.NewOutput(io.Discard, io.Discard, false), environmentUntilRemoved())

	if err := localtest.Preflight(t.Context(), envtypes.UpOptions{}); err != nil {
		t.Fatalf("Preflight() error = %v", err)
	}
	if state, _, err := ReadState(cfg); err != nil || state.PublicPort != 8100 {
		t.Fatalf("ReadState() = %+v, %v, want port 8100", state, err)
	}
}

// environmentUntilRemoved reports the environment's containers and network until something removes one.
func environmentUntilRemoved() *containermock.Client {
	var removed atomic.Bool
	client := containermock.New()
	client.ContainerInspectFunc = func(context.Context, string) (containertypes.ContainerInfo, error) {
		if removed.Load() {
			return containertypes.ContainerInfo{}, containertypes.ErrContainerNotFound
		}
		return containertypes.ContainerInfo{Labels: map[string]string{containerbackend.GraphIDLabel: graphID}}, nil
	}
	client.NetworkInspectFunc = func(context.Context, string) (containertypes.NetworkInfo, error) {
		if removed.Load() {
			return containertypes.NetworkInfo{}, containertypes.ErrNetworkNotFound
		}
		return containertypes.NetworkInfo{Labels: map[string]string{containerbackend.GraphIDLabel: graphID}}, nil
	}
	client.ContainerRemoveFunc = func(context.Context, string, bool) error {
		removed.Store(true)
		return nil
	}
	client.NetworkRemoveFunc = func(context.Context, string) error {
		removed.Store(true)
		return nil
	}
	return client
}
