package localtest_test

import (
	"context"
	"errors"
	"testing"

	"altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	"altinn.studio/studioctl/internal/envtopology"
)

func TestRunningCollector(t *testing.T) {
	t.Parallel()

	tests := []struct {
		err         error
		name        string
		state       types.ContainerState
		wantRunning bool
		wantErr     bool
	}{
		{name: "running", state: types.ContainerState{Status: "running", Running: true}, wantRunning: true},
		{name: "exited", state: types.ContainerState{Status: "exited"}},
		{name: "not created", err: types.ErrContainerNotFound},
		{name: "runtime error", err: errConnRefused, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			client := mock.New()
			client.ContainerStateFunc = func(_ context.Context, name string) (types.ContainerState, error) {
				if name != components.ContainerOtelCollector {
					t.Errorf("ContainerState(%q), want %q", name, components.ContainerOtelCollector)
				}
				return tt.state, tt.err
			}

			topology := envtopology.NewLocal("8000")
			collector, running, err := localtest.RunningCollector(t.Context(), client, topology)
			if (err != nil) != tt.wantErr {
				t.Fatalf("RunningCollector() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && !errors.Is(err, tt.err) {
				t.Errorf("RunningCollector() error = %v, want it to wrap %v", err, tt.err)
			}
			if running != tt.wantRunning {
				t.Fatalf("RunningCollector() running = %v, want %v", running, tt.wantRunning)
			}
			if running && collector != components.OTLPCollector(topology) {
				t.Errorf("RunningCollector() = %+v, want %+v", collector, components.OTLPCollector(topology))
			}
		})
	}
}
