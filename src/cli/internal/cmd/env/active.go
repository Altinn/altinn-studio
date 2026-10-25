package env

import (
	"context"
	"errors"
	"fmt"
	"strings"
)

// ErrOtherRuntimeActive is returned when a runtime is asked to start while another one runs: the runtimes share the
// public origin's port and host names, so only one runs at a time.
var ErrOtherRuntimeActive = errors.New("another environment runtime is running")

// ErrRuntimesActive is returned when no runtime is named and more than one runs, so there is no one runtime to act on.
var ErrRuntimesActive = errors.New("more than one environment runtime is running")

// ActiveRuntimes returns the runtimes of envs that have a running container. It is the one answer to which runtime is
// up; callers do not keep their own record of it.
func ActiveRuntimes(ctx context.Context, envs []Env) ([]Env, error) {
	var active []Env
	for _, env := range envs {
		running, err := env.Active(ctx)
		if err != nil {
			return nil, fmt.Errorf("check %s: %w", env.Name(), err)
		}
		if running {
			active = append(active, env)
		}
	}
	return active, nil
}

// EnsureNoOtherActive refuses to start the runtime called name while another runtime of envs is running.
func EnsureNoOtherActive(ctx context.Context, name string, envs []Env) error {
	otherEnvs := make([]Env, 0, len(envs))
	for _, env := range envs {
		if env.Name() != name {
			otherEnvs = append(otherEnvs, env)
		}
	}
	active, err := ActiveRuntimes(ctx, otherEnvs)
	if err != nil {
		return err
	}
	others := make([]string, 0, len(active))
	for _, env := range active {
		others = append(others, env.Name())
	}
	if len(others) == 0 {
		return nil
	}
	return fmt.Errorf("%w: %s; stop it first with 'env down -r %s'",
		ErrOtherRuntimeActive, strings.Join(others, ", "), others[0])
}

// ResolveRuntime names the runtime a command acts on when none is named: the one runtime that is running, else
// fallback. It refuses to pick one when more than one runs.
func ResolveRuntime(ctx context.Context, fallback string, envs []Env) (string, error) {
	active, err := ActiveRuntimes(ctx, envs)
	if err != nil {
		return "", err
	}
	switch len(active) {
	case 0:
		return fallback, nil
	case 1:
		return active[0].Name(), nil
	default:
		names := make([]string, 0, len(active))
		for _, env := range active {
			names = append(names, env.Name())
		}
		return "", fmt.Errorf("%w: %s; pick one with -r", ErrRuntimesActive, strings.Join(names, ", "))
	}
}
