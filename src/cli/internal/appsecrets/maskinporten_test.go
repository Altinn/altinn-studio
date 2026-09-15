package appsecrets_test

import (
	"encoding/base64"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/appsecrets"
)

const (
	testJwk       = `{"kty":"RSA","use":"sig","kid":"test-key","alg":"RS256","n":"modulus","e":"AQAB","d":"private-part","p":"p","q":"q","qi":"qi","dp":"dp","dq":"dq"}`
	testAuthority = "https://test.maskinporten.no/"
)

func testJwkBase64() string {
	return base64.StdEncoding.EncodeToString([]byte(testJwk))
}

func TestParseMaskinportenClient_AcceptsTheProvisionedFileFormat(t *testing.T) {
	t.Parallel()

	client, err := appsecrets.ParseMaskinportenClient([]byte(`{
		"MaskinportenSettings": {
			"authority": "https://test.maskinporten.no/",
			"clientId": "client-1",
			"jwk": ` + testJwk + `
		}
	}`))
	if err != nil {
		t.Fatalf("ParseMaskinportenClient() error = %v", err)
	}
	if client.ClientID != "client-1" || client.Authority != testAuthority {
		t.Fatalf("client = %+v, want client-1 at test.maskinporten.no", client)
	}
	if len(client.Jwk) == 0 || client.JwkBase64 != "" {
		t.Fatalf("client = %+v, want the jwk kept as an object", client)
	}
}

func TestParseMaskinportenClient_AcceptsBareCredentialsWithAnyKeyCasing(t *testing.T) {
	t.Parallel()

	client, err := appsecrets.ParseMaskinportenClient([]byte(`{
		"Authority": "https://maskinporten.no",
		"ClientId": "client-2",
		"JwkBase64": "` + testJwkBase64() + `"
	}`))
	if err != nil {
		t.Fatalf("ParseMaskinportenClient() error = %v", err)
	}
	if client.ClientID != "client-2" || client.JwkBase64 != testJwkBase64() {
		t.Fatalf("client = %+v, want client-2 with the base64 key", client)
	}
}

func TestParseMaskinportenClient_ConvertsAnExternalPackageSection(t *testing.T) {
	t.Parallel()

	// The Altinn.ApiClients.Maskinporten shape v8 apps commonly carried: an environment name instead of an
	// authority, and EncodedJwk instead of jwkBase64.
	client, err := appsecrets.ParseMaskinportenClient([]byte(`{
		"ClientId": "client-3",
		"Environment": "test",
		"Scope": "some:scope",
		"EncodedJwk": "` + testJwkBase64() + `"
	}`))
	if err != nil {
		t.Fatalf("ParseMaskinportenClient() error = %v", err)
	}
	if client.Authority != testAuthority {
		t.Fatalf("Authority = %q, want the test instance", client.Authority)
	}
	if client.JwkBase64 != testJwkBase64() {
		t.Fatalf("JwkBase64 = %q, want the EncodedJwk value", client.JwkBase64)
	}
}

func TestParseMaskinportenClient_Rejects(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		input string
		want  string
	}{
		"missing client id": {
			input: `{"authority": "https://test.maskinporten.no/", "jwk": ` + testJwk + `}`,
			want:  "clientId is missing",
		},
		"missing authority": {
			input: `{"clientId": "c", "jwk": ` + testJwk + `}`,
			want:  "authority is missing",
		},
		"http authority": {
			input: `{"clientId": "c", "authority": "http://maskinporten.no/", "jwk": ` + testJwk + `}`,
			want:  "not an https URL",
		},
		"unknown environment": {
			input: `{"clientId": "c", "environment": "ver2", "encodedJwk": "` + testJwkBase64() + `"}`,
			want:  `Environment "ver2"`,
		},
		"both key forms": {
			input: `{"clientId": "c", "authority": "https://maskinporten.no/", "jwk": ` + testJwk +
				`, "jwkBase64": "` + testJwkBase64() + `"}`,
			want: "exactly one of jwk and jwkBase64",
		},
		"no key": {
			input: `{"clientId": "c", "authority": "https://maskinporten.no/"}`,
			want:  "exactly one of jwk and jwkBase64",
		},
		"public key only": {
			input: `{"clientId": "c", "authority": "https://maskinporten.no/", "jwk": {"kty":"RSA","kid":"k","use":"sig","alg":"RS256","n":"m","e":"AQAB"}}`,
			want:  "missing d, p, q, qi, dp, dq",
		},
		"incomplete private key": {
			// The app libraries' converter refuses a key missing any RSA field; better to hear it now.
			input: `{"clientId": "c", "authority": "https://maskinporten.no/", "jwk": {"kty":"RSA","d":"x"}}`,
			want:  "missing use, kid, alg, n, e, p, q, qi, dp, dq",
		},
		"jwk as a string": {
			input: `{"clientId": "c", "authority": "https://maskinporten.no/", "jwk": "` + testJwkBase64() + `"}`,
			want:  "jwk must be a JSON object",
		},
		"certificate credentials": {
			input: `{"clientId": "c", "environment": "test", "EncodedX509": "MII..."}`,
			want:  "names a certificate",
		},
		"not an object": {
			input: `["not", "an", "object"]`,
			want:  "not a JSON object",
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			_, err := appsecrets.ParseMaskinportenClient([]byte(tc.input))
			if !errors.Is(err, appsecrets.ErrInvalidMaskinportenClient) {
				t.Fatalf("error = %v, want ErrInvalidMaskinportenClient", err)
			}
			if !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("error = %q, want it to mention %q", err, tc.want)
			}
		})
	}
}

func TestParseMaskinportenClient_UnwrapsAPastedSectionUnderAnyName(t *testing.T) {
	t.Parallel()

	// A v8 developer copies the section out of appsettings.Development.json, name and all.
	client, err := appsecrets.ParseMaskinportenClient([]byte(`{
		"my-app--MaskinportenSettings": {
			"authority": "https://test.maskinporten.no/",
			"clientId": "client-4",
			"jwkBase64": "` + testJwkBase64() + `"
		}
	}`))
	if err != nil {
		t.Fatalf("ParseMaskinportenClient() error = %v", err)
	}
	if client.ClientID != "client-4" {
		t.Fatalf("ClientID = %q, want client-4", client.ClientID)
	}

	// Two sections is not a paste of one client.
	_, err = appsecrets.ParseMaskinportenClient([]byte(`{"a": {"clientId": "x"}, "b": {"clientId": "y"}}`))
	if !errors.Is(err, appsecrets.ErrInvalidMaskinportenClient) {
		t.Fatalf("error = %v, want ErrInvalidMaskinportenClient for two wrapped objects", err)
	}
}

func TestStoreMaskinportenClient_WritesTheProvisionedFormatForTheOwnerOnly(t *testing.T) {
	t.Parallel()

	dir := filepath.Join(t.TempDir(), "apps", "ttd-app", "secrets")
	client, err := appsecrets.ParseMaskinportenClient([]byte(`{
		"clientId": "client-5", "authority": "https://test.maskinporten.no/", "jwk": ` + testJwk + `
	}`))
	if err != nil {
		t.Fatalf("ParseMaskinportenClient() error = %v", err)
	}

	path, err := appsecrets.StoreMaskinportenClient(dir, client)
	if err != nil {
		t.Fatalf("StoreMaskinportenClient() error = %v", err)
	}
	if path != appsecrets.MaskinportenPath(dir) {
		t.Fatalf("path = %q, want %q", path, appsecrets.MaskinportenPath(dir))
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile() error = %v", err)
	}
	if !strings.Contains(string(data), `"MaskinportenSettings"`) {
		t.Fatalf("file = %s, want the credentials wrapped as the operator writes them", data)
	}
	if runtime.GOOS != "windows" {
		info, statErr := os.Stat(path)
		if statErr != nil {
			t.Fatalf("Stat() error = %v", statErr)
		}
		if perm := info.Mode().Perm(); perm != 0o600 {
			t.Fatalf("permissions = %o, want 600", perm)
		}
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("ReadDir() error = %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("directory holds %d entries, want only the settings file (no temporary left behind)", len(entries))
	}

	loaded, err := appsecrets.LoadMaskinportenClient(dir)
	if err != nil {
		t.Fatalf("LoadMaskinportenClient() error = %v", err)
	}
	summary := loaded.Summary(path)
	if summary.ClientID != "client-5" || summary.Environment != appsecrets.EnvironmentTest ||
		summary.KeyID != "test-key" {
		t.Fatalf("summary = %+v, want client-5 / test / test-key", summary)
	}
}

func TestRemoveMaskinportenClient_ReportsWhetherThereWasOne(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	client, err := appsecrets.ParseMaskinportenClient([]byte(`{
		"clientId": "client-6", "authority": "https://test.maskinporten.no/", "jwk": ` + testJwk + `
	}`))
	if err != nil {
		t.Fatalf("ParseMaskinportenClient() error = %v", err)
	}
	if _, storeErr := appsecrets.StoreMaskinportenClient(dir, client); storeErr != nil {
		t.Fatalf("StoreMaskinportenClient() error = %v", storeErr)
	}

	removed, err := appsecrets.RemoveMaskinportenClient(dir)
	if err != nil || !removed {
		t.Fatalf("RemoveMaskinportenClient() = %v, %v; want true, nil", removed, err)
	}
	removed, err = appsecrets.RemoveMaskinportenClient(dir)
	if err != nil || removed {
		t.Fatalf("second RemoveMaskinportenClient() = %v, %v; want false, nil", removed, err)
	}
	if _, loadErr := appsecrets.LoadMaskinportenClient(dir); !errors.Is(loadErr, appsecrets.ErrNoMaskinportenClient) {
		t.Fatalf("LoadMaskinportenClient() after remove error = %v, want ErrNoMaskinportenClient", loadErr)
	}
}

func TestEnvironment(t *testing.T) {
	t.Parallel()

	tests := map[string]string{
		testAuthority:                   appsecrets.EnvironmentTest,
		"https://maskinporten.no":       appsecrets.EnvironmentProd,
		"https://MASKINPORTEN.NO/":      appsecrets.EnvironmentProd,
		"https://ver2.maskinporten.no/": appsecrets.EnvironmentUnknown,
		"not a url at all ://":          appsecrets.EnvironmentUnknown,
	}
	for authority, want := range tests {
		if got := appsecrets.Environment(authority); got != want {
			t.Errorf("Environment(%q) = %q, want %q", authority, got, want)
		}
	}
}
