// Package appsecrets provisions an app's secrets for a local run the way the operator does in a cluster: a
// directory of files the app libraries read from a location the platform names, never from the app's own
// configuration. Today the directory holds one file, the app's Maskinporten client.
package appsecrets

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"altinn.studio/studioctl/internal/osutil"
)

const (
	// MaskinportenFileName is the file the app libraries read the app's Maskinporten client from, in the
	// secrets directory - the same name, and the same content, the operator provisions in a cluster.
	MaskinportenFileName = "maskinporten-settings.json"

	// ContainerDir is where the app libraries read provisioned secrets in a cluster, and therefore where the
	// secrets directory is mounted when the app runs in a container.
	ContainerDir = "/mnt/app-secrets"

	// EnvSecretsDir is the environment variable through which a native run learns where its secrets directory
	// is. The app libraries honor it on the localtest platform only.
	EnvSecretsDir = "STUDIOCTL_APP_SECRETS_DIR" //nolint:gosec // G101: the name of a variable, not a credential.

	// wrapperKey is the object the provisioned file wraps the credentials in, for .NET configuration binding.
	wrapperKey = "MaskinportenSettings"

	authorityTest = "https://test.maskinporten.no/"
	authorityProd = "https://maskinporten.no/"
	hostTest      = "test.maskinporten.no"
	hostProd      = "maskinporten.no"
)

// Labels for the Maskinporten instance an authority points at.
const (
	EnvironmentTest    = "test"
	EnvironmentProd    = "prod"
	EnvironmentUnknown = "unknown"
)

// Sentinel errors for the Maskinporten client store.
var (
	// ErrNoMaskinportenClient is returned when no client is stored for the app.
	ErrNoMaskinportenClient = errors.New("no Maskinporten client stored")

	// ErrInvalidMaskinportenClient is returned when the supplied credentials cannot be used as the app's client.
	ErrInvalidMaskinportenClient = errors.New("invalid Maskinporten client")
)

// MaskinportenClient is the app's Maskinporten identity as the app libraries bind it: the content of the
// provisioned file without its wrapper object. Exactly one of Jwk and JwkBase64 carries the private key.
type MaskinportenClient struct {
	Authority string          `json:"authority"`
	ClientID  string          `json:"clientId"`
	JwkBase64 string          `json:"jwkBase64,omitempty"`
	Jwk       json.RawMessage `json:"jwk,omitempty"`
}

// MaskinportenClientSummary describes a stored client without its key material - and without where it is
// stored: that is studioctl's business, and naming the file would only invite editing it by hand.
type MaskinportenClientSummary struct {
	ClientID    string `json:"clientId"`
	Authority   string `json:"authority"`
	Environment string `json:"environment"`
	KeyID       string `json:"keyId,omitempty"`
}

// privateKey is the RSA JWK exactly as the app libraries require it: their converter rejects a key missing
// any of these fields, so a key that would fail there is rejected here, at store time, instead.
type privateKey struct {
	Kty string `json:"kty"`
	Use string `json:"use"`
	Kid string `json:"kid"`
	Alg string `json:"alg"`
	N   string `json:"n"`
	E   string `json:"e"`
	D   string `json:"d"`
	P   string `json:"p"`
	Q   string `json:"q"`
	Qi  string `json:"qi"`
	Dp  string `json:"dp"`
	Dq  string `json:"dq"`
}

// missingFields names the required fields that are empty, in the order the app libraries list them.
func (k privateKey) missingFields() []string {
	fields := []struct{ name, value string }{
		{"kty", k.Kty}, {"use", k.Use}, {"kid", k.Kid}, {"alg", k.Alg}, {"n", k.N}, {"e", k.E},
		{"d", k.D}, {"p", k.P}, {"q", k.Q}, {"qi", k.Qi}, {"dp", k.Dp}, {"dq", k.Dq},
	}
	var missing []string
	for _, field := range fields {
		if field.value == "" {
			missing = append(missing, field.name)
		}
	}
	return missing
}

// MaskinportenPath returns the path of the Maskinporten file in a secrets directory.
func MaskinportenPath(dir string) string {
	return filepath.Join(dir, MaskinportenFileName)
}

// Environment labels the Maskinporten instance an authority points at.
func Environment(authority string) string {
	parsed, err := url.Parse(authority)
	if err != nil {
		return EnvironmentUnknown
	}
	switch strings.ToLower(parsed.Hostname()) {
	case hostTest:
		return EnvironmentTest
	case hostProd:
		return EnvironmentProd
	default:
		return EnvironmentUnknown
	}
}

// ParseMaskinportenClient reads a client from any of the shapes a developer is likely to have at hand: the
// provisioned file itself (the credentials wrapped in a MaskinportenSettings object), the bare credentials, a
// section written for the Altinn.ApiClients.Maskinporten package (Environment and EncodedJwk instead of
// authority and jwkBase64), or a section pasted out of an appsettings file together with its name - a
// single wrapper object of any name, such as {"my-app--MaskinportenSettings": {...}}. Keys are matched
// case-insensitively, as .NET configuration matches them.
func ParseMaskinportenClient(data []byte) (MaskinportenClient, error) {
	object, err := parseObject(data)
	if err != nil {
		return MaskinportenClient{}, err
	}
	for {
		wrapped, ok := unwrap(object)
		if !ok {
			break
		}
		object, err = parseObject(wrapped)
		if err != nil {
			return MaskinportenClient{}, err
		}
	}
	if !hasCredentialKeys(object) {
		return MaskinportenClient{}, fmt.Errorf(
			"%w: this JSON holds no Maskinporten client - paste the section that carries clientId and the key, "+
				"with or without its name, not the whole file",
			ErrInvalidMaskinportenClient,
		)
	}
	return clientFromObject(object)
}

// hasCredentialKeys reports whether an object is the credentials themselves rather than something around them.
func hasCredentialKeys(object map[string]json.RawMessage) bool {
	_, ok := hasAny(object, "clientId", "authority", "jwk", "jwkBase64", "encodedJwk", "environment")
	return ok
}

// unwrap returns the one object a wrapper holds: the provisioned file's MaskinportenSettings object (even
// beside other keys, as in a pasted appsettings file), or a pasted section under whatever name the app gave
// it - through as many single-key levels as it was nested in. An object that carries a credential key itself
// is the credentials, not a wrapper.
func unwrap(object map[string]json.RawMessage) (json.RawMessage, bool) {
	if hasCredentialKeys(object) {
		return nil, false
	}
	if wrapped, ok := lookup(object, wrapperKey); ok && isObject(wrapped) {
		return wrapped, true
	}
	if len(object) != 1 {
		return nil, false
	}
	for _, raw := range object {
		if isObject(raw) {
			return raw, true
		}
	}
	return nil, false
}

// Validate reports whether the client is complete enough for the app libraries to sign a JWT grant with.
func (c MaskinportenClient) Validate() error {
	if c.ClientID == "" {
		return fmt.Errorf("%w: clientId is missing", ErrInvalidMaskinportenClient)
	}
	if c.Authority == "" {
		return fmt.Errorf("%w: authority is missing (or Environment: test or prod)", ErrInvalidMaskinportenClient)
	}
	parsed, err := url.Parse(c.Authority)
	if err != nil || parsed.Scheme != "https" || parsed.Hostname() == "" {
		return fmt.Errorf("%w: authority %q is not an https URL", ErrInvalidMaskinportenClient, c.Authority)
	}
	if (len(c.Jwk) > 0) == (c.JwkBase64 != "") {
		return fmt.Errorf("%w: exactly one of jwk and jwkBase64 must be supplied", ErrInvalidMaskinportenClient)
	}
	_, err = c.privateKey()
	return err
}

// Summary describes the client without its key material.
func (c MaskinportenClient) Summary() MaskinportenClientSummary {
	summary := MaskinportenClientSummary{
		ClientID:    c.ClientID,
		Authority:   c.Authority,
		Environment: Environment(c.Authority),
		KeyID:       "",
	}
	if key, err := c.privateKey(); err == nil {
		summary.KeyID = key.Kid
	}
	return summary
}

// StoreMaskinportenClient writes the client to the secrets directory in the provisioned file's format,
// readable by the owner only. The write is atomic - a temporary file in the same directory renamed into
// place - so an app polling the file never reads a half-written one.
func StoreMaskinportenClient(dir string, client MaskinportenClient) (string, error) {
	if err := client.Validate(); err != nil {
		return "", err
	}
	if err := os.MkdirAll(dir, osutil.DirPermOwnerOnly); err != nil {
		return "", fmt.Errorf("create secrets directory: %w", err)
	}
	payload, err := json.MarshalIndent(map[string]MaskinportenClient{wrapperKey: client}, "", "  ")
	if err != nil {
		return "", fmt.Errorf("encode Maskinporten client: %w", err)
	}
	path := MaskinportenPath(dir)
	// Owner-only on every platform: the mode on Unix, and on Windows the protected DACL the credentials file
	// gets, applied before the file appears at its final path.
	err = osutil.WriteFileAtomic(
		path,
		append(payload, '\n'),
		osutil.AtomicWriteOptions{Perm: osutil.FilePermOwnerOnly, OwnerOnly: true},
	)
	if err != nil {
		return "", fmt.Errorf("store %s: %w", MaskinportenFileName, err)
	}
	return path, nil
}

// LoadMaskinportenClient reads the stored client, or ErrNoMaskinportenClient when there is none.
func LoadMaskinportenClient(dir string) (MaskinportenClient, error) {
	path := MaskinportenPath(dir)
	data, err := os.ReadFile(path) //nolint:gosec // The path is under the configured studioctl home.
	if errors.Is(err, os.ErrNotExist) {
		return MaskinportenClient{}, ErrNoMaskinportenClient
	}
	if err != nil {
		return MaskinportenClient{}, fmt.Errorf("read the stored Maskinporten client: %w", err)
	}
	client, err := ParseMaskinportenClient(data)
	if err != nil {
		return MaskinportenClient{}, fmt.Errorf(
			"the stored Maskinporten client is unreadable (%w); remove it and store it again",
			err,
		)
	}
	return client, nil
}

// RemoveMaskinportenClient deletes the stored client and reports whether there was one.
func RemoveMaskinportenClient(dir string) (bool, error) {
	err := os.Remove(MaskinportenPath(dir))
	if errors.Is(err, os.ErrNotExist) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("remove Maskinporten client: %w", err)
	}
	return true, nil
}

// CheckPrivateKey reports whether a key, given as the JWK JSON or as its base64 encoding, is the complete
// RSA private key the app libraries require. It is what set's guided prompt checks an answer with before
// accepting it, so the same rule applies whichever way the key arrives.
func CheckPrivateKey(key string) error {
	key = strings.TrimSpace(key)
	if key == "" {
		return fmt.Errorf("%w: the key is required", ErrInvalidMaskinportenClient)
	}
	client := MaskinportenClient{Jwk: nil, Authority: "", ClientID: "", JwkBase64: ""}
	if strings.HasPrefix(key, "{") {
		client.Jwk = json.RawMessage(key)
	} else {
		client.JwkBase64 = key
	}
	_, err := client.privateKey()
	return err
}

func (c MaskinportenClient) privateKey() (privateKey, error) {
	raw := c.Jwk
	if c.JwkBase64 != "" {
		decoded, err := decodeBase64(c.JwkBase64)
		if err != nil {
			return privateKey{}, fmt.Errorf(
				"%w: the key is not base64 - paste the base64-encoded JWK, or the JWK JSON itself",
				ErrInvalidMaskinportenClient,
			)
		}
		raw = decoded
	}
	var key privateKey
	if err := json.Unmarshal(raw, &key); err != nil {
		// Short garbage often decodes as base64; the decoded bytes are not worth quoting back.
		return privateKey{}, fmt.Errorf(
			"%w: the key is not a JWK object - paste the base64-encoded JWK, or the JWK JSON itself",
			ErrInvalidMaskinportenClient,
		)
	}
	if missing := key.missingFields(); len(missing) > 0 {
		return privateKey{}, fmt.Errorf(
			"%w: the JWK is missing %s - the app libraries need a complete RSA private key "+
				"(kty, use, kid, alg, n, e, d, p, q, qi, dp, dq); a public key is not enough",
			ErrInvalidMaskinportenClient,
			strings.Join(missing, ", "),
		)
	}
	return key, nil
}

func clientFromObject(object map[string]json.RawMessage) (MaskinportenClient, error) {
	if key, ok := hasAny(object, "encodedX509", "certificatePkcs12Path", "certificateStoreThumbprint"); ok {
		return MaskinportenClient{}, fmt.Errorf(
			"%w: %s names a certificate, but the app libraries authenticate with a JWK; "+
				"register a JWK for the client in Maskinporten and supply that instead",
			ErrInvalidMaskinportenClient,
			key,
		)
	}

	var client MaskinportenClient
	var err error
	if client.ClientID, err = stringField(object, "clientId"); err != nil {
		return MaskinportenClient{}, err
	}
	if client.Authority, err = stringField(object, "authority"); err != nil {
		return MaskinportenClient{}, err
	}
	if client.Authority == "" {
		if client.Authority, err = authorityFromEnvironment(object); err != nil {
			return MaskinportenClient{}, err
		}
	}
	if client.JwkBase64, err = stringField(object, "jwkBase64", "encodedJwk"); err != nil {
		return MaskinportenClient{}, err
	}
	if client.JwkBase64 != "" {
		// Encoders differ, but the app libraries decode with the standard padded alphabet and nothing else, so
		// the stored value is re-encoded that way whatever the input used.
		decoded, decodeErr := decodeBase64(client.JwkBase64)
		if decodeErr != nil {
			return MaskinportenClient{}, fmt.Errorf(
				"%w: jwkBase64 is not base64: %w",
				ErrInvalidMaskinportenClient,
				decodeErr,
			)
		}
		client.JwkBase64 = base64.StdEncoding.EncodeToString(decoded)
	}
	if jwk, ok := lookup(object, "jwk"); ok {
		if !isObject(jwk) {
			return MaskinportenClient{}, fmt.Errorf(
				"%w: jwk must be a JSON object (a base64-encoded key goes in jwkBase64)",
				ErrInvalidMaskinportenClient,
			)
		}
		client.Jwk = jwk
	}
	return client, client.Validate()
}

// AuthorityForEnvironment maps a Maskinporten environment name - test or prod, the names the external
// package's Environment setting uses - to the authority the app libraries need.
func AuthorityForEnvironment(name string) (string, bool) {
	switch strings.ToLower(strings.TrimSpace(name)) {
	case EnvironmentTest:
		return authorityTest, true
	case EnvironmentProd:
		return authorityProd, true
	default:
		return "", false
	}
}

func authorityFromEnvironment(object map[string]json.RawMessage) (string, error) {
	environment, err := stringField(object, "environment")
	if err != nil || environment == "" {
		return "", err
	}
	authority, ok := AuthorityForEnvironment(environment)
	if !ok {
		return "", fmt.Errorf(
			"%w: Environment %q is not test or prod - supply the authority URL instead",
			ErrInvalidMaskinportenClient,
			environment,
		)
	}
	return authority, nil
}

func parseObject(data []byte) (map[string]json.RawMessage, error) {
	var object map[string]json.RawMessage
	if err := json.Unmarshal(data, &object); err != nil {
		return nil, fmt.Errorf(
			"%w: not a JSON object (comments and trailing commas are not supported here): %w",
			ErrInvalidMaskinportenClient,
			err,
		)
	}
	if object == nil {
		return nil, fmt.Errorf("%w: not a JSON object", ErrInvalidMaskinportenClient)
	}
	return object, nil
}

// lookup finds a key case-insensitively, as .NET configuration does.
func lookup(object map[string]json.RawMessage, key string) (json.RawMessage, bool) {
	if value, ok := object[key]; ok {
		return value, true
	}
	for candidate, value := range object {
		if strings.EqualFold(candidate, key) {
			return value, true
		}
	}
	return nil, false
}

func hasAny(object map[string]json.RawMessage, keys ...string) (string, bool) {
	for _, key := range keys {
		if _, ok := lookup(object, key); ok {
			return key, true
		}
	}
	return "", false
}

// stringField returns the first of keys present, which must hold a string.
func stringField(object map[string]json.RawMessage, keys ...string) (string, error) {
	for _, key := range keys {
		raw, ok := lookup(object, key)
		if !ok {
			continue
		}
		var value string
		if err := json.Unmarshal(raw, &value); err != nil {
			return "", fmt.Errorf("%w: %s must be a string", ErrInvalidMaskinportenClient, key)
		}
		return value, nil
	}
	return "", nil
}

func isObject(raw json.RawMessage) bool {
	trimmed := strings.TrimSpace(string(raw))
	return strings.HasPrefix(trimmed, "{")
}

// decodeBase64 accepts the standard and URL alphabets, padded or not - encoders differ.
func decodeBase64(value string) ([]byte, error) {
	value = strings.TrimSpace(value)
	var firstErr error
	for _, encoding := range []*base64.Encoding{
		base64.StdEncoding,
		base64.RawStdEncoding,
		base64.URLEncoding,
		base64.RawURLEncoding,
	} {
		decoded, err := encoding.DecodeString(value)
		if err == nil {
			return decoded, nil
		}
		if firstErr == nil {
			firstErr = err
		}
	}
	return nil, firstErr
}
