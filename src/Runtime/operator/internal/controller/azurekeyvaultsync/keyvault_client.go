package azurekeyvaultsync

import (
	"context"
	"fmt"

	"github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azsecrets"
)

type KeyVaultSecretsClient interface {
	GetSecret(ctx context.Context, name string, version string) (string, error)
}

type azureKeyVaultSecretsClient struct {
	client *azsecrets.Client
}

func (c *azureKeyVaultSecretsClient) GetSecret(ctx context.Context, name, version string) (string, error) {
	resp, err := c.client.GetSecret(ctx, name, version, nil)
	if err != nil {
		return "", err
	}
	if resp.Value == nil {
		return "", fmt.Errorf("secret %q has nil value", name)
	}
	return *resp.Value, nil
}

func newAzureKeyVaultSecretsClient(client *azsecrets.Client) KeyVaultSecretsClient {
	return &azureKeyVaultSecretsClient{client: client}
}
