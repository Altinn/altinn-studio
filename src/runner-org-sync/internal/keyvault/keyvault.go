// Package keyvault resolves the Gitea Personal Access Token.
//
// Two sources are supported:
//
//   - an env-var override (for local development; sidesteps Azure auth entirely),
//   - Azure Key Vault, accessed via DefaultAzureCredential, which in-cluster
//     resolves to the Workload Identity federated token automatically.
//
// The Loader returns the resolved PAT along with a Source label so callers
// can log where the value came from (an accidental env-var fallback in
// production is then immediately visible).
package keyvault

import (
	"context"
	"errors"
	"fmt"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azsecrets"
)

// Source describes where a PAT came from.
type Source string

const (
	// SourceEnv means the PAT came from an environment override.
	SourceEnv Source = "env"
	// SourceKeyVault means the PAT came from Azure Key Vault.
	SourceKeyVault Source = "keyvault"
)

// ErrNoSource is returned when the loader has neither an env override nor a
// configured Key Vault Getter.
var ErrNoSource = errors.New("keyvault: no env override and no Key Vault getter configured")

var (
	// ErrEmptySecretValue is returned when a Key Vault secret exists but has no value.
	ErrEmptySecretValue = errors.New("keyvault: secret has empty value")
	errVaultNameEmpty   = errors.New("keyvault: vaultName is required")
)

// Getter abstracts secret retrieval. The production implementation wraps
// the Azure SDK; tests inject a stub.
type Getter interface {
	GetSecret(ctx context.Context, secretName string) (string, error)
}

// Loader resolves a PAT, preferring the env override over the Key Vault
// path. Construct with NewLoader; the zero value is not usable.
type Loader struct {
	envOverride string
	getter      Getter
	secretName  string
}

// NewLoader creates a Loader. Pass an empty envOverride to disable the
// override and force the Key Vault path. Pass a nil getter when only the
// env path is configured (Load will return ErrNoSource if it has to fall
// back to Key Vault).
func NewLoader(envOverride string, getter Getter, secretName string) *Loader {
	return &Loader{
		envOverride: envOverride,
		getter:      getter,
		secretName:  secretName,
	}
}

// Load resolves the PAT. It returns the value, the source it came from, and
// any error. Source is meaningful only when err is nil.
func (l *Loader) Load(ctx context.Context) (string, Source, error) {
	if l.envOverride != "" {
		return l.envOverride, SourceEnv, nil
	}
	if l.getter == nil {
		return "", "", ErrNoSource
	}
	v, err := l.getter.GetSecret(ctx, l.secretName)
	if err != nil {
		return "", "", fmt.Errorf("keyvault: get secret %q: %w", l.secretName, err)
	}
	if v == "" {
		return "", "", fmt.Errorf("%w: %q", ErrEmptySecretValue, l.secretName)
	}
	return v, SourceKeyVault, nil
}

// NewAzureGetter constructs a production Getter backed by Azure Key Vault.
// It uses DefaultAzureCredential, which inside an AKS pod with the Workload
// Identity webhook prefers the federated token. vaultName is the short name
// (e.g. "studio-kv"), not the full URL.
func NewAzureGetter(vaultName string) (Getter, error) {
	if vaultName == "" {
		return nil, errVaultNameEmpty
	}
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return nil, fmt.Errorf("keyvault: build credential: %w", err)
	}
	vaultURL := fmt.Sprintf("https://%s.vault.azure.net", vaultName)
	client, err := azsecrets.NewClient(vaultURL, cred, nil)
	if err != nil {
		return nil, fmt.Errorf("keyvault: build secrets client: %w", err)
	}
	return &azureGetter{client: client}, nil
}

type azureGetter struct {
	client *azsecrets.Client
}

func (g *azureGetter) GetSecret(ctx context.Context, name string) (string, error) {
	resp, err := g.client.GetSecret(ctx, name, "", nil)
	if err != nil {
		return "", fmt.Errorf("keyvault: GetSecret %q: %w", name, err)
	}
	if resp.Value == nil {
		return "", nil
	}
	return *resp.Value, nil
}
