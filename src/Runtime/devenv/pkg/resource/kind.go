//nolint:revive // Resource method names are fixed by interfaces.
package resource

import (
	"errors"
	"strings"
)

var (
	errRegistryMirrorHostRequired     = errors.New("registry mirror host is required")
	errRegistryMirrorEndpointRequired = errors.New("registry mirror endpoint reference is required")
)

const kindClusterIDPrefix = "kind-cluster:"

// KindRegistryMirror describes a registry mirror that should be configured in kind nodes.
type KindRegistryMirror struct {
	Enabled  *bool
	Host     string
	Endpoint ResourceRef
	Upstream string
}

func (m KindRegistryMirror) IsEnabled() bool {
	return Enabled(m.Enabled)
}

// KindCluster represents a local kind cluster.
type KindCluster struct {
	Enabled             *bool
	Name                string
	Variant             string
	CachePath           string
	TrustedCABundlePath string
	RegistryMirrors     []KindRegistryMirror
	Lifecycle           LifecycleOptions
	DependsOn           []ResourceRef
}

func (r *KindCluster) ID() ResourceID {
	return KindClusterID(r.Name)
}

// KindClusterID returns the stable resource ID for a kind cluster name.
func KindClusterID(name string) ResourceID {
	return ResourceID(kindClusterIDPrefix + name)
}

// KindClusterNameFromRef resolves the kind cluster name from a resource reference.
func KindClusterNameFromRef(ref ResourceRef) (string, bool) {
	if cluster, ok := ref.Resource().(*KindCluster); ok {
		return cluster.Name, cluster.Name != ""
	}
	return KindClusterNameFromID(ref.ID())
}

// KindClusterNameFromID resolves the kind cluster name from a kind cluster resource ID.
func KindClusterNameFromID(id ResourceID) (string, bool) {
	name, ok := strings.CutPrefix(id.String(), kindClusterIDPrefix)
	if !ok || name == "" {
		return "", false
	}
	return name, true
}

func (r *KindCluster) Dependencies() []ResourceRef {
	deps := cloneRefs(r.DependsOn)
	for _, mirror := range r.RegistryMirrors {
		if !mirror.IsEnabled() {
			continue
		}
		if mirror.Endpoint.ID() != "" {
			deps = append(deps, mirror.Endpoint)
		}
	}
	return deps
}

func (r *KindCluster) LifecycleOptions() LifecycleOptions {
	return r.Lifecycle
}

func (r *KindCluster) IsEnabled() bool {
	return Enabled(r.Enabled)
}

func (r *KindCluster) Validate() error {
	if err := validateName(r.Name); err != nil {
		return err
	}
	for _, mirror := range r.RegistryMirrors {
		if !mirror.IsEnabled() {
			continue
		}
		if mirror.Host == "" {
			return errRegistryMirrorHostRequired
		}
		if err := validateRef(mirror.Endpoint, errRegistryMirrorEndpointRequired); err != nil {
			return err
		}
	}
	return nil
}

var (
	_ Resource                 = (*KindCluster)(nil)
	_ Validator                = (*KindCluster)(nil)
	_ EnablementProvider       = (*KindCluster)(nil)
	_ LifecycleOptionsProvider = (*KindCluster)(nil)
)
