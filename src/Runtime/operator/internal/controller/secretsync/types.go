package secretsync

import "encoding/json"

// SecretSyncMapping defines a source secret to copy to a destination namespace.
type SecretSyncMapping struct {
	SourceName      string
	SourceNamespace string
	DestName        string
	DestNamespace   string
	// DestKey is the key name in the destination secret.
	// If empty, copies all source keys as-is.
	DestKey string
	// BuildOutput transforms source secret data to destination format.
	// If nil, copies raw bytes (requires DestKey to be empty).
	BuildOutput func(data map[string][]byte) ([]byte, error)
}

// DefaultMappings returns the default secret sync mappings.
func DefaultMappings() []SecretSyncMapping {
	return []SecretSyncMapping{
		{
			SourceNamespace: "grafana",
			SourceName:      "external-grafana-altinn-studio-gateway-token",
			DestNamespace:   "runtime-gateway",
			DestName:        "external-grafana-altinn-studio-gateway-token",
			DestKey:         "secrets.json",
			BuildOutput: func(data map[string][]byte) ([]byte, error) {
				return json.Marshal(map[string]any{
					"Grafana": map[string]any{
						"Token": string(data["token"]),
					},
				})
			},
		},
	}
}
