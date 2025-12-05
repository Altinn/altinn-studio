package secretsync

// SecretSyncMapping defines a source secret to copy to a destination namespace.
type SecretSyncMapping struct {
	SourceName      string
	SourceNamespace string
	DestName        string
	DestNamespace   string
}

// DefaultMappings returns the default secret sync mappings.
func DefaultMappings() []SecretSyncMapping {
	return []SecretSyncMapping{
		{
			SourceNamespace: "grafana",
			SourceName:      "external-grafana-altinn-studio-gateway-token",
			DestNamespace:   "runtime-gateway",
			DestName:        "external-grafana-altinn-studio-gateway-token",
		},
	}
}
