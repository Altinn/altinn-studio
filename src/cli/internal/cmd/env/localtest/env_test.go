package localtest_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	"altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

var errStateUnavailable = errors.New("state unavailable")

func TestStatus_RunningRequiresAllCoreContainers(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		states         map[string]types.ContainerState
		wantRunning    bool
		wantAnyRunning bool
	}{
		"all core containers running": {
			states: map[string]types.ContainerState{
				localtest.ContainerLocaltest:        {Status: "running", Running: true},
				localtest.ContainerPDF3:             {Status: "running", Running: true},
				localtest.ContainerWorkflowEngineDb: {Status: "running", Running: true},
				localtest.ContainerWorkflowEngine:   {Status: "running", Running: true},
				localtest.ContainerPgAdmin:          {Status: "running", Running: true},
			},
			wantRunning:    true,
			wantAnyRunning: true,
		},
		"one running one exited": {
			states: map[string]types.ContainerState{
				localtest.ContainerLocaltest:        {Status: "running", Running: true},
				localtest.ContainerPDF3:             {Status: "exited", Running: false},
				localtest.ContainerWorkflowEngineDb: {Status: "running", Running: true},
				localtest.ContainerWorkflowEngine:   {Status: "running", Running: true},
				localtest.ContainerPgAdmin:          {Status: "running", Running: true},
			},
			wantRunning:    false,
			wantAnyRunning: true,
		},
		"one running one missing": {
			states: map[string]types.ContainerState{
				localtest.ContainerLocaltest: {Status: "running", Running: true},
			},
			wantRunning:    false,
			wantAnyRunning: true,
		},
		"none running": {
			states:         map[string]types.ContainerState{},
			wantRunning:    false,
			wantAnyRunning: false,
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
			if status.AnyRunning != tt.wantAnyRunning {
				t.Fatalf("Status().AnyRunning = %v, want %v", status.AnyRunning, tt.wantAnyRunning)
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

func TestLogs_JSONOutputsOneObjectPerLine(t *testing.T) {
	t.Parallel()

	client := mock.New()
	client.ContainerStateFunc = func(_ context.Context, nameOrID string) (types.ContainerState, error) {
		if nameOrID == localtest.ContainerLocaltest {
			return types.ContainerState{Status: "running", Running: true}, nil
		}
		return types.ContainerState{}, types.ErrContainerNotFound
	}
	client.ContainerLogsFunc = func(_ context.Context, nameOrID string, follow bool, tail string) (io.ReadCloser, error) {
		if nameOrID != localtest.ContainerLocaltest {
			t.Fatalf("ContainerLogs() name = %q, want %q", nameOrID, localtest.ContainerLocaltest)
		}
		if follow {
			t.Fatal("ContainerLogs() follow = true, want false")
		}
		if tail != "100" {
			t.Fatalf("ContainerLogs() tail = %q, want 100", tail)
		}
		return io.NopCloser(strings.NewReader("one\ntwo\n")), nil
	}

	var out bytes.Buffer
	env := localtest.NewEnv(&config.Config{}, ui.NewOutput(&out, io.Discard, false), client)
	if err := env.Logs(context.Background(), envtypes.LogsOptions{
		Component: localtest.ContainerLocaltest,
		Follow:    false,
		JSON:      true,
	}); err != nil {
		t.Fatalf("Logs() error = %v", err)
	}

	lines := strings.Split(strings.TrimSpace(out.String()), "\n")
	if len(lines) != 2 {
		t.Fatalf("output lines = %d, want 2: %q", len(lines), out.String())
	}
	for i, line := range lines {
		var got struct {
			Component string `json:"component"`
			Line      string `json:"line"`
		}
		if err := json.Unmarshal([]byte(line), &got); err != nil {
			t.Fatalf("json.Unmarshal(line %d) error = %v", i, err)
		}
		if got.Component != localtest.ContainerLocaltest {
			t.Fatalf("line %d component = %q, want %q", i, got.Component, localtest.ContainerLocaltest)
		}
	}
	if !strings.Contains(lines[0], `"line":"one"`) || !strings.Contains(lines[1], `"line":"two"`) {
		t.Fatalf("lines = %v, want one and two log lines", lines)
	}
}

func newTestEnv(client container.ContainerClient) *localtest.Env {
	return localtest.NewEnv(&config.Config{}, ui.NewOutput(io.Discard, io.Discard, false), client)
}
