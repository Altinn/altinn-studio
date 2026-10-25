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
	active, err := ActiveRuntimes(ctx, envs)
	if err != nil {
		return err
	}
	var others []string
	for _, env := range active {
		if env.Name() != name {
			others = append(others, env.Name())
		}
	}
	if len(others) == 0 {
		return nil
	}
	return fmt.Errorf("%w: %s; stop it first with 'env down -r %s'",
		ErrOtherRuntimeActive, strings.Join(others, ", "), others[0])
}
