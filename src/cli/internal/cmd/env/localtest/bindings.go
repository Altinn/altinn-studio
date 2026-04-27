package localtest

import (
	"strconv"

	"altinn.studio/studioctl/internal/envtopology"
)

const (
	frontendDevServerTunnelTargetPort = 8080
	hostLoopbackAddress               = "127.0.0.1"
)

// BindingOptions controls which localtest bindings are active for the current run.
type BindingOptions struct {
	IncludeMonitoring bool
	IncludePgAdmin    bool
}

type bindingDefinition struct {
	ComponentID        envtopology.ComponentID
	Destination        envtopology.BoundTopologyDestination
	RequiresMonitoring bool
	RequiresPgAdmin    bool
}

// RuntimeBindings resolves localtest runtime bindings.
func RuntimeBindings(opts BindingOptions) []envtopology.RuntimeBinding {
	definitions := bindingDefinitions()
	bindings := make([]envtopology.RuntimeBinding, 0, len(definitions))
	for _, def := range definitions {
		bindings = append(bindings, envtopology.RuntimeBinding{
			ComponentID: def.ComponentID,
			Destination: def.Destination,
			Enabled:     bindingEnabled(def, opts),
		})
	}
	return bindings
}

//nolint:exhaustruct // Keep localtest runtime bindings explicit in one place.
func bindingDefinitions() []bindingDefinition {
	return []bindingDefinition{
		{
			ComponentID: envtopology.ComponentApp,
			Destination: envtopology.BoundTopologyDestination{
				Location: envtopology.DestinationLocationHost,
				Kind:     envtopology.DestinationKindHTTP,
			},
		},
		{
			ComponentID: envtopology.ComponentPlatform,
		},
		{
			ComponentID:        envtopology.ComponentOTel,
			RequiresMonitoring: true,
		},
		{
			ComponentID: envtopology.ComponentPDF,
			Destination: envtopology.BoundTopologyDestination{
				Location: envtopology.DestinationLocationEnv,
				Kind:     envtopology.DestinationKindHTTP,
				URL:      "http://" + ContainerPDF3 + ":5031",
			},
		},
		{
			ComponentID: envtopology.ComponentGrafana,
			Destination: envtopology.BoundTopologyDestination{
				Location: envtopology.DestinationLocationEnv,
				Kind:     envtopology.DestinationKindHTTP,
				URL:      "http://" + ContainerMonitoringGrafana + ":3000",
			},
			RequiresMonitoring: true,
		},
		{
			ComponentID: envtopology.ComponentWorkflowEngine,
			Destination: envtopology.BoundTopologyDestination{
				Location: envtopology.DestinationLocationEnv,
				Kind:     envtopology.DestinationKindHTTP,
				URL:      "http://" + ContainerWorkflowEngine + ":8080",
			},
		},
		{
			ComponentID: envtopology.ComponentPgAdmin,
			Destination: envtopology.BoundTopologyDestination{
				Location: envtopology.DestinationLocationEnv,
				Kind:     envtopology.DestinationKindHTTP,
				URL:      "http://" + ContainerPgAdmin + ":80",
			},
			RequiresPgAdmin: true,
		},
		{
			ComponentID: envtopology.ComponentFrontendDevServer,
			Destination: envtopology.BoundTopologyDestination{
				Location: envtopology.DestinationLocationHost,
				Kind:     envtopology.DestinationKindHTTP,
				URL:      hostHTTPURL(frontendDevServerTunnelTargetPort),
			},
		},
	}
}

func bindingEnabled(def bindingDefinition, opts BindingOptions) bool {
	if def.RequiresMonitoring && !opts.IncludeMonitoring {
		return false
	}
	if def.RequiresPgAdmin && !opts.IncludePgAdmin {
		return false
	}
	return true
}

func hostHTTPURL(port int) string {
	if port <= 0 {
		panic("localtest: host HTTP destination requires a positive port")
	}
	return "http://" + hostLoopbackAddress + ":" + strconv.Itoa(port)
}
