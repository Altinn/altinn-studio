package migrations

import (
	"context"
	"errors"
	"fmt"
	"os"

	"gopkg.in/yaml.v3"

	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/config"
)

func studioCredentials(_ context.Context, cfg *config.Config) error {
	path := auth.CredentialsPath(cfg.Home)
	raw, err := os.ReadFile(path) //nolint:gosec // G304: path is constructed from trusted config home.
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return fmt.Errorf("read studio credentials: %w", err)
	}

	var stored legacyCredentials
	if err := yaml.Unmarshal(raw, &stored); err != nil {
		return fmt.Errorf("parse studio credentials: %w", err)
	}

	currentCredentials := auth.Credentials{Envs: make(map[string]auth.EnvCredentials)}
	for envName, envCreds := range stored.Envs {
		if envCreds.Host == "" || envCreds.ApiKey == "" || envCreds.ApiKeyID == 0 || envCreds.Username == "" {
			continue
		}
		currentCredentials.Envs[envName] = auth.EnvCredentials{
			Host:      envCreds.Host,
			Scheme:    envCreds.Scheme,
			ApiKey:    envCreds.ApiKey,
			ExpiresAt: envCreds.ExpiresAt,
			Username:  envCreds.Username,
			ApiKeyID:  envCreds.ApiKeyID,
		}
	}

	if len(currentCredentials.Envs) > 0 {
		if err := auth.SaveCredentials(cfg.Home, &currentCredentials); err != nil {
			return fmt.Errorf("save current studio credentials: %w", err)
		}
		return nil
	}

	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove studio credentials: %w", err)
	}
	return nil
}

type legacyCredentials struct {
	Envs map[string]legacyEnvCredentials `yaml:"envs,omitempty"`
}

type legacyEnvCredentials struct {
	Host      string `yaml:"host"`
	Scheme    string `yaml:"scheme,omitempty"`
	ApiKey    string `yaml:"apiKey"`
	ExpiresAt string `yaml:"expiresAt,omitempty"`
	Token     string `yaml:"token,omitempty"`
	Username  string `yaml:"username"`
	ApiKeyID  int64  `yaml:"apiKeyId"`
}
