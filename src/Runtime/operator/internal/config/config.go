package config

import (
	"context"
	"fmt"
	"sync/atomic"
	"time"

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/operatorcontext"
	"altinn.studio/operator/internal/telemetry"
	"github.com/go-playground/validator/v10"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

type ConfigMonitor struct {
	current     atomic.Pointer[Config]
	environment string
	kvClient    *azureKeyVaultClient // nil for local
	baseConfig  *Config              // file-based config (non-secret fields)
	tracer      trace.Tracer
}

// Get returns the current configuration atomically.
func (m *ConfigMonitor) Get() *Config {
	return m.current.Load()
}

// start begins the background refresh loop. Called automatically by GetConfig.
func (m *ConfigMonitor) start(ctx context.Context) {
	// For local environment, nothing to refresh
	if m.kvClient == nil {
		return
	}

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		logger := log.FromContext(ctx)

		logger.Info("starting ConfigMonitor loop")
		defer func() {
			logger.Info("exiting ConfigMonitor loop")
			assert.That(ctx.Err() != nil, "exited ConfigMonitor without context cancellation")
		}()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := m.refresh(ctx); err != nil {
					logger.Error(err, "ConfigMonitor refresh failed, continuing with previous config",
						"environment", m.environment,
					)
				} else {
					logger.Info("ConfigMonitor refresh succeeded",
						"environment", m.environment,
					)
				}
			}
		}
	}()
}

// refresh loads secrets from Key Vault, merges with base config, validates, and stores atomically.
func (m *ConfigMonitor) refresh(ctx context.Context) error {
	ctx, span := m.tracer.Start(ctx, "ConfigMonitor.refresh")
	defer span.End()

	// Create a copy of base config to overlay secrets onto
	cfg := *m.baseConfig

	// Load secrets from Key Vault
	if err := m.kvClient.LoadSecrets(ctx, &cfg); err != nil {
		span.RecordError(err)
		// Keep serving previous config on error
		return err
	}

	// Validate before storing
	validate := validator.New(validator.WithRequiredStructEnabled())
	if err := validate.Struct(&cfg); err != nil {
		span.RecordError(err)
		// Keep serving previous config on error
		return err
	}

	// Store atomically
	m.current.Store(&cfg)
	return nil
}

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
	RequeueAfter         time.Duration `koanf:"requeue_after"          validate:"required,min=5s,max=72h"`
	JwkRotationThreshold time.Duration `koanf:"jwk_rotation_threshold" validate:"required"`
	JwkExpiry            time.Duration `koanf:"jwk_expiry"             validate:"required"`
}

type OrgRegistryConfig struct {
	URL string `koanf:"url" validate:"required,http_url"`
}

// ValidateControllerConfig performs environment-aware validation on ControllerConfig.
// Local environments have relaxed minimums for testing.
func ValidateControllerConfig(c *ControllerConfig, isLocal bool) error {
	var minThreshold, minExpiry time.Duration
	if isLocal {
		minThreshold = 30 * time.Second
		minExpiry = 30 * time.Second
	} else {
		minThreshold = time.Hour
		minExpiry = 24 * time.Hour
	}
	maxExpiry := 365 * 24 * time.Hour

	if c.JwkRotationThreshold < minThreshold {
		return fmt.Errorf("jwk_rotation_threshold must be at least %s", minThreshold)
	}
	if c.JwkExpiry < minExpiry {
		return fmt.Errorf("jwk_expiry must be at least %s", minExpiry)
	}
	if c.JwkExpiry > maxExpiry {
		return fmt.Errorf("jwk_expiry must be at most %s", maxExpiry)
	}
	if c.JwkExpiry <= c.JwkRotationThreshold {
		return fmt.Errorf("jwk_expiry (%s) must be greater than jwk_rotation_threshold (%s)", c.JwkExpiry, c.JwkRotationThreshold)
	}
	return nil
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
// The returned ConfigMonitor automatically starts background refresh for non-local environments.
func GetConfig(ctx context.Context, environment string, configFilePath string) (*ConfigMonitor, error) {
	tracer := otel.Tracer(telemetry.ServiceName)
	ctx, span := tracer.Start(ctx, "GetConfig")
	defer span.End()

	cfg, err := loadFromKoanf(ctx, configFilePath)
	if err != nil {
		return nil, err
	}

	monitor := &ConfigMonitor{
		environment: environment,
		baseConfig:  cfg,
		tracer:      tracer,
	}

	if environment != operatorcontext.EnvironmentLocal {
		kvClient, err := NewAzureKeyVaultClient(ctx, environment)
		if err != nil {
			return nil, err
		}
		monitor.kvClient = kvClient

		if err := monitor.refresh(ctx); err != nil {
			return nil, err
		}
	} else {
		monitor.current.Store(cfg)
	}

	validate := validator.New(validator.WithRequiredStructEnabled())
	if err := validate.Struct(monitor.Get()); err != nil {
		return nil, err
	}

	isLocal := environment == operatorcontext.EnvironmentLocal
	if err := ValidateControllerConfig(&monitor.Get().Controller, isLocal); err != nil {
		return nil, err
	}

	monitor.start(ctx)

	return monitor, nil
}

func GetConfigOrDie(ctx context.Context, environment string, configFilePath string) *ConfigMonitor {
	monitor, err := GetConfig(ctx, environment, configFilePath)
	assert.That(err == nil, "GetConfig failed", "error", err)
	return monitor
}

// NewConfigMonitorForTesting creates a ConfigMonitor with a pre-populated config.
// This is useful for tests that need to modify the config before using it.
func NewConfigMonitorForTesting(cfg *Config) *ConfigMonitor {
	monitor := &ConfigMonitor{
		environment: "test",
		baseConfig:  cfg,
		tracer:      otel.Tracer(telemetry.ServiceName),
	}
	monitor.current.Store(cfg)
	return monitor
}
