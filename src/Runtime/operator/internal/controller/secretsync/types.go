package secretsync

import (
	"context"
	"encoding/json"
	"fmt"

	grafanav1beta1 "github.com/grafana/grafana-operator/v5/api/v1beta1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

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
	BuildOutput func(ctx context.Context, k8sClient client.Client, data map[string][]byte) ([]byte, error)
	// CanDeleteDest allows deletion of destination when source is deleted.
	// Set to false when destination may be mounted to pods.
	CanDeleteDest bool
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
			CanDeleteDest:   false, // Relied upon to exist by gateway
			BuildOutput: func(ctx context.Context, k8sClient client.Client, data map[string][]byte) ([]byte, error) {
				grafana := &grafanav1beta1.Grafana{}
				// Grafana operator is used in tt02 and prod
				// and that is also where the sourcce secret exists.
				// We rely on Grafana operator to create the token, and we just enrich
				// it with the URL of the Grafana instance.
				key := client.ObjectKey{Namespace: "grafana", Name: "external-grafana"}
				if err := k8sClient.Get(ctx, key, grafana); err != nil {
					return nil, fmt.Errorf("get Grafana CR: %w", err)
				}
				if grafana.Spec.External == nil {
					return nil, fmt.Errorf("grafana CR has no external spec")
				}
				return json.Marshal(map[string]any{
					"Grafana": map[string]any{
						"Token": string(data["token"]),
						"Url":   grafana.Spec.External.URL,
					},
				})
			},
		},
	}
}
