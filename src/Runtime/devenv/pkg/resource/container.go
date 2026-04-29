package resource

import (
	"errors"

	"altinn.studio/devenv/pkg/container/types"
)

var (
	errContainerNameRequired  = errors.New("container name is required")
	errContainerImageRequired = errors.New("container image is required")
)

// Container is a resource representing a container.
// It is a pure value type - use Executor to apply to infrastructure.
type Container struct {
	HealthCheck    *types.HealthCheck
	Image          ResourceRef
	Enabled        *bool
	Labels         map[string]string
	Lifecycle      ContainerLifecycleOptions
	Name           string
	RestartPolicy  string
	User           string
	Networks       []ResourceRef
	DependsOn      []ResourceRef
	Ports          []types.PortMapping
	Volumes        []types.VolumeMount
	Env            []string
	Command        []string
	ExtraHosts     []string
	NetworkAliases []string
}

// ID returns the unique identifier for this container.
func (c *Container) ID() ResourceID {
	return ContainerID(c.Name)
}

// ContainerID returns the unique resource ID for a container name.
func ContainerID(name string) ResourceID {
	return ResourceID("container:" + name)
}

// Dependencies returns resources that must be applied before this container.
// Includes the image, all networks, and any explicit container dependencies.
func (c *Container) Dependencies() []ResourceRef {
	deps := make([]ResourceRef, 0, 1+len(c.Networks)+len(c.DependsOn))
	deps = append(deps, c.Image)
	deps = append(deps, c.Networks...)
	deps = append(deps, c.DependsOn...)
	return deps
}

// LifecycleOptions returns shared resource lifecycle behavior.
func (c *Container) LifecycleOptions() LifecycleOptions {
	return c.Lifecycle.LifecycleOptions
}

// IsEnabled reports whether this container participates in graph execution.
func (c *Container) IsEnabled() bool {
	return Enabled(c.Enabled)
}

// Validate checks that the container configuration is valid.
func (c *Container) Validate() error {
	if c.Name == "" {
		return errContainerNameRequired
	}
	if c.Image.ID() == "" {
		return errContainerImageRequired
	}
	return nil
}

// Compile-time interface checks.
var (
	_ Resource                 = (*Container)(nil)
	_ Validator                = (*Container)(nil)
	_ EnablementProvider       = (*Container)(nil)
	_ LifecycleOptionsProvider = (*Container)(nil)
)
