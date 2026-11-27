package secretsync

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"sigs.k8s.io/controller-runtime/pkg/client"

	"altinn.studio/operator/internal/grafanaapi"
)

var errGrafanaCRHasNoExternalSpec = errors.New("grafana CR has no external spec")

// SecretSyncMapping defines a source secret to copy to a destination namespace. Several mappings can share a source.
//
// BuildOutput writes one key, DestKey, into the destination. BuildData writes the destination's whole data instead,
// and takes precedence. Without either, the destination gets a copy of the source's data.
//
// The destination gets the source's labels and annotations, unless OwnMetadata is set. Either way the operator
// labels it as its own.
type SecretSyncMapping struct {
	BuildOutput     func(ctx context.Context, k8sClient client.Client, data map[string][]byte) ([]byte, error)
	BuildData       func(ctx context.Context, k8sClient client.Client, data map[string][]byte) (map[string][]byte, error)
	ClearOutput     func() []byte
	SourceName      string
	SourceNamespace string
	DestName        string
	DestNamespace   string
	DestKey         string
	CanDeleteDest   bool
	OwnMetadata     bool
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
			CanDeleteDest:   false,
			ClearOutput:     func() []byte { return []byte("{}") },
			BuildOutput: func(ctx context.Context, k8sClient client.Client, data map[string][]byte) ([]byte, error) {
				grafana := grafanaapi.NewGrafana("grafana", "external-grafana")
				// Grafana operator is used in tt02 and prod
				// and that is also where the source secret exists.
				// We rely on Grafana operator to create the token, and we just enrich
				// it with the URL of the Grafana instance.
				key := client.ObjectKey{Namespace: "grafana", Name: "external-grafana"}
				if err := k8sClient.Get(ctx, key, grafana); err != nil {
					return nil, fmt.Errorf("get Grafana CR: %w", err)
				}
				grafanaURL, hasExternal, err := grafanaapi.ExternalURL(grafana)
				if err != nil {
					return nil, fmt.Errorf("read Grafana external URL: %w", err)
				}
				if !hasExternal {
					return nil, errGrafanaCRHasNoExternalSpec
				}
				return json.Marshal(map[string]any{
					"Grafana": map[string]any{
						"Token": string(data["token"]),
						"Url":   grafanaURL,
					},
				})
			},
		},
		{
			// v8 apps read it from their environment, through envFrom in src/App/azure-pipelines/deploy-app.yaml,
			// so the deploy no longer looks it up in the service owner's subscription.
			SourceNamespace: appInsightsSourceNamespace,
			SourceName:      appInsightsSourceName,
			DestNamespace:   "default",
			DestName:        "apps-runtime-telemetry-env",
			CanDeleteDest:   true,
			// The source's metadata is the ExternalSecret's, such as its data hash, and would mark the copy as
			// managed by External Secrets.
			OwnMetadata: true,
			// An invalid value fails the sync, so the destination keeps the last valid one.
			BuildData: func(_ context.Context, _ client.Client, data map[string][]byte) (map[string][]byte, error) {
				cs, err := parseConnectionString(data[appInsightsSourceKey])
				if err != nil {
					return nil, err
				}
				return map[string][]byte{
					"ApplicationInsights__ConnectionString":   []byte(cs.value),
					"ApplicationInsights__InstrumentationKey": []byte(cs.instrumentationKey),
				}, nil
			},
		},
	}
}
