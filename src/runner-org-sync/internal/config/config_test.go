package config

import (
	"strings"
	"testing"
)

// validEnv returns a baseline env map representing a fully valid configuration.
// Tests mutate a copy to exercise one validation branch at a time.
func validEnv() map[string]string {
	return map[string]string{
		EnvGiteaURL:                  "http://gitea.local",
		EnvOrgsJSONURL:               "https://altinncdn.no/orgs/altinn-orgs.json",
		EnvOutputNamespace:           "studio-runners",
		EnvSecretNamePattern:         "altinn-gitea-runner-{org}-secret",
		EnvConfigMapName:             "runner-org-list",
		EnvKeyVaultName:              "kv-studio",
		EnvKeyVaultSecretName:        "gitea-admin-pat",
		EnvWhitelistedOrgs:           "ttd,brg,dsb",
		EnvKedaPATKeyVaultSecretName: "gitea-keda-pat",
		EnvKedaPATSecretName:         "keda-gitea-pat",
		EnvKedaPATSecretKey:          "token",
	}
}

func getter(env map[string]string) Getter {
	return func(k string) string { return env[k] }
}

func TestLoadFrom_Valid(t *testing.T) {
	cfg, err := LoadFrom(getter(validEnv()))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.GiteaURL != "http://gitea.local" {
		t.Errorf("GiteaURL = %q", cfg.GiteaURL)
	}
	if got, want := cfg.WhitelistedOrgs, []string{"ttd", "brg", "dsb"}; !equalSlice(got, want) {
		t.Errorf("WhitelistedOrgs = %v, want %v", got, want)
	}
	if cfg.SyncAll {
		t.Errorf("SyncAll = true, want false")
	}
	if cfg.GiteaPATOverride != "" {
		t.Errorf("GiteaPATOverride = %q, want empty (no override in baseline env)", cfg.GiteaPATOverride)
	}
}

func TestLoadFrom_PATOverrideRelaxesKeyVaultRequirement(t *testing.T) {
	env := validEnv()
	delete(env, EnvKeyVaultName)
	delete(env, EnvKeyVaultSecretName)
	env[EnvGiteaPATOverride] = "pat-xyz"

	cfg, err := LoadFrom(getter(env))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.GiteaPATOverride != "pat-xyz" {
		t.Errorf("GiteaPATOverride = %q, want pat-xyz", cfg.GiteaPATOverride)
	}
}

func TestLoadFrom_KedaPATOverrideRelaxesKVRequirement(t *testing.T) {
	env := validEnv()
	delete(env, EnvKedaPATKeyVaultSecretName)
	env[EnvKedaPATOverride] = "keda-pat-xyz"

	cfg, err := LoadFrom(getter(env))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.KedaPATOverride != "keda-pat-xyz" {
		t.Errorf("KedaPATOverride = %q, want keda-pat-xyz", cfg.KedaPATOverride)
	}
	if cfg.GiteaPATOverride != "" {
		t.Errorf("GiteaPATOverride = %q, want empty (admin still goes to KV)", cfg.GiteaPATOverride)
	}
}

func TestLoadFrom_KedaPATFieldsRequired(t *testing.T) {
	env := validEnv()
	delete(env, EnvKedaPATSecretName)
	delete(env, EnvKedaPATSecretKey)
	delete(env, EnvKedaPATKeyVaultSecretName)

	_, err := LoadFrom(getter(env))
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	msg := err.Error()
	for _, want := range []string{EnvKedaPATSecretName, EnvKedaPATSecretKey, EnvKedaPATKeyVaultSecretName} {
		if !strings.Contains(msg, want) {
			t.Errorf("error does not mention %q; got %v", want, err)
		}
	}
}

func TestLoadFrom_RequiredFieldsAggregated(t *testing.T) {
	_, err := LoadFrom(getter(map[string]string{}))
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	msg := err.Error()
	// All required fields plus the whitelist invariant should appear in one error.
	wantSubstrings := []string{
		EnvGiteaURL,
		EnvOrgsJSONURL,
		EnvOutputNamespace,
		EnvSecretNamePattern,
		EnvConfigMapName,
		EnvKeyVaultName,
		EnvKeyVaultSecretName,
		"either RUNNER_ORG_SYNC_SYNC_ALL=true",
	}
	for _, s := range wantSubstrings {
		if !strings.Contains(msg, s) {
			t.Errorf("error does not mention %q\n full error: %s", s, msg)
		}
	}
}

func TestLoadFrom_SecretNamePatternMustContainPlaceholder(t *testing.T) {
	env := validEnv()
	env[EnvSecretNamePattern] = "altinn-gitea-runner-secret" // no {org}

	_, err := LoadFrom(getter(env))
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), OrgPlaceholder) {
		t.Errorf("error should mention %q placeholder; got: %v", OrgPlaceholder, err)
	}
}

func TestLoadFrom_SyncAllAcceptsEmptyWhitelist(t *testing.T) {
	env := validEnv()
	env[EnvSyncAll] = "true"
	delete(env, EnvWhitelistedOrgs)

	cfg, err := LoadFrom(getter(env))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !cfg.SyncAll {
		t.Errorf("SyncAll = false, want true")
	}
	if len(cfg.WhitelistedOrgs) != 0 {
		t.Errorf("WhitelistedOrgs = %v, want empty", cfg.WhitelistedOrgs)
	}
}

func TestLoadFrom_RejectsEmptyWhitelistWhenSyncAllOff(t *testing.T) {
	env := validEnv()
	delete(env, EnvWhitelistedOrgs)

	_, err := LoadFrom(getter(env))
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestParseCSV(t *testing.T) {
	cases := []struct {
		in   string
		want []string
	}{
		{"", nil},
		{"ttd", []string{"ttd"}},
		{"ttd,brg,dsb", []string{"ttd", "brg", "dsb"}},
		{" ttd , brg ,dsb ", []string{"ttd", "brg", "dsb"}},
		{"ttd,,brg", []string{"ttd", "brg"}},
		{",ttd,", []string{"ttd"}},
		{"ttd,brg,ttd", []string{"ttd", "brg"}}, // dedup
	}
	for _, c := range cases {
		got := parseCSV(c.in)
		if !equalSlice(got, c.want) {
			t.Errorf("parseCSV(%q) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestParseBool(t *testing.T) {
	cases := map[string]bool{
		"":      false,
		"true":  true,
		"TRUE":  true,
		"True":  true,
		"1":     true,
		"yes":   true,
		"y":     true,
		"t":     true,
		"false": false,
		"0":     false,
		"no":    false,
		"junk":  false,
	}
	for in, want := range cases {
		if got := parseBool(in); got != want {
			t.Errorf("parseBool(%q) = %v, want %v", in, got, want)
		}
	}
}

func TestSecretNameFor(t *testing.T) {
	c := Config{SecretNamePattern: "altinn-gitea-runner-{org}-secret"}
	if got, want := c.SecretNameFor("ttd"), "altinn-gitea-runner-ttd-secret"; got != want {
		t.Errorf("SecretNameFor = %q, want %q", got, want)
	}
}

func equalSlice(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
