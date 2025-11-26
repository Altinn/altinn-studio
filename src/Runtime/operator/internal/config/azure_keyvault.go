package config

import (
	"context"
	"fmt"

	"altinn.studio/operator/internal/operatorcontext"
	"altinn.studio/operator/internal/telemetry"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azsecrets"
	"go.opentelemetry.io/otel"
)

// loadSecretsFromKeyVault loads sensitive configuration (client_id, jwk) from Azure Key Vault
// and overlays them onto the existing config. Other configuration values come from the config file.
func loadSecretsFromKeyVault(ctx context.Context, environment string, cfg *Config) error {
	tracer := otel.Tracer(telemetry.ServiceName)
	ctx, span := tracer.Start(ctx, "GetConfig.AzureKeyVault")
	defer span.End()

	var cred azcore.TokenCredential
	var err error

	if environment == operatorcontext.EnvironmentLocal {
		cred, err = azidentity.NewDefaultAzureCredential(nil)
	} else {
		cred, err = azidentity.NewWorkloadIdentityCredential(nil)
	}

	if err != nil {
		return fmt.Errorf("error getting credentials for loading secrets: %w", err)
	}

	url := fmt.Sprintf("https://mpo-%s-kv.vault.azure.net/", environment)
	client, err := azsecrets.NewClient(url, cred, nil)
	if err != nil {
		return fmt.Errorf("error building client for Azure KV: %w", err)
	}

	// Load client_id
	clientIdSecret, err := client.GetSecret(ctx, "MaskinportenApi.ClientId", "", nil)
	if err != nil {
		return fmt.Errorf("error getting secret MaskinportenApi.ClientId: %w", err)
	}
	cfg.MaskinportenApi.ClientId = *clientIdSecret.Value

	// Load jwk
	jwkSecret, err := client.GetSecret(ctx, "MaskinportenApi.Jwk", "", nil)
	if err != nil {
		return fmt.Errorf("error getting secret MaskinportenApi.Jwk: %w", err)
	}
	cfg.MaskinportenApi.Jwk = *jwkSecret.Value

	return nil
}
