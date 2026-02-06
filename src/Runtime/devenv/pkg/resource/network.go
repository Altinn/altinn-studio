package resource

import "errors"

// Network is a resource representing a container network.
// It is a pure value type - use Executor to apply to infrastructure.
type Network struct {
	Name   string
	Driver string // "bridge", "host", "none" (default: "bridge")
	Labels map[string]string
}

// ID returns the unique identifier for this network.
func (n *Network) ID() ResourceID {
	return ResourceID("network:" + n.Name)
}

// Dependencies returns resources that must be applied before this network.
// Networks have no dependencies.
func (n *Network) Dependencies() []ResourceRef {
	return nil
}

// NetworkName returns the network name for container API calls.
func (n *Network) NetworkName() string {
	return n.Name
}

// Validate checks that the network configuration is valid.
func (n *Network) Validate() error {
	if n.Name == "" {
		return errors.New("network name is required")
	}
	return nil
}

// NetworkResource provides access to the network name.
// Used by Container to reference networks.
type NetworkResource interface {
	Resource
	NetworkName() string
}

// Compile-time interface checks
var (
	_ Resource        = (*Network)(nil)
	_ NetworkResource = (*Network)(nil)
	_ Validator       = (*Network)(nil)
)
