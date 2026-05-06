package components

import (
	"errors"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
)

const (
	// NetworkName is the name of the localtest network.
	NetworkName = "altinntestlocal_network"
)

func registerNetworkComponents(manifest *Manifest) {
	manifest.addNetwork(&resource.Network{
		Enabled: nil,
		Name:    NetworkName,
		Driver:  "bridge",
		Labels:  nil,
		Lifecycle: resource.LifecycleOptions{
			// When apps are started with `studioctl run --mode container ..`
			// we might have active containers attached to the network.
			HandleDestroyError: func(err error) resource.ErrorDecision {
				if errors.Is(err, types.ErrNetworkInUse) {
					return resource.ErrorDecisionIgnore
				}
				return resource.ErrorDecisionDefault
			},
			RetainOnDestroy: false,
		},
	})
}
