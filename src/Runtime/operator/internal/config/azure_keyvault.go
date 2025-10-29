package config

import (
	"fmt"
	"time"

	"altinn.studio/operator/internal/operatorcontext"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azsecrets"
)

func loadFromAzureKeyVault(operatorContext *operatorcontext.Context) (*Config, error) {
	span := operatorContext.StartSpan("GetConfig.AzureKeyVault")
	defer span.End()

	var cred azcore.TokenCredential
	var err error

	if operatorContext.IsLocal() {
		cred, err = azidentity.NewDefaultAzureCredential(nil)
	} else {
		cred, err = azidentity.NewWorkloadIdentityCredential(nil)
	}

	if err != nil {
		return nil, fmt.Errorf("error getting credentials for loading config: %w", err)
	}

	url := fmt.Sprintf("https://altinn-%s-operator-kv.vault.azure.net", operatorContext.Environment)
	client, err := azsecrets.NewClient(url, cred, nil)
	if err != nil {
		return nil, fmt.Errorf("error building client for Azure KV: %w", err)
	}

	config := &Config{}
	err = loadMaskinportenApiFromAzureKeyVault(operatorContext, client, config)
	if err != nil {
		return nil, err
	}

	err = loadControllerFromAzureKeyVault(operatorContext, client, config)
	if err != nil {
		return nil, err
	}

	return config, nil
}

func loadMaskinportenApiFromAzureKeyVault(
	operatorContext *operatorcontext.Context,
	client *azsecrets.Client,
	config *Config,
) error {
	secretKeys := []string{"ClientId", "Url", "Jwk", "Scope"}

	for _, secretKey := range secretKeys {
		secret, err := client.GetSecret(
			operatorContext.Context,
			fmt.Sprintf("%s.%s", "MaskinportenApi", secretKey),
			"",
			nil,
		)
		if err != nil {
			return fmt.Errorf("error getting secret: %s, %w", secretKey, err)
		}

		switch secretKey {
		case fmt.Sprintf("%s.%s", "MaskinportenApi", "ClientId"):
			config.MaskinportenApi.ClientId = *secret.Value
		case fmt.Sprintf("%s.%s", "MaskinportenApi", "AuthorityUrl"):
			config.MaskinportenApi.AuthorityUrl = *secret.Value
		case fmt.Sprintf("%s.%s", "MaskinportenApi", "Jwk"):
			config.MaskinportenApi.Jwk = *secret.Value
		case fmt.Sprintf("%s.%s", "MaskinportenApi", "Scope"):
			config.MaskinportenApi.Scope = *secret.Value
		}
	}

	return nil
}

func loadControllerFromAzureKeyVault(
	operatorContext *operatorcontext.Context,
	client *azsecrets.Client,
	config *Config,
) error {
	secretKeys := []string{"RequeueAfter"}

	for _, secretKey := range secretKeys {
		secret, err := client.GetSecret(
			operatorContext.Context,
			fmt.Sprintf("%s.%s", "Controller", secretKey),
			"",
			nil,
		)
		if err != nil {
			return fmt.Errorf("error getting secret: %s, %w", secretKey, err)
		}

		switch secretKey {
		case fmt.Sprintf("%s.%s", "Controller", "RequeueAfter"):
			config.Controller.RequeueAfter, err = time.ParseDuration(*secret.Value)
			if err != nil {
				return err
			}
		}
	}

	return nil
}
