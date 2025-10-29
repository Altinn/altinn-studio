package config

import (
	"context"
	"time"

	"altinn.studio/operator/internal/operatorcontext"
	"github.com/go-playground/validator/v10"
)

type Config struct {
	MaskinportenApi MaskinportenApiConfig `koanf:"maskinporten_api" validate:"required"`
	Controller      ControllerConfig      `koanf:"controller"       validate:"required"`
	OrgRegistry     OrgRegistryConfig     `koanf:"org_registry"     validate:"required"`
}

type MaskinportenApiConfig struct {
	ClientId       string `koanf:"client_id"        validate:"required"`
	AuthorityUrl   string `koanf:"authority_url"    validate:"required,http_url"`
	SelfServiceUrl string `koanf:"self_service_url" validate:"required,http_url"`
	Jwk            string `koanf:"jwk"              validate:"required,json"`
	Scope          string `koanf:"scope"            validate:"required"`
}

type ControllerConfig struct {
	RequeueAfter time.Duration `koanf:"requeue_after" validate:"required,min=5s,max=72h"`
}

type OrgRegistryConfig struct {
	URL string `koanf:"url" validate:"required,http_url"`
}

// SafeLogValue returns a map representation of Config suitable for logging,
// with sensitive fields redacted.
func (c *Config) SafeLogValue() map[string]any {
	return map[string]any{
		"maskinporten_api": c.MaskinportenApi.SafeLogValue(),
		"controller":       c.Controller,
		"org_registry":     c.OrgRegistry,
	}
}

// SafeLogValue returns a map representation of MaskinportenApiConfig suitable for logging,
// with sensitive fields (JWK) redacted.
func (m *MaskinportenApiConfig) SafeLogValue() map[string]any {
	return map[string]any{
		"client_id":        m.ClientId,
		"authority_url":    m.AuthorityUrl,
		"self_service_url": m.SelfServiceUrl,
		"jwk":              "[REDACTED]",
		"scope":            m.Scope,
	}
}

// GetConfig loads configuration from a file and optionally overlays secrets from Azure Key Vault.
// For local environment, all config comes from the file.
// For non-local environments, secrets (client_id, jwk) are loaded from Azure Key Vault.
func GetConfig(ctx context.Context, environment string, configFilePath string) (*Config, error) {
	// 1. Always load from koanf file first
	cfg, err := loadFromKoanf(ctx, configFilePath)
	if err != nil {
		return nil, err
	}

	// 2. If not local, overlay secrets from Azure Key Vault
	if environment != operatorcontext.EnvironmentLocal {
		if err := loadSecretsFromKeyVault(ctx, environment, cfg); err != nil {
			return nil, err
		}
	}

	// 3. Validate
	validate := validator.New(validator.WithRequiredStructEnabled())
	if err := validate.Struct(cfg); err != nil {
		return nil, err
	}

	return cfg, nil
}

func GetConfigOrDie(ctx context.Context, environment string, configFilePath string) *Config {
	cfg, err := GetConfig(ctx, environment, configFilePath)
	if err != nil {
		panic(err)
	}
	return cfg
}
