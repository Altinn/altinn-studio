package envtopology

import "fmt"

// ComponentID identifies a topology component.
type ComponentID string

// Known topology components.
const (
	ComponentApp               ComponentID = "app"
	ComponentPlatform          ComponentID = "platform"
	ComponentOTel              ComponentID = "otel"
	ComponentPDF               ComponentID = "pdf"
	ComponentGrafana           ComponentID = "grafana"
	ComponentPgAdmin           ComponentID = "pgadmin"
	ComponentWorkflowEngine    ComponentID = "workflowEngine"
	ComponentFrontendDevServer ComponentID = "frontendDevServer"
)

// Component describes one topology component within a local environment.
type Component struct {
	id       ComponentID
	def      componentDefinition
	topology Local
}

// Component returns the named component when it exists.
func (l Local) Component(id ComponentID) (Component, bool) {
	var def componentDefinition
	switch id {
	case ComponentApp:
		def = l.def.Components.App
	case ComponentPlatform:
		def = l.def.Components.Platform
	case ComponentOTel:
		def = l.def.Components.OTel
	case ComponentPDF:
		def = l.def.Components.PDF
	case ComponentGrafana:
		def = l.def.Components.Grafana
	case ComponentPgAdmin:
		def = l.def.Components.PgAdmin
	case ComponentWorkflowEngine:
		def = l.def.Components.WorkflowEngine
	case ComponentFrontendDevServer:
		def = l.def.Components.FrontendDevServer
	default:
		var zero Component
		return zero, false
	}

	return Component{
		id:       id,
		topology: l,
		def:      def,
	}, true
}

// MustComponent returns the named component or panics if it is not defined.
func (l Local) MustComponent(id ComponentID) Component {
	component, ok := l.Component(id)
	if ok {
		return component
	}

	panic(fmt.Sprintf("envtopology: unknown component %q", id))
}

// ID returns the component identifier.
func (c Component) ID() ComponentID {
	return c.id
}

// Kind returns the component kind from topology.yaml.
func (c Component) Kind() string {
	return c.def.Kind
}

// Host returns the externally visible host for the component.
func (c Component) Host() string {
	return c.def.Host
}

// PathPrefix returns the component route path prefix, if any.
func (c Component) PathPrefix() string {
	return c.def.PathPrefix
}

// Port returns the component port, if any.
func (c Component) Port() int {
	return c.def.Port
}
