package localtest_test

import (
	"context"
	"errors"
	"io"
	"testing"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

var errStateUnavailable = errors.New("state unavailable")

func TestStatus_RunningRequiresAllCoreContainers(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		states      map[string]types.ContainerState
		wantRunning bool
	}{
		"all core containers running": {
			states: map[string]types.ContainerState{
				localtest.ContainerLocaltest: {Status: "running", Running: true},
				localtest.ContainerPDF3:      {Status: "running", Running: true},
			},
			wantRunning: true,
		},
		"one running one exited": {
			states: map[string]types.ContainerState{
				localtest.ContainerLocaltest: {Status: "running", Running: true},
				localtest.ContainerPDF3:      {Status: "exited", Running: false},
			},
			wantRunning: false,
		},
		"one running one missing": {
			states: map[string]types.ContainerState{
				localtest.ContainerLocaltest: {Status: "running", Running: true},
			},
			wantRunning: false,
		},
		"none running": {
			states:      map[string]types.ContainerState{},
			wantRunning: false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			client := mock.New()
			client.ContainerStateFunc = func(_ context.Context, nameOrID string) (types.ContainerState, error) {
				state, ok := tt.states[nameOrID]
				if !ok {
					return types.ContainerState{}, types.ErrContainerNotFound
				}
				return state, nil
			}

			env := newTestEnv(client)
			status, err := env.Status(context.Background())
			if err != nil {
				t.Fatalf("Status() error = %v", err)
			}
			if status.Running != tt.wantRunning {
				t.Fatalf("Status().Running = %v, want %v", status.Running, tt.wantRunning)
			}
		})
	}
}

func TestStatus_ReturnsErrorForNonNotFoundStateError(t *testing.T) {
	t.Parallel()

	client := mock.New()
	client.ContainerStateFunc = func(_ context.Context, nameOrID string) (types.ContainerState, error) {
		if nameOrID == localtest.ContainerPDF3 {
			return types.ContainerState{}, errStateUnavailable
		}
		return types.ContainerState{Status: "running", Running: true}, nil
	}

	env := newTestEnv(client)
	_, err := env.Status(context.Background())
	if !errors.Is(err, errStateUnavailable) {
		t.Fatalf("Status() error = %v, want wrapped %v", err, errStateUnavailable)
	}
}

func newTestEnv(client container.ContainerClient) *localtest.Env {
	return localtest.NewEnv(&config.Config{}, ui.NewOutput(io.Discard, io.Discard, false), client)
}
