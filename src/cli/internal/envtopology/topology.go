// Package envtopology resolves externally visible local environment URLs.
package envtopology

import (
	"slices"
	"strconv"
	"strings"
)

// Local describes externally visible URLs for the local environment.
type Local struct {
	ingressPort string
	def         definition
}

// NewLocal returns the local environment topology.
func NewLocal(ingressPort string) Local {
	def := defaultDefinition()
	if ingressPort == "" {
		ingressPort = strconv.Itoa(def.Ingress.DefaultHostPort)
	}
	return Local{
		ingressPort: ingressPort,
		def:         def,
	}
}

// DefaultIngressPortString returns the default ingress port as a string.
func DefaultIngressPortString() string {
	return strconv.Itoa(defaultDefinition().Ingress.DefaultHostPort)
}

// IngressPort returns the local environment ingress port.
func (l Local) IngressPort() string {
	return l.ingressPort
}

// IsZero reports whether the topology value has not been initialized.
func (l Local) IsZero() bool {
	return l.ingressPort == "" && l.def.Version == 0
}

// AppHostName returns the local app host name.
func (l Local) AppHostName() string {
	return l.MustComponent(ComponentApp).Host()
}

// PDFHostName returns the local PDF service host name.
func (l Local) PDFHostName() string {
	return l.MustComponent(ComponentPDF).Host()
}

// WorkflowEngineHostName returns the local workflow engine host name.
func (l Local) WorkflowEngineHostName() string {
	return l.MustComponent(ComponentWorkflowEngine).Host()
}

// PgAdminHostName returns the local pgAdmin host name.
func (l Local) PgAdminHostName() string {
	return l.MustComponent(ComponentPgAdmin).Host()
}

// FrontendDevServerHostName returns the local frontend dev server host name.
func (l Local) FrontendDevServerHostName() string {
	return l.MustComponent(ComponentFrontendDevServer).Host()
}

// LocaltestBaseURL returns the localtest ingress URL.
func (l Local) LocaltestBaseURL() string {
	return l.PublicBaseURL(ComponentApp)
}

// LocaltestURL returns the browser-facing localtest URL.
func (l Local) LocaltestURL() string {
	if l.ingressPort == "80" {
		return l.scheme() + "://" + l.AppHostName()
	}
	return l.LocaltestBaseURL()
}

// AppBaseURL returns the local app URL template.
func (l Local) AppBaseURL() string {
	return l.url(l.AppHostName()) + appBasePathTemplate(l.def.AppRouteTemplate.PathPrefixTemplate)
}

// PlatformAPIBaseURL returns the base URL for local platform APIs.
func (l Local) PlatformAPIBaseURL() string {
	return l.PublicBaseURL(ComponentPlatform)
}

// OTelURL returns the local OTLP endpoint URL.
func (l Local) OTelURL() string {
	component := l.MustComponent(ComponentOTel)
	if component.Port() == 0 {
		panic("envtopology: otel component requires a port")
	}
	return l.scheme() + "://" + component.Host() + ":" + strconv.Itoa(component.Port())
}

// PublicBaseURL returns the externally visible root URL for a component.
func (l Local) PublicBaseURL(id ComponentID) string {
	return l.url(l.MustComponent(id).Host())
}

// PublicRouteURL returns the externally visible URL for a route-shaped component.
func (l Local) PublicRouteURL(id ComponentID) string {
	component := l.MustComponent(id)
	return l.url(component.Host()) + component.PathPrefix()
}

// LocaltestIngressHosts returns the hostnames routed through localtest.
func (l Local) LocaltestIngressHosts() []string {
	return slicesClone([]string{
		l.MustComponent(ComponentApp).Host(),
		l.MustComponent(ComponentPDF).Host(),
		l.MustComponent(ComponentWorkflowEngine).Host(),
		l.MustComponent(ComponentPgAdmin).Host(),
		l.MustComponent(ComponentFrontendDevServer).Host(),
	})
}

// HostFileHostnames returns local environment hostnames that must resolve on the host machine.
func (l Local) HostFileHostnames() []string {
	return l.componentHosts(
		ComponentApp,
		ComponentPDF,
		ComponentWorkflowEngine,
		ComponentPgAdmin,
		ComponentFrontendDevServer,
		ComponentOTel,
	)
}

// OTelHost returns the local OpenTelemetry collector host name.
func (l Local) OTelHost() string {
	return l.MustComponent(ComponentOTel).Host()
}

func (l Local) scheme() string {
	return trimSchemeSeparator(l.def.Ingress.Scheme)
}

func (l Local) url(host string) string {
	return l.scheme() + "://" + host + ":" + l.ingressPort
}

func appBasePathTemplate(pathPrefixTemplate string) string {
	return strings.TrimRight(pathPrefixTemplate, "/") + "/"
}

func slicesClone(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	cloned := make([]string, len(values))
	copy(cloned, values)
	return cloned
}

func (l Local) componentHosts(ids ...ComponentID) []string {
	hosts := make([]string, 0, len(ids))
	for _, id := range ids {
		host := l.MustComponent(id).Host()
		if !slices.Contains(hosts, host) {
			hosts = append(hosts, host)
		}
	}
	return hosts
}
