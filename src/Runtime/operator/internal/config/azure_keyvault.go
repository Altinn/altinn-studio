package config

import (
	"context"
	"fmt"

	"altinn.studio/operator/internal/assert"
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

func (a *azureKeyVaultClient) loadSecrets(ctx context.Context, cfg *Config) error {
	ctx, span := a.tracer.Start(ctx, "AzureKeyVaultClient.loadSecrets")
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

func copyOldSecrets(dest *Config, src *Config) {
	assert.That(dest != nil, "Destination must be non-nil")
	if src == nil {
		return
	}
	dest.MaskinportenApi.ClientId = src.MaskinportenApi.ClientId
	dest.MaskinportenApi.Jwk = src.MaskinportenApi.Jwk
}

func (a *azureKeyVaultClient) tryGetSecret(ctx context.Context, name string) (string, error) {
	ctx, span := a.tracer.Start(ctx, "AzureKeyVaultClient.tryGetSecret")
	defer span.End()

	secretResp, err := a.client.GetSecret(ctx, name, "", nil)
	if err != nil {
		if respErr, ok := err.(*azcore.ResponseError); ok {
			if respErr.StatusCode == 404 {
				return "", nil
			}
		}
		return "", fmt.Errorf("error getting secret %s: %w", name, err)
	}

	if secretResp.Value == nil {
		return "", fmt.Errorf("secret value is nil for key %s", name)
	}

	return *secretResp.Value, nil
}

func newAzureKeyVaultClient(ctx context.Context, environment string) (*azureKeyVaultClient, error) {
	tracer := otel.Tracer(telemetry.ServiceName)
	_, span := tracer.Start(ctx, "NewAzureKeyVaultClient")
	defer span.End()

	cred, err := azidentity.NewDefaultAzureCredential(nil)

	if err != nil {
		return nil, fmt.Errorf("error getting credentials for Azure Key Vault: %w", err)
	}

	client, err := azsecrets.NewClient(KeyVaultURL(environment), cred, nil)
	if err != nil {
		return nil, fmt.Errorf("error building client for Azure Key Vault: %w", err)
	}

	return &azureKeyVaultClient{
		tracer: tracer,
		client: client,
	}, nil
}
