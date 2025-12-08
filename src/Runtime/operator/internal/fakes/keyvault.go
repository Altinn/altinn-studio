package fakes

import (
	"context"
	"fmt"
	"sync"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
)

// FakeKeyVaultClient implements KeyVaultSecretsClient for testing.
type FakeKeyVaultClient struct {
	mu      sync.RWMutex
	secrets map[string]string
	errors  map[string]error
}

func NewFakeKeyVaultClient() *FakeKeyVaultClient {
	return &FakeKeyVaultClient{
		secrets: make(map[string]string),
		errors:  make(map[string]error),
	}
}

func (f *FakeKeyVaultClient) SetSecret(name, value string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.secrets[name] = value
}

func (f *FakeKeyVaultClient) SetError(name string, err error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.errors[name] = err
}

func (f *FakeKeyVaultClient) ClearError(name string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.errors, name)
}

func (f *FakeKeyVaultClient) GetSecret(ctx context.Context, name, version string) (string, error) {
	f.mu.RLock()
	defer f.mu.RUnlock()

	if err, ok := f.errors[name]; ok {
		return "", err
	}
	if val, ok := f.secrets[name]; ok {
		return val, nil
	}
	return "", &azcore.ResponseError{
		StatusCode:  404,
		ErrorCode:   "SecretNotFound",
		RawResponse: nil,
	}
}

// NotFoundError returns an error that mimics Azure Key Vault 404 response.
func NotFoundError(secretName string) error {
	return &azcore.ResponseError{
		StatusCode: 404,
		ErrorCode:  "SecretNotFound",
	}
}

// TransientError returns an error that mimics a transient Azure failure.
func TransientError() error {
	return fmt.Errorf("transient network error")
}
