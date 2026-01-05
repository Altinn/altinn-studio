package resource

import (
	"errors"

	"altinn.studio/devenv/pkg/container/types"
)

// Container is a resource representing a container.
// It is a pure value type - use Executor to apply to infrastructure.
type Container struct {
	Name          string
	Image         ResourceRef   // Reference to an ImageResource
	Networks      []ResourceRef // References to NetworkResources
	Ports         []types.PortMapping
	Volumes       []types.VolumeMount
	Env           []string // KEY=VALUE pairs
	Labels        map[string]string
	Command       []string
	ExtraHosts    []string // "hostname:ip" pairs
	RestartPolicy string   // "no", "always", "on-failure", "unless-stopped"
	User          string   // "uid:gid" to run as (e.g., "1000:1000")
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
		return errors.New("container name is required")
	}
	if c.Image.ID() == "" {
		return errors.New("container image is required")
	}
	return nil
}

// Compile-time interface checks
var (
	_ Resource  = (*Container)(nil)
	_ Validator = (*Container)(nil)
)
