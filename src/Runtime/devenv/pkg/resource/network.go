package resource

import "errors"

var errNetworkNameRequired = errors.New("network name is required")

// Network is a resource representing a container network.
// It is a pure value type - use Executor to apply to infrastructure.
type Network struct {
	Enabled   *bool
	Labels    map[string]string
	Lifecycle LifecycleOptions
	Name      string
	Driver    string
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

// LifecycleOptions returns resource lifecycle behavior.
func (n *Network) LifecycleOptions() LifecycleOptions {
	return n.Lifecycle
}

// NetworkName returns the network name for container API calls.
func (n *Network) NetworkName() string {
	return n.Name
}

// IsEnabled reports whether this network participates in graph execution.
func (n *Network) IsEnabled() bool {
	return Enabled(n.Enabled)
}

// Validate checks that the network configuration is valid.
func (n *Network) Validate() error {
	if n.Name == "" {
		return errNetworkNameRequired
	}
	return nil
}

// NetworkResource provides access to the network name.
// Used by Container to reference networks.
type NetworkResource interface {
	Resource
	NetworkName() string
}

// Compile-time interface checks.
var (
	_ Resource                 = (*Network)(nil)
	_ NetworkResource          = (*Network)(nil)
	_ Validator                = (*Network)(nil)
	_ EnablementProvider       = (*Network)(nil)
	_ LifecycleOptionsProvider = (*Network)(nil)
)
