// Package registry wires environment runtime implementations.
package registry

import (
	"errors"
	"fmt"

	"altinn.studio/devenv/pkg/container"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

var (
	errConfigRequired          = errors.New("config is required")
	errOutputRequired          = errors.New("output is required")
	errContainerClientRequired = errors.New("container client is required")
)

type options struct {
	cfg             *config.Config
	out             *ui.Output
	containerClient container.ContainerClient
}

// Option configures runtime implementation construction.
type Option func(*options)

// WithConfig sets the studioctl config.
func WithConfig(cfg *config.Config) Option {
	return func(opts *options) {
		opts.cfg = cfg
	}
}

// WithOutput sets the command output.
func WithOutput(out *ui.Output) Option {
	return func(opts *options) {
		opts.out = out
	}
}

// WithContainerClient sets the container runtime client.
func WithContainerClient(client container.ContainerClient) Option {
	return func(opts *options) {
		opts.containerClient = client
	}
}

// Envs returns all environment runtime implementations.
func Envs(opts ...Option) ([]envtypes.Env, error) {
	resolved := options{
		cfg:             nil,
		out:             nil,
		containerClient: nil,
	}
	for _, opt := range opts {
		opt(&resolved)
	}
	if resolved.cfg == nil {
		return nil, fmt.Errorf("registry: %w", errConfigRequired)
	}
	if resolved.out == nil {
		return nil, fmt.Errorf("registry: %w", errOutputRequired)
	}
	if resolved.containerClient == nil {
		return nil, fmt.Errorf("registry: %w", errContainerClientRequired)
	}

	return []envtypes.Env{
		envlocaltest.NewEnv(resolved.cfg, resolved.out, resolved.containerClient),
	}, nil
}
