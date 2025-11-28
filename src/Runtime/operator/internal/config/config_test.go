package config

import (
	"context"
	"os"
	"reflect"
	"testing"

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
