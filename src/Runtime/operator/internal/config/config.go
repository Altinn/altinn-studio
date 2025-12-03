package config

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"reflect"
	"sync/atomic"
	"syscall"
	"time"

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/operatorcontext"
	"altinn.studio/operator/internal/telemetry"
	"github.com/go-logr/logr"
	"github.com/go-playground/validator/v10"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

type ConfigMonitor struct {
	current        atomic.Pointer[Config]
	environment    string
	configFilePath string
	kvClient       *azureKeyVaultClient // nil for local
	baseConfig     *Config              // file-based config (non-secret fields)
	tracer         trace.Tracer
}

// Get returns the current configuration atomically.
func (m *ConfigMonitor) Get() *Config {
	return m.current.Load()
}

func (m *ConfigMonitor) start(ctx context.Context) {
	sighup := make(chan os.Signal, 1)
	signal.Notify(sighup, syscall.SIGHUP)

	go func() {
		defer signal.Stop(sighup)

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
			case <-sighup:
				logger.Info("received SIGHUP, reloading config")
				m.doRefresh(ctx, logger)
			case <-ticker.C:
				m.doRefresh(ctx, logger)
			}
		}
	}()
}

func (m *ConfigMonitor) doRefresh(ctx context.Context, logger logr.Logger) {
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

func (m *ConfigMonitor) refresh(ctx context.Context) error {
	ctx, span := m.tracer.Start(ctx, "ConfigMonitor.refresh")
	defer span.End()

	newBaseConfig, err := loadFromKoanf(ctx, m.configFilePath)
	if err != nil {
		span.RecordError(err)
		return fmt.Errorf("failed to reload config file: %w", err)
	}

	cfg := *newBaseConfig

	oldCfg := m.current.Load()
	if m.kvClient != nil {
		if err := m.kvClient.loadSecrets(ctx, &cfg); err != nil {
			span.RecordError(err)
			copyOldSecrets(&cfg, oldCfg)
			log.FromContext(ctx).Error(err, "failed to load secrets from Key Vault, using base config values and old secrets if available")
		}
	}

	validate := validator.New(validator.WithRequiredStructEnabled())
	if err := validate.Struct(&cfg); err != nil {
		span.RecordError(err)
		return fmt.Errorf("config validation failed: %w", err)
	}

	isLocal := m.environment == operatorcontext.EnvironmentLocal
	if err := ValidateMaskinportenControllerConfig(&cfg.MaskinportenController, isLocal); err != nil {
		span.RecordError(err)
		return fmt.Errorf("maskinporten controller config validation failed: %w", err)
	}

	if oldCfg != nil && !configEqual(oldCfg, &cfg) {
		log.FromContext(ctx).Info("config changed", "config", cfg.SafeLogValue())
	}

	m.baseConfig = newBaseConfig
	m.current.Store(&cfg)
	return nil
}

func configEqual(a, b *Config) bool {
	return reflect.DeepEqual(a, b)
}

type Config struct {
	MaskinportenApi        MaskinportenApiConfig        `koanf:"maskinporten_api"        validate:"required"`
	MaskinportenController MaskinportenControllerConfig `koanf:"maskinporten_controller" validate:"required"`
	KeyVaultSyncController KeyVaultSyncControllerConfig `koanf:"keyvault_sync_controller" validate:"required"`
	OrgRegistry            OrgRegistryConfig            `koanf:"org_registry"            validate:"required"`
}

type MaskinportenApiConfig struct {
	ClientId       string `koanf:"client_id"        validate:"required"`
	AuthorityUrl   string `koanf:"authority_url"    validate:"required,http_url"`
	SelfServiceUrl string `koanf:"self_service_url" validate:"required,http_url"`
	Jwk            string `koanf:"jwk"              validate:"required,json"`
	Scope          string `koanf:"scope"            validate:"required"`
}

type MaskinportenControllerConfig struct {
	RequeueAfter         time.Duration `koanf:"requeue_after"          validate:"required,min=5s,max=72h"`
	JwkRotationThreshold time.Duration `koanf:"jwk_rotation_threshold" validate:"required"`
	JwkExpiry            time.Duration `koanf:"jwk_expiry"             validate:"required"`
}

type KeyVaultSyncControllerConfig struct {
	PollInterval time.Duration `koanf:"poll_interval" validate:"required,min=1m,max=24h"`
}

type OrgRegistryConfig struct {
	URL string `koanf:"url" validate:"required,http_url"`
}

func KeyVaultURL(environment string) string {
	return fmt.Sprintf("https://mpo-%s-kv.vault.azure.net/", environment)
}

// ValidateMaskinportenControllerConfig performs environment-aware validation on MaskinportenControllerConfig.
// Local environments have relaxed minimums for testing.
func ValidateMaskinportenControllerConfig(c *MaskinportenControllerConfig, isLocal bool) error {
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
		"maskinporten_api":         c.MaskinportenApi.SafeLogValue(),
		"maskinporten_controller":  c.MaskinportenController,
		"keyvault_sync_controller": c.KeyVaultSyncController,
		"org_registry":             c.OrgRegistry,
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
// The returned ConfigMonitor automatically starts background refresh.
// Send SIGHUP to the process to trigger an immediate config reload.
func GetConfig(ctx context.Context, environment string, configFilePath string) (*ConfigMonitor, error) {
	tracer := otel.Tracer(telemetry.ServiceName)
	ctx, span := tracer.Start(ctx, "GetConfig")
	defer span.End()

	resolvedPath, err := resolveConfigFilePath(configFilePath)
	if err != nil {
		return nil, err
	}

	cfg, err := loadFromKoanf(ctx, resolvedPath)
	if err != nil {
		return nil, err
	}

	monitor := &ConfigMonitor{
		environment:    environment,
		configFilePath: resolvedPath,
		baseConfig:     cfg,
		tracer:         tracer,
	}

	if environment != operatorcontext.EnvironmentLocal {
		kvClient, err := newAzureKeyVaultClient(ctx, environment)
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
	if err := ValidateMaskinportenControllerConfig(&monitor.Get().MaskinportenController, isLocal); err != nil {
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
