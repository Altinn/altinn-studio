package env_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	envtypes "altinn.studio/studioctl/internal/cmd/env"
)

var errInspect = errors.New("inspect failed")

type fakeEnv struct {
	err    error
	name   string
	active bool
}

func (f fakeEnv) Active(context.Context) (bool, error) { return f.active, f.err }
func (f fakeEnv) Up(context.Context, envtypes.UpOptions) (envtypes.UpResult, error) {
	return envtypes.UpResult{}, nil
}
func (f fakeEnv) Status(context.Context) (*envtypes.Status, error) { return &envtypes.Status{}, nil }
func (f fakeEnv) Down(context.Context) error                       { return nil }
func (f fakeEnv) Logs(context.Context, envtypes.LogsOptions) error { return nil }
func (f fakeEnv) Name() string                                     { return f.name }

func TestEnsureNoOtherActive(t *testing.T) {
	t.Parallel()

	tests := []struct {
		wantErr error
		name    string
		start   string
		envs    []envtypes.Env
	}{
		{
			name:    "nothing running",
			start:   "a",
			envs:    []envtypes.Env{fakeEnv{name: "a"}, fakeEnv{name: "b"}},
			wantErr: nil,
		},
		{
			name:    "the same runtime running",
			start:   "a",
			envs:    []envtypes.Env{fakeEnv{name: "a", active: true}, fakeEnv{name: "b"}},
			wantErr: nil,
		},
		{
			name:    "another runtime running",
			start:   "a",
			envs:    []envtypes.Env{fakeEnv{name: "a"}, fakeEnv{name: "b", active: true}},
			wantErr: envtypes.ErrOtherRuntimeActive,
		},
		{
			name:    "the runtime being started is not checked",
			start:   "a",
			envs:    []envtypes.Env{fakeEnv{name: "a", err: errInspect}, fakeEnv{name: "b"}},
			wantErr: nil,
		},
		{
			name:    "a runtime that cannot be checked",
			start:   "a",
			envs:    []envtypes.Env{fakeEnv{name: "a"}, fakeEnv{name: "b", err: errInspect}},
			wantErr: errInspect,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			err := envtypes.EnsureNoOtherActive(context.Background(), tt.start, tt.envs)
			if tt.wantErr == nil {
				if err != nil {
					t.Fatalf("EnsureNoOtherActive() error = %v, want nil", err)
				}
				return
			}
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("EnsureNoOtherActive() error = %v, want %v", err, tt.wantErr)
			}
		})
	}
}

func TestEnsureNoOtherActiveNamesTheRunningRuntime(t *testing.T) {
	t.Parallel()
	envs := []envtypes.Env{fakeEnv{name: "a"}, fakeEnv{name: "b", active: true}}

	err := envtypes.EnsureNoOtherActive(context.Background(), "a", envs)
	if err == nil || !strings.Contains(err.Error(), "env down -r b") {
		t.Fatalf("EnsureNoOtherActive() error = %v, want it to name 'env down -r b'", err)
	}
}

func TestResolveRuntime(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		want string
		envs []envtypes.Env
	}{
		{
			name: "the running runtime",
			envs: []envtypes.Env{fakeEnv{name: "a"}, fakeEnv{name: "b", active: true}},
			want: "b",
		},
		{
			name: "none running falls back",
			envs: []envtypes.Env{fakeEnv{name: "a"}, fakeEnv{name: "b"}},
			want: "fallback",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := envtypes.ResolveRuntime(context.Background(), "fallback", tt.envs)
			if err != nil {
				t.Fatalf("ResolveRuntime() error = %v", err)
			}
			if got != tt.want {
				t.Fatalf("ResolveRuntime() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestResolveRuntimeRefusesToPickOneOfSeveralRunning(t *testing.T) {
	t.Parallel()
	envs := []envtypes.Env{fakeEnv{name: "a", active: true}, fakeEnv{name: "b", active: true}}

	_, err := envtypes.ResolveRuntime(context.Background(), "fallback", envs)
	if !errors.Is(err, envtypes.ErrRuntimesActive) || !strings.Contains(err.Error(), "a, b; pick one with -r") {
		t.Fatalf("ResolveRuntime() error = %v, want ErrRuntimesActive naming a and b", err)
	}
}

func TestResolveRuntimeReportsARuntimeThatCannotBeChecked(t *testing.T) {
	t.Parallel()
	envs := []envtypes.Env{fakeEnv{name: "a"}, fakeEnv{name: "b", err: errInspect}}

	if _, err := envtypes.ResolveRuntime(context.Background(), "fallback", envs); !errors.Is(err, errInspect) {
		t.Fatalf("ResolveRuntime() error = %v, want %v", err, errInspect)
	}
}
