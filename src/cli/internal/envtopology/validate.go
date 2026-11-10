package envtopology

import (
	"errors"
	"fmt"
	"strings"
)

const (
	componentKindApp            = "app"
	componentKindPlatform       = "platform"
	componentKindTelemetry      = "telemetry"
	componentKindRuntimeService = "runtime-service"
	componentKindMonitoring     = "monitoring"
	componentKindTool           = "tool"
	componentKindFrontendDev    = "frontend-dev"
)

var (
	errUnsupportedTopologyVersion = errors.New("unsupported topology version")
	errFieldRequired              = errors.New("field is required")
	errFieldMustStartWithSlash    = errors.New("field must start with '/'")
	errFieldMustNotContainPath    = errors.New("field must not contain a path")
	errFieldPortOutOfRange        = errors.New("field port must be between 1 and 65535")
	errFieldMustBeEmptyForKind    = errors.New("field must be empty for kind")
	errUnsupportedComponentKind   = errors.New("unsupported component kind")
)

func validateDefinition(def definition) error {
	if def.Version != supportedVersion {
		return fmt.Errorf("%w: %d", errUnsupportedTopologyVersion, def.Version)
	}

	if trimSchemeSeparator(def.Ingress.Scheme) == "" {
		return fmt.Errorf("%s: %w", "ingress.scheme", errFieldRequired)
	}
	if err := validatePort(def.Ingress.DefaultHostPort, "ingress.defaultHostPort"); err != nil {
		return err
	}

	components := map[string]componentDefinition{
		"components.app":               def.Components.App,
		"components.platform":          def.Components.Platform,
		"components.otel":              def.Components.OTel,
		"components.pdf":               def.Components.PDF,
		"components.grafana":           def.Components.Grafana,
		"components.pgadmin":           def.Components.PgAdmin,
		"components.workflowEngine":    def.Components.WorkflowEngine,
		"components.frontendDevServer": def.Components.FrontendDevServer,
	}
	for field, component := range components {
		if err := validateComponent(field, component); err != nil {
			return err
		}
	}
	return validatePathPrefixTemplate(
		"appRouteTemplate.pathPrefixTemplate",
		def.AppRouteTemplate.PathPrefixTemplate,
	)
}

func validateComponent(field string, component componentDefinition) error {
	if err := validateHost(field+".host", component.Host); err != nil {
		return err
	}

	switch component.Kind {
	case componentKindApp:
		if component.PathPrefix != "" {
			return fmt.Errorf("%s.pathPrefix: %w %q", field, errFieldMustBeEmptyForKind, component.Kind)
		}
		if component.Port != 0 {
			return fmt.Errorf("%s.port: %w %q", field, errFieldMustBeEmptyForKind, component.Kind)
		}
	case componentKindPlatform:
		return validateHTTPComponent(field, component)
	case componentKindTelemetry:
		if component.PathPrefix != "" {
			return fmt.Errorf("%s.pathPrefix: %w %q", field, errFieldMustBeEmptyForKind, component.Kind)
		}
		if err := validatePort(component.Port, field+".port"); err != nil {
			return err
		}
	case componentKindRuntimeService, componentKindMonitoring, componentKindTool, componentKindFrontendDev:
		return validateHTTPComponent(field, component)
	default:
		return fmt.Errorf("%s.kind: %w %q", field, errUnsupportedComponentKind, component.Kind)
	}

	return nil
}

func validateHTTPComponent(field string, component componentDefinition) error {
	if component.Port != 0 {
		return fmt.Errorf("%s.port: %w %q", field, errFieldMustBeEmptyForKind, component.Kind)
	}
	if component.PathPrefix != "" {
		if err := validatePathPrefix(field+".pathPrefix", component.PathPrefix); err != nil {
			return err
		}
	}
	return nil
}

func validatePort(port int, field string) error {
	if port < 1 || port > 65535 {
		return fmt.Errorf("%s: %w", field, errFieldPortOutOfRange)
	}
	return nil
}

func validateHost(field, host string) error {
	host = strings.TrimSpace(host)
	if host == "" {
		return fmt.Errorf("%s: %w", field, errFieldRequired)
	}
	if strings.Contains(host, "/") {
		return fmt.Errorf("%s: %w", field, errFieldMustNotContainPath)
	}
	return nil
}

func validatePathPrefix(field, path string) error {
	if path == "" {
		return fmt.Errorf("%s: %w", field, errFieldRequired)
	}
	if !strings.HasPrefix(path, "/") {
		return fmt.Errorf("%s: %w", field, errFieldMustStartWithSlash)
	}
	return nil
}

func validatePathPrefixTemplate(field, path string) error {
	if strings.TrimSpace(path) == "" {
		return fmt.Errorf("%s: %w", field, errFieldRequired)
	}
	if !strings.HasPrefix(path, "/") {
		return fmt.Errorf("%s: %w", field, errFieldMustStartWithSlash)
	}
	return nil
}
