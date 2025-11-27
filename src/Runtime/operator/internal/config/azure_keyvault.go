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
	"go.opentelemetry.io/otel/trace"
)

type azureKeyVaultClient struct {
	tracer trace.Tracer
	client *azsecrets.Client
}

// LoadSecrets loads sensitive configuration (client_id, jwk) from Azure Key Vault
// and overlays them onto the provided config.
func (a *azureKeyVaultClient) LoadSecrets(ctx context.Context, cfg *Config) error {
	ctx, span := a.tracer.Start(ctx, "AzureKeyVaultClient.LoadSecrets")
	defer span.End()

	clientId, err := a.tryGetSecret(ctx, "MaskinportenApi--ClientId")
	if err != nil {
		return err
	}
	if clientId != "" {
		cfg.MaskinportenApi.ClientId = clientId
	}

	jwk, err := a.tryGetSecret(ctx, "MaskinportenApi--Jwk")
	if err != nil {
		return err
	}
	if jwk != "" {
		cfg.MaskinportenApi.Jwk = jwk
	}

	return nil
}

func (a *azureKeyVaultClient) tryGetSecret(ctx context.Context, name string) (string, error) {
	ctx, span := a.tracer.Start(ctx, "AzureKeyVaultClient.tryGetSecret")
	defer span.End()

	secretResp, err := a.client.GetSecret(ctx, name, "", nil)
	if err != nil {
		if respErr, ok := err.(*azcore.ResponseError); ok {
			if respErr.StatusCode == 404 || respErr.StatusCode == 204 {
				return "", nil
			}
			return "", fmt.Errorf("error getting secret %s: %w", name, err)
		}
		return "", fmt.Errorf("error getting secret %s: %w", name, err)
	}

	return *secretResp.Value, nil
}

func NewAzureKeyVaultClient(ctx context.Context, environment string) (*azureKeyVaultClient, error) {
	tracer := otel.Tracer(telemetry.ServiceName)
	_, span := tracer.Start(ctx, "NewAzureKeyVaultClient")
	defer span.End()

	var cred azcore.TokenCredential
	var err error

	if environment == operatorcontext.EnvironmentLocal {
		cred, err = azidentity.NewDefaultAzureCredential(nil)
	} else {
		cred, err = azidentity.NewWorkloadIdentityCredential(nil)
	}

	if err != nil {
		return nil, fmt.Errorf("error getting credentials for Azure Key Vault: %w", err)
	}

	url := fmt.Sprintf("https://mpo-%s-kv.vault.azure.net/", environment)
	client, err := azsecrets.NewClient(url, cred, nil)
	if err != nil {
		return nil, fmt.Errorf("error building client for Azure Key Vault: %w", err)
	}

	return &azureKeyVaultClient{
		tracer: tracer,
		client: client,
	}, nil
}
