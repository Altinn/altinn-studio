package azurekeyvaultsync

import (
	"context"
	"errors"
	"fmt"

	"github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azsecrets"
)

var errKeyVaultSecretNilValue = errors.New("secret has nil value")

type KeyVaultSecretsClient interface {
	GetSecret(ctx context.Context, name string, version string) (string, error)
}

type azureKeyVaultSecretsClient struct {
	client *azsecrets.Client
}

func (c *azureKeyVaultSecretsClient) GetSecret(ctx context.Context, name, version string) (string, error) {
	resp, err := c.client.GetSecret(ctx, name, version, nil)
	if err != nil {
		return "", fmt.Errorf("get secret %q from Key Vault: %w", name, err)
	}
	if resp.Value == nil {
		return "", fmt.Errorf("%w: %q", errKeyVaultSecretNilValue, name)
	}
	return *resp.Value, nil
}

func newAzureKeyVaultSecretsClient(client *azsecrets.Client) KeyVaultSecretsClient {
	return &azureKeyVaultSecretsClient{client: client}
}
