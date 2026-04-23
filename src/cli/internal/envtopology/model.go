package envtopology

type definition struct {
	Ingress    ingressDefinition    `yaml:"ingress"`
	Components componentsDefinition `yaml:"components"`
	Version    int                  `yaml:"version"`
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
	Kind        string `yaml:"kind"`
	Host        string `yaml:"host"`
	BasePath    string `yaml:"basePath,omitempty"`
	PathPattern string `yaml:"pathPattern,omitempty"`
	Port        int    `yaml:"port,omitempty"`
}
