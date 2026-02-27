package localtest_test

import (
	"context"
	"errors"
	"testing"

	"altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/cmd/env/localtest"
)

var errConnRefused = errors.New("connection refused")

func TestCheckForLegacyLocaltest(t *testing.T) {
	t.Parallel()

	tests := []struct {
		setup      func(*mock.Client)
		name       string
		wantErr    bool
		wantLegacy bool
	}{
		{
			name: "no containers exist",
			setup: func(c *mock.Client) {
				c.ContainerInspectFunc = func(_ context.Context, _ string) (types.ContainerInfo, error) {
					return types.ContainerInfo{}, types.ErrContainerNotFound
				}
			},
			wantErr:    false,
			wantLegacy: false,
		},
		{
			name: "containers exist with studioctl label",
			setup: func(c *mock.Client) {
				c.ContainerInspectFunc = func(_ context.Context, _ string) (types.ContainerInfo, error) {
					return types.ContainerInfo{
						State:  types.ContainerState{Running: true},
						Labels: map[string]string{localtest.LabelKey: localtest.LabelValue},
					}, nil
				}
			},
			wantErr:    false,
			wantLegacy: false,
		},
		{
			name: "containers exist without label (legacy)",
			setup: func(c *mock.Client) {
				c.ContainerInspectFunc = func(_ context.Context, _ string) (types.ContainerInfo, error) {
					return types.ContainerInfo{
						State:  types.ContainerState{Running: true},
						Labels: map[string]string{},
					}, nil
				}
			},
			wantErr:    true,
			wantLegacy: true,
		},
		{
			name: "containers exist with wrong label value",
			setup: func(c *mock.Client) {
				c.ContainerInspectFunc = func(_ context.Context, _ string) (types.ContainerInfo, error) {
					return types.ContainerInfo{
						State:  types.ContainerState{Running: true},
						Labels: map[string]string{localtest.LabelKey: "other-value"},
					}, nil
				}
			},
			wantErr:    true,
			wantLegacy: true,
		},
		{
			name: "containers exist but not running",
			setup: func(c *mock.Client) {
				c.ContainerInspectFunc = func(_ context.Context, _ string) (types.ContainerInfo, error) {
					return types.ContainerInfo{
						State:  types.ContainerState{Running: false},
						Labels: map[string]string{},
					}, nil
				}
			},
			wantErr:    false,
			wantLegacy: false,
		},
		{
			name: "inspect returns error",
			setup: func(c *mock.Client) {
				c.ContainerInspectFunc = func(_ context.Context, _ string) (types.ContainerInfo, error) {
					return types.ContainerInfo{}, errConnRefused
				}
			},
			wantErr:    true,
			wantLegacy: false,
		},
		{
			name: "one container legacy, one with label",
			setup: func(c *mock.Client) {
				c.ContainerInspectFunc = func(_ context.Context, name string) (types.ContainerInfo, error) {
					if name == "localtest" {
						return types.ContainerInfo{
							State:  types.ContainerState{Running: true},
							Labels: map[string]string{},
						}, nil
					}
					return types.ContainerInfo{
						State:  types.ContainerState{Running: true},
						Labels: map[string]string{localtest.LabelKey: localtest.LabelValue},
					}, nil
				}
			},
			wantErr:    true,
			wantLegacy: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			client := mock.New()
			tc.setup(client)

			err := localtest.CheckForLegacyLocaltest(context.Background(), client)

			if tc.wantErr && err == nil {
				t.Error("CheckForLegacyLocaltest() error = nil, want error")
			}
			if !tc.wantErr && err != nil {
				t.Errorf("CheckForLegacyLocaltest() error = %v, want nil", err)
			}
			if tc.wantLegacy && !errors.Is(err, localtest.ErrLegacyLocaltestRunning) {
				t.Errorf("CheckForLegacyLocaltest() error = %v, want ErrLegacyLocaltestRunning", err)
			}
		})
	}
}
