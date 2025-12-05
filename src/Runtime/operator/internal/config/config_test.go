package config

import (
	"context"
	"os"
	"reflect"
	"testing"
	"time"

	"altinn.studio/operator/internal/operatorcontext"
	"github.com/go-playground/validator/v10"
	. "github.com/onsi/gomega"
)

func TestConfigMissingValuesFail(t *testing.T) {
	RegisterTestingT(t)

	file, err := os.CreateTemp(os.TempDir(), "*.env")
	Expect(err).NotTo(HaveOccurred())
	defer func() {
		err := file.Close()
		Expect(err).NotTo(HaveOccurred())
	}()
	defer func() {
		err := os.Remove(file.Name())
		Expect(err).NotTo(HaveOccurred())
	}()

	_, err = file.WriteString("maskinporten_api.url=https://example.com")
	Expect(err).NotTo(HaveOccurred())

	ctx := context.Background()
	environment := operatorcontext.EnvironmentLocal
	cfg, err := GetConfig(ctx, environment, file.Name())
	Expect(cfg).To(BeNil())
	Expect(err).To(HaveOccurred())
	_, ok := err.(validator.ValidationErrors)
	errType := reflect.TypeOf(err)
	Expect(errType.String()).To(Equal("validator.ValidationErrors"))
	Expect(ok).To(BeTrue())
}

func TestConfigTestEnvLoadsOk(t *testing.T) {
	RegisterTestingT(t)

	ctx := context.Background()
	environment := operatorcontext.EnvironmentLocal
	config, err := GetConfig(ctx, environment, "")
	Expect(err).NotTo(HaveOccurred())
	Expect(config).NotTo(BeNil())
	configValue := config.Get()
	Expect(configValue.MaskinportenApi.ClientId).To(Equal("altinn_apps_supplier_client"))
	Expect(configValue.MaskinportenApi.AuthorityUrl).To(Equal("http://localhost:8050"))
	Expect(configValue.MaskinportenApi.Jwk).NotTo(BeNil())
	Expect(configValue.OrgRegistry.URL).To(Equal("http://localhost:8052/orgs/altinn-orgs.json"))
}

func TestSafeLogValueRedactsSecrets(t *testing.T) {
	RegisterTestingT(t)

	ctx := context.Background()
	environment := operatorcontext.EnvironmentLocal
	config, err := GetConfig(ctx, environment, "")
	Expect(err).NotTo(HaveOccurred())
	Expect(config).NotTo(BeNil())
	configValue := config.Get()

	// Get safe log value
	safeLog := configValue.SafeLogValue()

	// Verify the JWK is redacted in the safe log output
	maskinportenApi, ok := safeLog["maskinporten_api"].(map[string]any)
	Expect(ok).To(BeTrue(), "maskinporten_api should be a map")
	Expect(maskinportenApi["jwk"]).To(Equal("[REDACTED]"))

	// Verify other fields are still present
	Expect(maskinportenApi["client_id"]).To(Equal("altinn_apps_supplier_client"))
	Expect(maskinportenApi["authority_url"]).To(Equal("http://localhost:8050"))

	// Verify the actual config still has the real JWK
	Expect(configValue.MaskinportenApi.Jwk).NotTo(Equal("[REDACTED]"))
	Expect(configValue.MaskinportenApi.Jwk).NotTo(BeEmpty())
}

func TestConfigReloadOnRefresh(t *testing.T) {
	RegisterTestingT(t)

	// Create initial config file
	file, err := os.CreateTemp(os.TempDir(), "config-reload-*.env")
	Expect(err).NotTo(HaveOccurred())
	defer func() {
		_ = os.Remove(file.Name())
	}()

	initialConfig := `maskinporten_api.client_id=test-client
maskinporten_api.authority_url=http://localhost:8050
maskinporten_api.self_service_url=http://localhost:8050
maskinporten_api.jwk={"kty":"RSA","n":"test","e":"AQAB"}
maskinporten_api.scope=test:scope
maskinporten_controller.requeue_after=5m
maskinporten_controller.jwk_rotation_threshold=1m
maskinporten_controller.jwk_expiry=2m
keyvault_sync_controller.poll_interval=5m
org_registry.url=http://localhost:8052/orgs/altinn-orgs.json`

	_, err = file.WriteString(initialConfig)
	Expect(err).NotTo(HaveOccurred())
	err = file.Close()
	Expect(err).NotTo(HaveOccurred())

	// Load initial config
	ctx := context.Background()
	monitor, err := GetConfig(ctx, operatorcontext.EnvironmentLocal, file.Name())
	Expect(err).NotTo(HaveOccurred())
	Expect(monitor).NotTo(BeNil())

	// Verify initial value
	Expect(monitor.Get().MaskinportenController.RequeueAfter).To(Equal(5 * time.Minute))

	// Modify config file with new requeue_after value
	updatedConfig := `maskinporten_api.client_id=test-client
maskinporten_api.authority_url=http://localhost:8050
maskinporten_api.self_service_url=http://localhost:8050
maskinporten_api.jwk={"kty":"RSA","n":"test","e":"AQAB"}
maskinporten_api.scope=test:scope
maskinporten_controller.requeue_after=10m
maskinporten_controller.jwk_rotation_threshold=1m
maskinporten_controller.jwk_expiry=2m
keyvault_sync_controller.poll_interval=5m
org_registry.url=http://localhost:8052/orgs/altinn-orgs.json`

	err = os.WriteFile(file.Name(), []byte(updatedConfig), 0644)
	Expect(err).NotTo(HaveOccurred())

	// Trigger refresh (simulates SIGHUP)
	err = monitor.refresh(ctx)
	Expect(err).NotTo(HaveOccurred())

	// Verify config was reloaded
	Expect(monitor.Get().MaskinportenController.RequeueAfter).To(Equal(10 * time.Minute))
}

func TestConfigReloadFailsOnInvalidConfig(t *testing.T) {
	RegisterTestingT(t)

	// Create initial valid config file
	file, err := os.CreateTemp(os.TempDir(), "config-reload-invalid-*.env")
	Expect(err).NotTo(HaveOccurred())
	defer func() {
		_ = os.Remove(file.Name())
	}()

	initialConfig := `maskinporten_api.client_id=test-client
maskinporten_api.authority_url=http://localhost:8050
maskinporten_api.self_service_url=http://localhost:8050
maskinporten_api.jwk={"kty":"RSA","n":"test","e":"AQAB"}
maskinporten_api.scope=test:scope
maskinporten_controller.requeue_after=5m
maskinporten_controller.jwk_rotation_threshold=1m
maskinporten_controller.jwk_expiry=2m
keyvault_sync_controller.poll_interval=5m
org_registry.url=http://localhost:8052/orgs/altinn-orgs.json`

	_, err = file.WriteString(initialConfig)
	Expect(err).NotTo(HaveOccurred())
	err = file.Close()
	Expect(err).NotTo(HaveOccurred())

	// Load initial config
	ctx := context.Background()
	monitor, err := GetConfig(ctx, operatorcontext.EnvironmentLocal, file.Name())
	Expect(err).NotTo(HaveOccurred())
	Expect(monitor).NotTo(BeNil())

	originalRequeueAfter := monitor.Get().MaskinportenController.RequeueAfter

	// Modify config file with invalid value (missing required field)
	invalidConfig := `maskinporten_api.client_id=test-client
maskinporten_api.authority_url=http://localhost:8050
maskinporten_api.self_service_url=http://localhost:8050
maskinporten_api.jwk={"kty":"RSA","n":"test","e":"AQAB"}
maskinporten_api.scope=test:scope
maskinporten_controller.requeue_after=5m
maskinporten_controller.jwk_rotation_threshold=1m
maskinporten_controller.jwk_expiry=2m
keyvault_sync_controller.poll_interval=5m`

	err = os.WriteFile(file.Name(), []byte(invalidConfig), 0644)
	Expect(err).NotTo(HaveOccurred())

	// Trigger refresh - should fail
	err = monitor.refresh(ctx)
	Expect(err).To(HaveOccurred())
	Expect(err.Error()).To(ContainSubstring("validation failed"))

	// Verify original config is still in use
	Expect(monitor.Get().MaskinportenController.RequeueAfter).To(Equal(originalRequeueAfter))
}

func TestParseDuration(t *testing.T) {
	tests := []struct {
		input    string
		expected time.Duration
		wantErr  bool
	}{
		// Days only
		{"1d", 24 * time.Hour, false},
		{"7d", 7 * 24 * time.Hour, false},
		{"23d", 23 * 24 * time.Hour, false},
		{"30d", 30 * 24 * time.Hour, false},
		{"365d", 365 * 24 * time.Hour, false},

		// Days with other units
		{"1d12h", 36 * time.Hour, false},
		{"1d1h30m", 25*time.Hour + 30*time.Minute, false},
		{"2d30m", 48*time.Hour + 30*time.Minute, false},

		// Standard Go duration formats (no days)
		{"24h", 24 * time.Hour, false},
		{"1h30m", 90 * time.Minute, false},
		{"30m", 30 * time.Minute, false},
		{"30s", 30 * time.Second, false},
		{"500ms", 500 * time.Millisecond, false},
		{"1h", time.Hour, false},

		// Edge cases
		{"0d", 0, false}, // zero is valid
		{"", 0, true},
		{"invalid", 0, true},
		{"1x", 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			g := NewWithT(t)
			got, err := ParseDuration(tt.input)
			if tt.wantErr {
				g.Expect(err).To(HaveOccurred())
			} else {
				g.Expect(err).NotTo(HaveOccurred())
				g.Expect(got).To(Equal(tt.expected))
			}
		})
	}
}
