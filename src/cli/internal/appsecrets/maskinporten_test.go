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
		"base64 of something that is not a JWK": {
			input: `{"clientId": "c", "authority": "https://maskinporten.no/", "jwkBase64": "YWJjZA=="}`,
			want:  "not a JWK object",
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

func TestParseMaskinportenClient_StoresTheKeyInTheAlphabetTheAppDecodes(t *testing.T) {
	t.Parallel()

	// The app libraries decode with the standard padded alphabet only; a key encoded by a base64url tool,
	// unpadded, must not be stored as pasted or the first token request fails where set said all was well.
	urlEncoded := base64.RawURLEncoding.EncodeToString([]byte(testJwk))
	if urlEncoded == testJwkBase64() {
		t.Fatal("fixture does not distinguish the alphabets")
	}

	client, err := appsecrets.ParseMaskinportenClient([]byte(`{
		"clientId": "c", "authority": "https://test.maskinporten.no/", "jwkBase64": "` + urlEncoded + `"
	}`))
	if err != nil {
		t.Fatalf("ParseMaskinportenClient() error = %v", err)
	}
	if client.JwkBase64 != testJwkBase64() {
		t.Fatalf("JwkBase64 = %q, want the standard padded encoding %q", client.JwkBase64, testJwkBase64())
	}
}

func TestParseMaskinportenClient_UnwrapsTheDefaultSectionBesideOtherKeys(t *testing.T) {
	t.Parallel()

	// A whole appsettings file pasted with the default section in it: the section wins over the noise.
	client, err := appsecrets.ParseMaskinportenClient([]byte(`{
		"Logging": { "LogLevel": { "Default": "Information" } },
		"MaskinportenSettings": { "clientId": "c-default", "authority": "https://test.maskinporten.no/", "jwk": ` + testJwk + ` }
	}`))
	if err != nil {
		t.Fatalf("ParseMaskinportenClient() error = %v", err)
	}
	if client.ClientID != "c-default" {
		t.Fatalf("ClientID = %q, want c-default", client.ClientID)
	}
}

func TestParseMaskinportenClient_UnwrapsANestedSectionAndExplainsAWholeFile(t *testing.T) {
	t.Parallel()

	// The upgrade report names nested paths such as Integrations:Fiks:Maskinporten; pasting the chain works.
	client, err := appsecrets.ParseMaskinportenClient([]byte(`{
		"Integrations": { "Fiks": { "Maskinporten": {
			"clientId": "c-nested", "authority": "https://test.maskinporten.no/", "jwk": ` + testJwk + `
		} } }
	}`))
	if err != nil {
		t.Fatalf("ParseMaskinportenClient() error = %v", err)
	}
	if client.ClientID != "c-nested" {
		t.Fatalf("ClientID = %q, want c-nested", client.ClientID)
	}

	// A whole file with an app-prefixed section beside other keys cannot be unwrapped; say what to paste.
	_, err = appsecrets.ParseMaskinportenClient([]byte(`{
		"Logging": {},
		"my-app--MaskinportenSettings": { "clientId": "c", "authority": "https://test.maskinporten.no/", "jwk": ` + testJwk + ` }
	}`))
	if !errors.Is(err, appsecrets.ErrInvalidMaskinportenClient) || !strings.Contains(err.Error(), "paste the section") {
		t.Fatalf("error = %v, want ErrInvalidMaskinportenClient telling the developer to paste the section", err)
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
	if !errors.Is(err, appsecrets.ErrInvalidMaskinportenClient) || !strings.Contains(err.Error(), "paste the section") {
		t.Fatalf("error = %v, want ErrInvalidMaskinportenClient telling the developer to paste the section", err)
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
	assertOwnerOnly(t, path, 0o600)
	assertOwnerOnly(t, dir, 0o700)
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
	summary := loaded.Summary()
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

// assertOwnerOnly checks a Unix mode; on Windows the owner-only guarantee is an ACL the test cannot read.
func assertOwnerOnly(t *testing.T, path string, want os.FileMode) {
	t.Helper()
	if runtime.GOOS == "windows" {
		return
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("Stat(%s) error = %v", path, err)
	}
	if perm := info.Mode().Perm(); perm != want {
		t.Fatalf("permissions of %s = %o, want %o", path, perm, want)
	}
}

func TestCheckPrivateKey(t *testing.T) {
	t.Parallel()

	if err := appsecrets.CheckPrivateKey(testJwkBase64()); err != nil {
		t.Fatalf("CheckPrivateKey(base64) error = %v, want nil", err)
	}
	if err := appsecrets.CheckPrivateKey(testJwk); err != nil {
		t.Fatalf("CheckPrivateKey(json) error = %v, want nil", err)
	}
	for input, want := range map[string]string{
		"":                      "the key is required",
		"abcd":                  "not a JWK object",
		"not base64 at all!!":   "not base64",
		`{"kty":"RSA","d":"x"}`: "missing use, kid",
	} {
		err := appsecrets.CheckPrivateKey(input)
		if !errors.Is(err, appsecrets.ErrInvalidMaskinportenClient) || !strings.Contains(err.Error(), want) {
			t.Errorf("CheckPrivateKey(%q) error = %v, want it to mention %q", input, err, want)
		}
	}
}
