package app

import (
	"strings"

	"altinn.studio/studioctl/internal/envtopology"
)

type appEndpointConfig struct {
	platform       string
	pdf            string
	workflowEngine string
}

func newAppEndpointConfig(topology envtopology.Local) appEndpointConfig {
	return appEndpointConfig{
		platform:       topology.PublicBaseURL(envtopology.ComponentPlatform),
		pdf:            serviceEndpoint(topology.PublicBaseURL(envtopology.ComponentPDF), "/pdf"),
		workflowEngine: serviceEndpoint(topology.PublicBaseURL(envtopology.ComponentWorkflowEngine), "/api/v1/"),
	}
}

func serviceEndpoint(baseURL, path string) string {
	return strings.TrimRight(baseURL, "/") + path
}
