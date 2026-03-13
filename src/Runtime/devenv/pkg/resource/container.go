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
	Image         ResourceRef
	Labels        map[string]string
	Name          string
	RestartPolicy string
	User          string
	Networks      []ResourceRef
	Ports         []types.PortMapping
	Volumes       []types.VolumeMount
	Env           []string
	Command       []string
	ExtraHosts    []string
}

// ID returns the unique identifier for this container.
func (c *Container) ID() ResourceID {
	return ResourceID("container:" + c.Name)
}

// Dependencies returns resources that must be applied before this container.
// Always includes the image and all networks.
func (c *Container) Dependencies() []ResourceRef {
	deps := make([]ResourceRef, 0, 1+len(c.Networks))
	deps = append(deps, c.Image)
	deps = append(deps, c.Networks...)
	return deps
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
	_ Resource  = (*Container)(nil)
	_ Validator = (*Container)(nil)
)
