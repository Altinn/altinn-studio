package config

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"os/signal"
	"reflect"
	"strings"
	"sync/atomic"
	"syscall"
	"time"

	commontelemetry "altinn.studio/common/telemetry"

	"github.com/go-logr/logr"
	"go.opentelemetry.io/otel/trace"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/operatorcontext"
	"altinn.studio/operator/internal/telemetry"
)

var (
	errRotationThresholdTooLow = errors.New("jwk_rotation_threshold must be at least the minimum duration")
	errJwkExpiryTooLow         = errors.New("jwk_expiry must be at least the minimum duration")
	errJwkExpiryTooHigh        = errors.New("jwk_expiry must be at most the maximum duration")
	errJwkExpiryThresholdOrder = errors.New("jwk_expiry must be greater than jwk_rotation_threshold")
)

type ConfigMonitor struct {
	tracer         trace.Tracer
	current        atomic.Pointer[Config]
	kvClient       *azureKeyVaultClient
	baseConfig     *Config
	environment    string
	configFilePath string
}

// Get returns the current configuration atomically.
func (m *ConfigMonitor) Get() *Config {
	return m.current.Load()
}

func (m *ConfigMonitor) start(ctx context.Context) {
	ctx = telemetry.WithoutSpan(ctx)
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

	newBaseConfig, err := loadFromFile(ctx, m.configFilePath)
	if err != nil {
		commontelemetry.SetError(span, "load_config_file", err)
		return fmt.Errorf("failed to reload config file: %w", err)
	}

	cfg := *newBaseConfig

	oldCfg := m.current.Load()
	if m.kvClient != nil {
		tempCfg := cfg
		if err := m.kvClient.loadSecrets(ctx, &tempCfg); err != nil {
			commontelemetry.SetError(span, "load_key_vault_secrets", err)
			copyOldSecrets(&cfg, oldCfg)
			log.FromContext(ctx).
				Error(err, "failed to load secrets from Key Vault, using base config values and old secrets if available")
		} else {
			cfg = tempCfg
		}
	}

	if err := validateConfig(&cfg); err != nil {
		commontelemetry.SetError(span, "validate_config", err)
		return fmt.Errorf("config validation failed: %w", err)
	}

	isLocal := m.environment == operatorcontext.EnvironmentLocal
	if err := ValidateMaskinportenControllerConfig(&cfg.MaskinportenController, isLocal); err != nil {
		commontelemetry.SetError(span, "validate_maskinporten_config", err)
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
	MaskinportenApi        MaskinportenApiConfig
	OrgRegistry            OrgRegistryConfig
	MaskinportenController MaskinportenControllerConfig
	KeyVaultSyncController KeyVaultSyncControllerConfig
}

type MaskinportenApiConfig struct {
	ClientId       string
	AuthorityUrl   string
	SelfServiceUrl string
	Jwk            string
	Scope          string
}

type MaskinportenControllerConfig struct {
	RequeueAfter         time.Duration
	JwkRotationThreshold time.Duration
	JwkExpiry            time.Duration
}

type KeyVaultSyncControllerConfig struct {
	PollInterval time.Duration
}

type OrgRegistryConfig struct {
	URL string
}

// validationErrors lists the fields that failed validation, one per line.
type validationErrors []string

func (e validationErrors) Error() string {
	return strings.Join(e, "\n")
}

// validateConfig checks that every value is set and in range. A section with no values set fails as a whole.
func validateConfig(c *Config) error {
	var errs validationErrors
	fail := func(field, rule string) {
		name := field[strings.LastIndex(field, ".")+1:]
		errs = append(errs, fmt.Sprintf("Key: 'Config.%s' Error:Field validation for '%s' failed on the '%s' tag",
			field, name, rule))
	}
	str := func(field, value, rule string, valid func(string) bool) {
		if value == "" {
			fail(field, "required")
		} else if valid != nil && !valid(value) {
			fail(field, rule)
		}
	}
	duration := func(field string, value, minValue, maxValue time.Duration) {
		switch {
		case value == 0:
			fail(field, "required")
		case minValue != 0 && value < minValue:
			fail(field, "min")
		case maxValue != 0 && value > maxValue:
			fail(field, "max")
		}
	}

	if api := c.MaskinportenApi; api == (MaskinportenApiConfig{}) {
		fail("MaskinportenApi", "required")
	} else {
		str("MaskinportenApi.ClientId", api.ClientId, "", nil)
		str("MaskinportenApi.AuthorityUrl", api.AuthorityUrl, "http_url", isHTTPURL)
		str("MaskinportenApi.SelfServiceUrl", api.SelfServiceUrl, "http_url", isHTTPURL)
		str("MaskinportenApi.Jwk", api.Jwk, "json", func(s string) bool { return json.Valid([]byte(s)) })
		str("MaskinportenApi.Scope", api.Scope, "", nil)
	}
	if c.OrgRegistry == (OrgRegistryConfig{}) {
		fail("OrgRegistry", "required")
	} else {
		str("OrgRegistry.URL", c.OrgRegistry.URL, "http_url", isHTTPURL)
	}
	if mp := c.MaskinportenController; mp == (MaskinportenControllerConfig{}) {
		fail("MaskinportenController", "required")
	} else {
		duration("MaskinportenController.RequeueAfter", mp.RequeueAfter, 5*time.Second, 72*time.Hour)
		duration("MaskinportenController.JwkRotationThreshold", mp.JwkRotationThreshold, 0, 0)
		duration("MaskinportenController.JwkExpiry", mp.JwkExpiry, 0, 0)
	}
	if kv := c.KeyVaultSyncController; kv == (KeyVaultSyncControllerConfig{}) {
		fail("KeyVaultSyncController", "required")
	} else {
		duration("KeyVaultSyncController.PollInterval", kv.PollInterval, time.Minute, 24*time.Hour)
	}

	if len(errs) > 0 {
		return errs
	}
	return nil
}

// isHTTPURL reports whether s is an absolute http or https URL with a host, in any case.
func isHTTPURL(s string) bool {
	u, err := url.Parse(strings.ToLower(s))
	return err == nil && u.Host != "" && (u.Scheme == "http" || u.Scheme == "https")
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
		return fmt.Errorf("%w: %s", errRotationThresholdTooLow, minThreshold)
	}
	if c.JwkExpiry < minExpiry {
		return fmt.Errorf("%w: %s", errJwkExpiryTooLow, minExpiry)
	}
	if c.JwkExpiry > maxExpiry {
		return fmt.Errorf("%w: %s", errJwkExpiryTooHigh, maxExpiry)
	}
	if c.JwkExpiry <= c.JwkRotationThreshold {
		return fmt.Errorf(
			"%w: jwk_expiry=%s jwk_rotation_threshold=%s",
			errJwkExpiryThresholdOrder,
			c.JwkExpiry,
			c.JwkRotationThreshold,
		)
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
	tracer := telemetry.Tracer()
	ctx, span := tracer.Start(ctx, "GetConfig")
	defer span.End()

	resolvedPath, err := resolveConfigFilePath(configFilePath)
	if err != nil {
		return nil, err
	}

	cfg, err := loadFromFile(ctx, resolvedPath)
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

	if err := validateConfig(monitor.Get()); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	isLocal := environment == operatorcontext.EnvironmentLocal
	if err := ValidateMaskinportenControllerConfig(&monitor.Get().MaskinportenController, isLocal); err != nil {
		return nil, fmt.Errorf("maskinporten controller config validation failed: %w", err)
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
		tracer:      telemetry.Tracer(),
	}
	monitor.current.Store(cfg)
	return monitor
}
