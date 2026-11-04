package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	. "github.com/onsi/gomega"

	"altinn.studio/operator/internal/operatorcontext"
)

const validConfigFile = `maskinporten_api.client_id=test-client
maskinporten_api.authority_url=http://localhost:8050
maskinporten_api.self_service_url=https://localhost:8051/path
maskinporten_api.jwk='{"kty":"RSA","n":"test","e":"AQAB"}'
maskinporten_api.scope=test:scope
org_registry.url=http://localhost:8052/orgs/altinn-orgs.json
maskinporten_controller.requeue_after=24h
maskinporten_controller.jwk_rotation_threshold=1d12h
maskinporten_controller.jwk_expiry=30d
keyvault_sync_controller.poll_interval=5m
`

var validConfig = Config{
	MaskinportenApi: MaskinportenApiConfig{
		ClientId:       "test-client",
		AuthorityUrl:   "http://localhost:8050",
		SelfServiceUrl: "https://localhost:8051/path",
		Jwk:            `{"kty":"RSA","n":"test","e":"AQAB"}`,
		Scope:          "test:scope",
	},
	OrgRegistry: OrgRegistryConfig{URL: "http://localhost:8052/orgs/altinn-orgs.json"},
	MaskinportenController: MaskinportenControllerConfig{
		RequeueAfter:         24 * time.Hour,
		JwkRotationThreshold: 36 * time.Hour,
		JwkExpiry:            30 * 24 * time.Hour,
	},
	KeyVaultSyncController: KeyVaultSyncControllerConfig{PollInterval: 5 * time.Minute},
}

// writeConfigFile writes contents to a temporary .env file and returns its path.
func writeConfigFile(t *testing.T, contents string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "config.env")
	if err := os.WriteFile(path, []byte(contents), 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

// withLine returns validConfigFile with the line for key replaced by line, or removed if line is empty.
func withLine(key, line string) string {
	var lines []string
	for l := range strings.SplitSeq(strings.TrimSuffix(validConfigFile, "\n"), "\n") {
		if strings.HasPrefix(l, key+"=") {
			if line == "" {
				continue
			}
			l = line
		}
		lines = append(lines, l)
	}
	return strings.Join(lines, "\n") + "\n"
}

// loadLocal loads the file through GetConfig as the localtest environment does. Errors have the file path replaced
// by <path>.
func loadLocal(t *testing.T, contents string) (*Config, error) {
	t.Helper()
	path := writeConfigFile(t, contents)
	monitor, err := GetConfig(t.Context(), operatorcontext.EnvironmentLocal, path)
	if err != nil {
		return nil, &pathlessError{strings.ReplaceAll(err.Error(), path, "<path>")}
	}
	return monitor.Get(), nil
}

type pathlessError struct{ msg string }

func (e *pathlessError) Error() string { return e.msg }

func validationError(fields ...string) string {
	lines := make([]string, 0, len(fields))
	for _, f := range fields {
		path, tag, _ := strings.Cut(f, " ")
		name := path[strings.LastIndex(path, ".")+1:]
		lines = append(
			lines,
			"Key: 'Config."+path+"' Error:Field validation for '"+name+"' failed on the '"+tag+"' tag",
		)
	}
	return "config validation failed: " + strings.Join(lines, "\n")
}

func TestLoadFullConfig(t *testing.T) {
	g := NewWithT(t)
	cfg, err := loadLocal(t, validConfigFile)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(*cfg).To(Equal(validConfig))
}

func TestLoadDotenvSyntax(t *testing.T) {
	g := NewWithT(t)
	contents := "# leading comment\r\n" +
		"\r\n" +
		"   # indented comment\n" +
		"maskinporten_api.client_id = first\n" +
		"maskinporten_api.client_id=  test-client  \n" +
		"maskinporten_api.authority_url=http://localhost:8050 # trailing comment\n" +
		"maskinporten_api.self_service_url=https://localhost:8051/path#fragment\n" +
		`maskinporten_api.jwk="{}"` + "\n" +
		"maskinporten_api.scope=' a # b '\n" +
		"maskinporten_api.unknown=ignored\n" +
		"unknown_section.key=ignored\n" +
		"org_registry.url=http://localhost:8052/orgs/altinn-orgs.json\n" +
		"\tmaskinporten_controller.requeue_after=24h\n" +
		"maskinporten_controller.jwk_rotation_threshold='1d12h'\n" +
		"maskinporten_controller.jwk_expiry=\"30d\"\n" +
		"keyvault_sync_controller.poll_interval=5m"
	cfg, err := loadLocal(t, contents)
	g.Expect(err).NotTo(HaveOccurred())

	expected := validConfig
	expected.MaskinportenApi.SelfServiceUrl = "https://localhost:8051/path#fragment"
	expected.MaskinportenApi.Jwk = "{}"
	expected.MaskinportenApi.Scope = " a # b "
	g.Expect(*cfg).To(Equal(expected))
}

func TestLoadDeployedConfigMaps(t *testing.T) {
	// Outside localtest, the client ID and JWK come from Key Vault.
	const secrets = "maskinporten_api.client_id=test-client\n" +
		`maskinporten_api.jwk='{"kty":"RSA","n":"test","e":"AQAB"}'` + "\n"

	files, err := filepath.Glob("../../config/*/operator-config*.yaml")
	if err != nil || len(files) < 8 {
		t.Fatalf("expected the operator ConfigMaps, found %v: %v", files, err)
	}
	for _, file := range files {
		t.Run(filepath.Base(filepath.Dir(file)), func(t *testing.T) {
			g := NewWithT(t)
			manifest, err := os.ReadFile(file)
			g.Expect(err).NotTo(HaveOccurred())
			_, env, found := strings.Cut(string(manifest), "  config.env: |\n")
			g.Expect(found).To(BeTrue())
			env = strings.ReplaceAll(env, "\n    ", "\n")
			env = strings.TrimPrefix(env, "    ")
			if !strings.Contains(env, "maskinporten_api.authority_url=") {
				env += "maskinporten_api.authority_url=https://test.maskinporten.no\n" +
					"maskinporten_api.self_service_url=https://api.test.samarbeid.digdir.no\n"
			}
			if !strings.Contains(env, "maskinporten_api.client_id=") {
				env += secrets
			}

			cfg, err := loadLocal(t, env)
			g.Expect(err).NotTo(HaveOccurred())
			g.Expect(cfg.MaskinportenApi.Scope).To(Equal("idporten:dcr.altinn"))
			g.Expect(cfg.MaskinportenController.RequeueAfter).To(Equal(24 * time.Hour))
			g.Expect(cfg.MaskinportenController.JwkExpiry).To(BeNumerically(">=", 10*time.Minute))
			g.Expect(cfg.KeyVaultSyncController.PollInterval).To(Equal(5 * time.Minute))
			g.Expect(cfg.MaskinportenApi.Jwk).To(HavePrefix("{"))
		})
	}
}

func TestLoadMissingFile(t *testing.T) {
	g := NewWithT(t)
	path := filepath.Join(t.TempDir(), "missing.env")
	_, err := GetConfig(t.Context(), operatorcontext.EnvironmentLocal, path)
	g.Expect(err).To(MatchError("config file does not exist: " + path))
}

func TestLoadConfigFileFromEnvironment(t *testing.T) {
	g := NewWithT(t)
	fromEnv := writeConfigFile(t, withLine("maskinporten_api.scope", "maskinporten_api.scope=from-env"))
	t.Setenv("OPERATOR_CONFIG_FILE", fromEnv)

	monitor, err := GetConfig(t.Context(), operatorcontext.EnvironmentLocal, "")
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(monitor.Get().MaskinportenApi.Scope).To(Equal("from-env"))

	explicit := writeConfigFile(t, validConfigFile)
	monitor, err = GetConfig(t.Context(), operatorcontext.EnvironmentLocal, explicit)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(monitor.Get().MaskinportenApi.Scope).To(Equal("test:scope"))
}

func TestLoadMissingValues(t *testing.T) {
	tests := []struct {
		name     string
		contents string
		err      string
	}{
		{
			name:     "empty file",
			contents: "",
			err: validationError(
				"MaskinportenApi required",
				"OrgRegistry required",
				"MaskinportenController required",
				"KeyVaultSyncController required",
			),
		},
		{
			name:     "one value",
			contents: "maskinporten_api.client_id=x",
			err: validationError(
				"MaskinportenApi.AuthorityUrl required",
				"MaskinportenApi.SelfServiceUrl required",
				"MaskinportenApi.Jwk required",
				"MaskinportenApi.Scope required",
				"OrgRegistry required",
				"MaskinportenController required",
				"KeyVaultSyncController required",
			),
		},
		{
			name: "empty values",
			contents: "maskinporten_api.client_id=\nmaskinporten_api.authority_url=''\n" +
				"maskinporten_api.self_service_url=\"\"\nmaskinporten_api.jwk=\nmaskinporten_api.scope=" +
				"\norg_registry.url=",
			err: validationError(
				"MaskinportenApi required",
				"OrgRegistry required",
				"MaskinportenController required",
				"KeyVaultSyncController required",
			),
		},
		{
			name:     "client_id",
			contents: withLine("maskinporten_api.client_id", ""),
			err:      validationError("MaskinportenApi.ClientId required"),
		},
		{
			name:     "authority_url",
			contents: withLine("maskinporten_api.authority_url", ""),
			err:      validationError("MaskinportenApi.AuthorityUrl required"),
		},
		{
			name:     "self_service_url",
			contents: withLine("maskinporten_api.self_service_url", ""),
			err:      validationError("MaskinportenApi.SelfServiceUrl required"),
		},
		{
			name:     "jwk",
			contents: withLine("maskinporten_api.jwk", ""),
			err:      validationError("MaskinportenApi.Jwk required"),
		},
		{
			name:     "scope",
			contents: withLine("maskinporten_api.scope", ""),
			err:      validationError("MaskinportenApi.Scope required"),
		},
		{
			name:     "org_registry.url",
			contents: withLine("org_registry.url", ""),
			err:      validationError("OrgRegistry required"),
		},
		{
			name:     "requeue_after",
			contents: withLine("maskinporten_controller.requeue_after", ""),
			err:      validationError("MaskinportenController.RequeueAfter required"),
		},
		{
			name:     "jwk_rotation_threshold",
			contents: withLine("maskinporten_controller.jwk_rotation_threshold", ""),
			err:      validationError("MaskinportenController.JwkRotationThreshold required"),
		},
		{
			name:     "jwk_expiry",
			contents: withLine("maskinporten_controller.jwk_expiry", ""),
			err:      validationError("MaskinportenController.JwkExpiry required"),
		},
		{
			name:     "poll_interval",
			contents: withLine("keyvault_sync_controller.poll_interval", ""),
			err:      validationError("KeyVaultSyncController required"),
		},
		{
			name:     "zero durations",
			contents: withLine("maskinporten_controller.requeue_after", "maskinporten_controller.requeue_after=0s"),
			err:      validationError("MaskinportenController.RequeueAfter required"),
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			g := NewWithT(t)
			cfg, err := loadLocal(t, tt.contents)
			g.Expect(cfg).To(BeNil())
			g.Expect(err).To(MatchError(tt.err))
		})
	}
}

func TestLoadValidationRules(t *testing.T) {
	const (
		authorityURL = "maskinporten_api.authority_url"
		selfService  = "maskinporten_api.self_service_url"
		orgURL       = "org_registry.url"
		jwk          = "maskinporten_api.jwk"
		requeueAfter = "maskinporten_controller.requeue_after"
		threshold    = "maskinporten_controller.jwk_rotation_threshold"
		expiry       = "maskinporten_controller.jwk_expiry"
		pollInterval = "keyvault_sync_controller.poll_interval"
	)
	tests := []struct {
		key   string
		value string
		err   string
	}{
		{authorityURL, "https://example.com", ""},
		{authorityURL, "HTTP://EXAMPLE.COM", ""},
		{authorityURL, "http://localhost:8050/path?q=1", ""},
		{authorityURL, "ftp://example.com", validationError("MaskinportenApi.AuthorityUrl http_url")},
		{authorityURL, "http://", validationError("MaskinportenApi.AuthorityUrl http_url")},
		{authorityURL, "example.com", validationError("MaskinportenApi.AuthorityUrl http_url")},
		{authorityURL, "http//example.com", validationError("MaskinportenApi.AuthorityUrl http_url")},
		{authorityURL, "http://exa mple.com", validationError("MaskinportenApi.AuthorityUrl http_url")},
		{authorityURL, "mailto:a@example.com", validationError("MaskinportenApi.AuthorityUrl http_url")},
		{selfService, "file:///tmp/x", validationError("MaskinportenApi.SelfServiceUrl http_url")},
		{selfService, "' https://example.com'", validationError("MaskinportenApi.SelfServiceUrl http_url")},
		{orgURL, "https://altinncdn.no/orgs/altinn-orgs.json", ""},
		{orgURL, "not a url", validationError("OrgRegistry.URL http_url")},
		{jwk, "{}", ""},
		{jwk, "[1, 2]", ""},
		{jwk, "\"text\"", validationError("MaskinportenApi.Jwk json")},
		{jwk, "'\"text\"'", ""},
		{jwk, "abc", validationError("MaskinportenApi.Jwk json")},
		{jwk, "'{\"kty\":}'", validationError("MaskinportenApi.Jwk json")},
		{requeueAfter, "5s", ""},
		{requeueAfter, "72h", ""},
		{requeueAfter, "3d", ""},
		{requeueAfter, "4999ms", validationError("MaskinportenController.RequeueAfter min")},
		{requeueAfter, "-1h", validationError("MaskinportenController.RequeueAfter min")},
		{requeueAfter, "72h1ns", validationError("MaskinportenController.RequeueAfter max")},
		{requeueAfter, "3d1s", validationError("MaskinportenController.RequeueAfter max")},
		{pollInterval, "1m", ""},
		{pollInterval, "24h", ""},
		{pollInterval, "1d", ""},
		{pollInterval, "59s", validationError("KeyVaultSyncController.PollInterval min")},
		{pollInterval, "24h1s", validationError("KeyVaultSyncController.PollInterval max")},
		{pollInterval, "0s", validationError("KeyVaultSyncController required")},
		// The localtest environment relaxes the minimum threshold and expiry to 30 seconds.
		{threshold, "30s", ""},
		{
			threshold, "29s",
			"maskinporten controller config validation failed: " +
				"jwk_rotation_threshold must be at least the minimum duration: 30s",
		},
		{
			threshold, "-1s",
			"maskinporten controller config validation failed: " +
				"jwk_rotation_threshold must be at least the minimum duration: 30s",
		},
		{
			threshold, "30d",
			"maskinporten controller config validation failed: " +
				"jwk_expiry must be greater than jwk_rotation_threshold: jwk_expiry=720h0m0s jwk_rotation_threshold=720h0m0s",
		},
		{expiry, "365d", ""},
		{
			expiry, "29s",
			"maskinporten controller config validation failed: " +
				"jwk_expiry must be at least the minimum duration: 30s",
		},
		{
			expiry, "365d1ns",
			"maskinporten controller config validation failed: " +
				"jwk_expiry must be at most the maximum duration: 8760h0m0s",
		},
	}
	for _, tt := range tests {
		t.Run(tt.key+"="+tt.value, func(t *testing.T) {
			g := NewWithT(t)
			cfg, err := loadLocal(t, withLine(tt.key, tt.key+"="+tt.value))
			if tt.err == "" {
				g.Expect(err).NotTo(HaveOccurred())
				g.Expect(cfg).NotTo(BeNil())
				return
			}
			g.Expect(cfg).To(BeNil())
			g.Expect(err).To(MatchError(tt.err))
		})
	}
}

func TestLoadDurationErrors(t *testing.T) {
	const prefix = "error unmarshalling config '<path>': decoding failed due to the following error(s):\n\n"
	tests := []struct {
		name     string
		contents string
		err      string
	}{
		{
			name:     "missing unit",
			contents: withLine("maskinporten_controller.requeue_after", "maskinporten_controller.requeue_after=5"),
			err: prefix + `'maskinporten_controller.requeue_after' parse duration "5": ` +
				`time: missing unit in duration "5"`,
		},
		{
			name:     "empty",
			contents: withLine("keyvault_sync_controller.poll_interval", "keyvault_sync_controller.poll_interval="),
			err:      prefix + `'keyvault_sync_controller.poll_interval' parse duration "": time: invalid duration ""`,
		},
		{
			name:     "bad days remainder",
			contents: withLine("maskinporten_controller.jwk_expiry", "maskinporten_controller.jwk_expiry=1dx"),
			err: prefix + `'maskinporten_controller.jwk_expiry' parse duration remainder "x": ` +
				`time: invalid duration "x"`,
		},
		{
			name: "several, in field order",
			contents: "keyvault_sync_controller.poll_interval=1y\n" +
				"maskinporten_controller.jwk_expiry=1x\n" +
				"maskinporten_controller.requeue_after=abc\n" +
				"maskinporten_controller.jwk_rotation_threshold=1h\n",
			err: prefix +
				`'maskinporten_controller.requeue_after' parse duration "abc": time: invalid duration "abc"` + "\n" +
				`'maskinporten_controller.jwk_expiry' parse duration "1x": time: unknown unit "x" in duration "1x"` +
				"\n" +
				`'keyvault_sync_controller.poll_interval' parse duration "1y": time: unknown unit "y" in duration "1y"`,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			g := NewWithT(t)
			cfg, err := loadLocal(t, tt.contents)
			g.Expect(cfg).To(BeNil())
			g.Expect(err).To(MatchError(tt.err))
		})
	}
}

func TestLoadSyntaxErrors(t *testing.T) {
	for _, contents := range []string{
		"maskinporten_api.client-id=x",
		"maskinporten_api.jwk='{\"unterminated\":true}",
	} {
		t.Run(contents, func(t *testing.T) {
			g := NewWithT(t)
			cfg, err := loadLocal(t, validConfigFile+contents)
			g.Expect(cfg).To(BeNil())
			g.Expect(err).To(MatchError(HavePrefix("error loading config '<path>': ")))
		})
	}
}
