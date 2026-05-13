// Package config loads and validates the runner-org-sync runtime configuration
// from environment variables. The loader is fail-fast and aggregates all
// invalid/missing values into a single error so a misconfigured CronJob
// surfaces every problem in one run, not one per restart.
package config

import (
	"errors"
	"fmt"
	"os"
	"strings"
)

const (
	EnvGiteaURL           = "RUNNER_ORG_SYNC_GITEA_URL"
	EnvOrgsJSONURL        = "RUNNER_ORG_SYNC_ORGS_JSON_URL"
	EnvOutputNamespace    = "RUNNER_ORG_SYNC_OUTPUT_NAMESPACE"
	EnvSecretNamePattern  = "RUNNER_ORG_SYNC_SECRET_NAME_PATTERN"
	EnvConfigMapName      = "RUNNER_ORG_SYNC_CONFIGMAP_NAME"
	EnvKeyVaultName       = "RUNNER_ORG_SYNC_KEYVAULT_NAME"
	EnvKeyVaultSecretName = "RUNNER_ORG_SYNC_KEYVAULT_SECRET_NAME"
	EnvSyncAll            = "RUNNER_ORG_SYNC_SYNC_ALL"
	EnvWhitelistedOrgs    = "RUNNER_ORG_SYNC_ORGS"
	EnvGiteaPATOverride   = "RUNNER_ORG_SYNC_GITEA_PAT"

	// KEDA PAT projection: read-only Gitea PAT consumed by KEDA's
	// github-runner scaler. Fetched from the same Key Vault as the admin
	// PAT, written to a K8s Secret in OutputNamespace.
	EnvKedaPATKeyVaultSecretName = "RUNNER_ORG_SYNC_KEDA_PAT_KEYVAULT_SECRET_NAME"
	EnvKedaPATSecretName         = "RUNNER_ORG_SYNC_KEDA_PAT_SECRET_NAME"
	EnvKedaPATSecretKey          = "RUNNER_ORG_SYNC_KEDA_PAT_SECRET_KEY"
	EnvKedaPATOverride           = "RUNNER_ORG_SYNC_KEDA_PAT"

	// OrgPlaceholder is the substring SecretNamePattern must contain;
	// it is substituted with the org code at apply time.
	OrgPlaceholder = "{org}"
)

// Config holds validated runtime settings. Construct only via Load/LoadFrom.
type Config struct {
	GiteaURL           string
	OrgsJSONURL        string
	OutputNamespace    string
	SecretNamePattern  string
	ConfigMapName      string
	KeyVaultName       string
	KeyVaultSecretName string
	SyncAll            bool
	WhitelistedOrgs    []string
	GiteaPATOverride   string

	// KEDA PAT projection settings. KedaPATKeyVaultSecretName is the secret
	// name in Azure Key Vault; KedaPATSecretName/Key control the destination
	// K8s Secret. KedaPATOverride is a local-dev bypass mirroring GiteaPATOverride.
	KedaPATKeyVaultSecretName string
	KedaPATSecretName         string
	KedaPATSecretKey          string
	KedaPATOverride           string
}

// Getter abstracts os.Getenv so tests can inject a fake environment without
// mutating the process global state.
type Getter func(key string) string

// Load reads configuration from the process environment.
func Load() (Config, error) {
	return LoadFrom(os.Getenv)
}

// LoadFrom reads configuration using the supplied getter and validates it.
// Every failure is collected and reported in a single joined error.
func LoadFrom(get Getter) (Config, error) {
	cfg := Config{
		GiteaURL:           strings.TrimSpace(get(EnvGiteaURL)),
		OrgsJSONURL:        strings.TrimSpace(get(EnvOrgsJSONURL)),
		OutputNamespace:    strings.TrimSpace(get(EnvOutputNamespace)),
		SecretNamePattern:  strings.TrimSpace(get(EnvSecretNamePattern)),
		ConfigMapName:      strings.TrimSpace(get(EnvConfigMapName)),
		KeyVaultName:       strings.TrimSpace(get(EnvKeyVaultName)),
		KeyVaultSecretName: strings.TrimSpace(get(EnvKeyVaultSecretName)),
		SyncAll:            parseBool(get(EnvSyncAll)),
		WhitelistedOrgs:    parseCSV(get(EnvWhitelistedOrgs)),
		GiteaPATOverride:   get(EnvGiteaPATOverride),

		KedaPATKeyVaultSecretName: strings.TrimSpace(get(EnvKedaPATKeyVaultSecretName)),
		KedaPATSecretName:         strings.TrimSpace(get(EnvKedaPATSecretName)),
		KedaPATSecretKey:          strings.TrimSpace(get(EnvKedaPATSecretKey)),
		KedaPATOverride:           get(EnvKedaPATOverride),
	}

	var errs []error
	requireField(&errs, EnvGiteaURL, cfg.GiteaURL)
	requireField(&errs, EnvOrgsJSONURL, cfg.OrgsJSONURL)
	requireField(&errs, EnvOutputNamespace, cfg.OutputNamespace)
	requireField(&errs, EnvSecretNamePattern, cfg.SecretNamePattern)
	requireField(&errs, EnvConfigMapName, cfg.ConfigMapName)
	requireField(&errs, EnvKedaPATSecretName, cfg.KedaPATSecretName)
	requireField(&errs, EnvKedaPATSecretKey, cfg.KedaPATSecretKey)

	if cfg.SecretNamePattern != "" && !strings.Contains(cfg.SecretNamePattern, OrgPlaceholder) {
		errs = append(errs, fmt.Errorf("%s must contain the %q placeholder", EnvSecretNamePattern, OrgPlaceholder))
	}

	// Admin PAT must be reachable either via override (local dev) or via Key Vault (in-cluster).
	if cfg.GiteaPATOverride == "" {
		requireField(&errs, EnvKeyVaultName, cfg.KeyVaultName)
		requireField(&errs, EnvKeyVaultSecretName, cfg.KeyVaultSecretName)
	}

	// KEDA PAT has the same shape: override or KV-secret-name. KeyVaultName is
	// shared with the admin PAT (one vault, multiple secrets), so it's already
	// validated above.
	if cfg.KedaPATOverride == "" {
		requireField(&errs, EnvKedaPATKeyVaultSecretName, cfg.KedaPATKeyVaultSecretName)
	}

	// Either syncAll=true or a non-empty whitelist. An empty intersection is
	// almost certainly a misconfiguration, not an intended "sync nothing".
	if !cfg.SyncAll && len(cfg.WhitelistedOrgs) == 0 {
		errs = append(errs, fmt.Errorf("either %s=true or %s must be a non-empty CSV list", EnvSyncAll, EnvWhitelistedOrgs))
	}

	if len(errs) > 0 {
		return Config{}, fmt.Errorf("invalid configuration: %w", errors.Join(errs...))
	}
	return cfg, nil
}

// SecretNameFor renders SecretNamePattern for the given org code.
func (c Config) SecretNameFor(org string) string {
	return strings.ReplaceAll(c.SecretNamePattern, OrgPlaceholder, org)
}

func requireField(errs *[]error, name, value string) {
	if value == "" {
		*errs = append(*errs, fmt.Errorf("%s is required", name))
	}
}

func parseBool(raw string) bool {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "1", "t", "true", "yes", "y":
		return true
	default:
		return false
	}
}

func parseCSV(raw string) []string {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	seen := make(map[string]struct{}, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		if _, dup := seen[p]; dup {
			continue
		}
		seen[p] = struct{}{}
		out = append(out, p)
	}
	return out
}
