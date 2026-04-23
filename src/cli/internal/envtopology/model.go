package envtopology

type definition struct {
	Ingress          ingressDefinition          `yaml:"ingress"`
	AppRouteTemplate appRouteTemplateDefinition `yaml:"appRouteTemplate"`
	Components       componentsDefinition       `yaml:"components"`
	Version          int                        `yaml:"version"`
}

type ingressDefinition struct {
	Scheme          string `yaml:"scheme"`
	DefaultHostPort int    `yaml:"defaultHostPort"`
}

type componentsDefinition struct {
	App               componentDefinition `yaml:"app"`
	Platform          componentDefinition `yaml:"platform"`
	OTel              componentDefinition `yaml:"otel"`
	PDF               componentDefinition `yaml:"pdf"`
	Grafana           componentDefinition `yaml:"grafana"`
	PgAdmin           componentDefinition `yaml:"pgadmin"`
	WorkflowEngine    componentDefinition `yaml:"workflowEngine"`
	FrontendDevServer componentDefinition `yaml:"frontendDevServer"`
}

type componentDefinition struct {
	Kind       string `yaml:"kind"`
	Host       string `yaml:"host"`
	PathPrefix string `yaml:"pathPrefix,omitempty"`
	Port       int    `yaml:"port,omitempty"`
}

type appRouteTemplateDefinition struct {
	PathPrefixTemplate string `yaml:"pathPrefixTemplate"`
}
