package components

import (
	"strconv"

	"altinn.studio/studioctl/internal/envtopology"
)

const (
	frontendDevServerTunnelTargetPort = 8080
	hostLoopbackAddress               = "127.0.0.1"
)

func registerTopologyComponents(manifest *Manifest, opts *Options) {
	manifest.addBinding(envtopology.RuntimeBinding{
		ComponentID: envtopology.ComponentApp,
		Destination: envtopology.BoundTopologyDestination{
			Location: envtopology.DestinationLocationHost,
			Kind:     envtopology.DestinationKindHTTP,
			URL:      "",
		},
		Enabled: true,
	})
	manifest.addBinding(envtopology.RuntimeBinding{
		ComponentID: envtopology.ComponentPlatform,
		Destination: envtopology.BoundTopologyDestination{
			Location: "",
			Kind:     "",
			URL:      "",
		},
		Enabled: true,
	})
	manifest.addBinding(envtopology.RuntimeBinding{
		ComponentID: envtopology.ComponentOTel,
		Destination: envtopology.BoundTopologyDestination{
			Location: "",
			Kind:     "",
			URL:      "",
		},
		Enabled: opts.IncludeMonitoring,
	})
	manifest.addBinding(envtopology.RuntimeBinding{
		ComponentID: envtopology.ComponentGrafana,
		Destination: envtopology.BoundTopologyDestination{
			Location: envtopology.DestinationLocationEnv,
			Kind:     envtopology.DestinationKindHTTP,
			URL:      "http://" + ContainerMonitoringGrafana + ":3000",
		},
		Enabled: opts.IncludeMonitoring,
	})
	manifest.addBinding(envtopology.RuntimeBinding{
		ComponentID: envtopology.ComponentFrontendDevServer,
		Destination: envtopology.BoundTopologyDestination{
			Location: envtopology.DestinationLocationHost,
			Kind:     envtopology.DestinationKindHTTP,
			URL:      hostHTTPURL(frontendDevServerTunnelTargetPort),
		},
		Enabled: true,
	})
}

func hostHTTPURL(port int) string {
	if port <= 0 {
		panic("localtest: host HTTP destination requires a positive port")
	}
	return "http://" + hostLoopbackAddress + ":" + strconv.Itoa(port)
}
