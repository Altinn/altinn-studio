// Package envtopology resolves externally visible local environment URLs.
package envtopology

import "strconv"

const (
	// DefaultIngressPort is the default local environment ingress port.
	DefaultIngressPort = 8000

	defaultScheme      = "http"
	localDomain        = "local.altinn.cloud"
	appHost            = localDomain
	platformHost       = localDomain
	otelHost           = "otel." + localDomain
	pdfHost            = "pdf." + localDomain
	pgAdminHost        = "pgadmin." + localDomain
	workflowEngineHost = "workflow-engine." + localDomain
	frontendHost       = "app-frontend." + localDomain
	otelPort           = "4317"
)

// Local describes externally visible URLs for the local environment.
type Local struct {
	ingressPort string
}

// NewLocal returns the local environment topology.
func NewLocal(ingressPort string) Local {
	if ingressPort == "" {
		ingressPort = DefaultIngressPortString()
	}
	return Local{ingressPort: ingressPort}
}

// DefaultIngressPortString returns the default ingress port as a string.
func DefaultIngressPortString() string {
	return strconv.Itoa(DefaultIngressPort)
}

// IngressPort returns the local environment ingress port.
func (l Local) IngressPort() string {
	return l.ingressPort
}

// AppHostName returns the local app host name.
func (l Local) AppHostName() string {
	return appHost
}

// PDFHostName returns the local PDF service host name.
func (l Local) PDFHostName() string {
	return pdfHost
}

// WorkflowEngineHostName returns the local workflow engine host name.
func (l Local) WorkflowEngineHostName() string {
	return workflowEngineHost
}

// PgAdminHostName returns the local pgAdmin host name.
func (l Local) PgAdminHostName() string {
	return pgAdminHost
}

// FrontendDevServerHostName returns the local frontend dev server host name.
func (l Local) FrontendDevServerHostName() string {
	return frontendHost
}

// LocaltestBaseURL returns the localtest ingress URL.
func (l Local) LocaltestBaseURL() string {
	return l.url(appHost)
}

// LocaltestURL returns the browser-facing localtest URL.
func (l Local) LocaltestURL() string {
	if l.ingressPort == "80" {
		return defaultScheme + "://" + l.AppHostName()
	}
	return l.LocaltestBaseURL()
}

// AppBaseURL returns the local app URL template.
func (l Local) AppBaseURL() string {
	return l.LocaltestBaseURL() + "/{org}/{app}/"
}

// PlatformAPIBaseURL returns the base URL for local platform APIs.
func (l Local) PlatformAPIBaseURL() string {
	return l.url(platformHost)
}

// OTelURL returns the local OTLP endpoint URL.
func (l Local) OTelURL() string {
	return defaultScheme + "://" + l.OTelHost() + ":" + otelPort
}

// PDFURL returns the local PDF service endpoint URL.
func (l Local) PDFURL() string {
	return l.url(pdfHost) + "/pdf"
}

// WorkflowEngineURL returns the local workflow engine API endpoint URL.
func (l Local) WorkflowEngineURL() string {
	return l.url(workflowEngineHost) + "/api/v1/"
}

// LocaltestIngressHosts returns the hostnames routed through localtest.
func (l Local) LocaltestIngressHosts() []string {
	hosts := []string{
		appHost,
		pdfHost,
		workflowEngineHost,
		pgAdminHost,
		frontendHost,
	}
	return hosts
}

// OTelHost returns the local OpenTelemetry collector host name.
func (l Local) OTelHost() string {
	return otelHost
}

func (l Local) url(host string) string {
	return defaultScheme + "://" + host + ":" + l.ingressPort
}
