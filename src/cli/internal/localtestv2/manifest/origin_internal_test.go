package manifest

import (
	"errors"
	"slices"
	"strings"
	"testing"
)

func TestThePublicSectionIsTheDefaultOrigin(t *testing.T) {
	t.Parallel()
	m := MustDefault()
	o := m.DefaultOrigin()
	if o.URL() != "http://local.altinn.cloud:8000" {
		t.Fatalf("default origin %s", o.URL())
	}
	want := []string{
		"local.altinn.cloud", "pdf.local.altinn.cloud", "workflow-engine.local.altinn.cloud",
		"app-frontend.local.altinn.cloud", "af.local.altinn.cloud",
	}
	if got := o.Hosts(); !slices.Equal(got, want) {
		t.Fatalf("hosts %v, want %v", got, want)
	}
	if got := m.Origin("origin.test", 0); got.URL() != "http://origin.test:8000" {
		t.Fatalf("a host alone keeps the default port: %s", got.URL())
	}
	if got := m.Origin("", 18000); got.URL() != "http://local.altinn.cloud:18000" {
		t.Fatalf("a port alone keeps the default host: %s", got.URL())
	}
}

func TestEveryPlaceholderResolves(t *testing.T) {
	t.Parallel()
	o := Origin{Host: "origin.test", Port: 18000, Subdomains: []string{"pdf", "af"}}
	cases := map[string]string{
		"{{origin}}":                          "http://origin.test:18000",
		"{{origin}}/":                         "http://origin.test:18000/",
		"{{host}}":                            "origin.test",
		"{{port}}":                            "18000",
		"{{origin:af}}":                       "http://af.origin.test:18000",
		"{{host:pdf}}":                        "pdf.origin.test",
		"{{origin}}/a,{{origin:af}}/b":        "http://origin.test:18000/a,http://af.origin.test:18000/b",
		"Host=postgres;Port=5432":             "Host=postgres;Port=5432",
		"{{origin}}/{Org}/{App}/instances/":   "http://origin.test:18000/{Org}/{App}/instances/",
		"redis://redis:6379/2":                "redis://redis:6379/2",
		"literal {single} braces stay as are": "literal {single} braces stay as are",
	}
	for value, want := range cases {
		if err := o.checkPlaceholders(value); err != nil {
			t.Errorf("%q: %v", value, err)
		}
		if got := o.Resolve(value); got != want {
			t.Errorf("Resolve(%q) = %q, want %q", value, got, want)
		}
	}
}

func TestABadPlaceholderIsAManifestErrorNamingTheContainerAndKey(t *testing.T) {
	t.Parallel()
	cases := map[string]string{
		"unknown name":                "{{scheme}}://x",
		"unknown name with subdomain": "{{url:pdf}}",
		"port with subdomain":         "{{port:pdf}}",
		"unlisted subdomain":          "{{origin:grafana}}",
		"empty":                       "{{}}",
		"unclosed":                    "{{origin",
		"nested":                      "{{{{origin}}}}",
		"case matters":                "{{Origin}}",
	}
	for name, value := range cases {
		err := mutated(t, func(m map[string]any) {
			envs, ok := containerNamed(m, "storage")["envs"].(map[string]any)
			if !ok {
				t.Fatal("storage has no envs")
			}
			envs["GeneralSettings__PlatformEndpoint"] = value
		})
		if !errors.Is(err, errPlaceholder) || !errors.Is(err, errInvalid) {
			t.Errorf("%s (%q): %v, want a placeholder error", name, value, err)
			continue
		}
		const where = "container storage: envs GeneralSettings__PlatformEndpoint: "
		if !strings.Contains(err.Error(), where) {
			t.Errorf("%s: %q does not name the container and key", name, err)
		}
	}
}

func TestParseRefusesABadPublicSection(t *testing.T) {
	t.Parallel()
	cases := map[string]struct {
		mutate func(p map[string]any)
		want   error
	}{
		"no host":            {func(p map[string]any) { delete(p, "host") }, errHost},
		"upper-case host":    {func(p map[string]any) { p["host"] = "Local.Altinn.Cloud" }, errHost},
		"host with a port":   {func(p map[string]any) { p["host"] = "local.altinn.cloud:8000" }, errHost},
		"IP address":         {func(p map[string]any) { p["host"] = "127.0.0.1" }, errHost},
		"no port":            {func(p map[string]any) { delete(p, "port") }, errValue},
		"port out of range":  {func(p map[string]any) { p["port"] = 70000 }, errValue},
		"bad subdomain":      {func(p map[string]any) { p["subdomains"] = []any{"pdf.x"} }, errValue},
		"duplicate sub":      {func(p map[string]any) { p["subdomains"] = []any{"pdf", "pdf"} }, errDuplicate},
		"unknown key":        {func(p map[string]any) { p["scheme"] = "https" }, errUnknownKey},
		"unlisted subdomain": {func(p map[string]any) { p["subdomains"] = []any{"pdf"} }, errPlaceholder},
	}
	for name, c := range cases {
		err := mutated(t, func(m map[string]any) {
			public, ok := m["public"].(map[string]any)
			if !ok {
				t.Fatal("no public section")
			}
			c.mutate(public)
		})
		if !errors.Is(err, c.want) {
			t.Errorf("%s: %v, want %v", name, err, c.want)
		}
	}
	if err := mutated(t, func(m map[string]any) { delete(m, "public") }); !errors.Is(err, errHost) {
		t.Errorf("no public section: %v", err)
	}
}

func TestCheckHost(t *testing.T) {
	t.Parallel()
	for _, host := range []string{"local.altinn.cloud", "origin.test", "localhost", "a-b.c1"} {
		if err := CheckHost(host); err != nil {
			t.Errorf("CheckHost(%q) = %v", host, err)
		}
	}
	for _, host := range []string{"", "-a.test", "a..test", "a_b.test", "http://a.test", "10.0.0.1", "a.test."} {
		if err := CheckHost(host); !errors.Is(err, errHost) {
			t.Errorf("CheckHost(%q) = %v, want an error", host, err)
		}
	}
}
