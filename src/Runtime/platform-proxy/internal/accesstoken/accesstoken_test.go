package accesstoken

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"math/big"
	"strings"
	"testing"
	"time"

	"software.sslmate.com/src/go-pkcs12"
)

func TestParsePKCS12(t *testing.T) {
	key, certificate := newCertificate(t)
	sum := sha1.Sum(certificate.Raw)
	wantKeyID := strings.ToUpper(hex.EncodeToString(sum[:]))

	// Key Vault and .NET export with modern encryption, older tools with RC2 or 3DES.
	encoders := map[string]*pkcs12.Encoder{
		"modern":      pkcs12.Modern2023,
		"legacy RC2":  pkcs12.LegacyRC2,
		"legacy DES":  pkcs12.LegacyDES,
		"no password": pkcs12.Passwordless,
	}
	for name, encoder := range encoders {
		t.Run(name, func(t *testing.T) {
			pfx, err := encoder.Encode(key, certificate, nil, "")
			if err != nil {
				t.Fatalf("encode: %v", err)
			}
			credentials, err := ParsePKCS12(pfx)
			if err != nil {
				t.Fatalf("ParsePKCS12: %v", err)
			}
			if credentials.KeyID() != wantKeyID {
				t.Errorf("KeyID() = %q, want %q", credentials.KeyID(), wantKeyID)
			}
			if !credentials.NotAfter().Equal(certificate.NotAfter) {
				t.Errorf("NotAfter() = %v, want %v", credentials.NotAfter(), certificate.NotAfter)
			}
		})
	}
}

func TestParsePKCS12RejectsGarbage(t *testing.T) {
	if _, err := ParsePKCS12([]byte("not a PKCS #12 file")); err == nil {
		t.Fatal("ParsePKCS12 accepted garbage")
	}
}

func TestNewCredentialsRejectsMismatchedKey(t *testing.T) {
	_, certificate := newCertificate(t)
	otherKey, _ := newCertificate(t)
	if _, err := newCredentials(otherKey, certificate); err == nil {
		t.Fatal("newCredentials accepted a key that does not match the certificate")
	}
}

func TestTokenWithoutCredentials(t *testing.T) {
	issuer := NewIssuer("ttd")
	if issuer.Ready() {
		t.Error("Ready() = true without credentials")
	}
	if _, err := issuer.Token(); !errors.Is(err, ErrNoCredentials) {
		t.Errorf("Token() error = %v, want ErrNoCredentials", err)
	}
}

func TestToken(t *testing.T) {
	key, certificate := newCertificate(t)
	credentials := mustCredentials(t, key, certificate)
	now := time.Unix(1_800_000_000, 0)
	issuer := NewIssuer("ttd")
	issuer.now = func() time.Time { return now }
	issuer.SetCredentials(credentials)

	token, err := issuer.Token()
	if err != nil {
		t.Fatalf("Token(): %v", err)
	}
	gotHeader, gotClaims := verify(t, token, &key.PublicKey)

	sum := sha1.Sum(certificate.Raw)
	wantHeader := header{
		Algorithm:  "RS256",
		KeyID:      credentials.KeyID(),
		Type:       "JWT",
		Thumbprint: base64.RawURLEncoding.EncodeToString(sum[:]),
	}
	if gotHeader != wantHeader {
		t.Errorf("header = %+v, want %+v", gotHeader, wantHeader)
	}
	wantClaims := claims{
		Issuer:    "ttd",
		Audience:  "platform.altinn.no",
		NotBefore: now.Unix() - 5,
		Expires:   now.Unix() + 300,
		IssuedAt:  now.Unix(),
	}
	if gotClaims != wantClaims {
		t.Errorf("claims = %+v, want %+v", gotClaims, wantClaims)
	}
}

func TestTokenIsReusedUntilRenewal(t *testing.T) {
	key, certificate := newCertificate(t)
	now := time.Unix(1_800_000_000, 0)
	issuer := NewIssuer("ttd")
	issuer.now = func() time.Time { return now }
	issuer.SetCredentials(mustCredentials(t, key, certificate))

	first := mustToken(t, issuer)
	now = now.Add(renewAfter - time.Second)
	if mustToken(t, issuer) != first {
		t.Error("the token was renewed before renewAfter")
	}
	now = now.Add(time.Second)
	if mustToken(t, issuer) == first {
		t.Error("the token was not renewed after renewAfter")
	}
}

func TestSetCredentials(t *testing.T) {
	key, certificate := newCertificate(t)
	otherKey, otherCertificate := newCertificate(t)
	issuer := NewIssuer("ttd")
	issuer.SetCredentials(mustCredentials(t, key, certificate))
	first := mustToken(t, issuer)

	// The same certificate read again keeps the token.
	issuer.SetCredentials(mustCredentials(t, key, certificate))
	if mustToken(t, issuer) != first {
		t.Error("reloading the same certificate replaced the token")
	}

	// A new certificate signs from then on.
	issuer.SetCredentials(mustCredentials(t, otherKey, otherCertificate))
	verify(t, mustToken(t, issuer), &otherKey.PublicKey)
}

func TestSetCredentialsWaitsForAReplacementToBeValid(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	issuer := NewIssuer("ttd")
	issuer.now = func() time.Time { return now }
	currentKey, current := newCertificateValid(t, now.Add(-time.Hour), now.Add(time.Hour))
	nextKey, next := newCertificateValid(t, now.Add(10*time.Minute), now.Add(24*time.Hour))
	if !issuer.SetCredentials(mustCredentials(t, currentKey, current)) {
		t.Fatal("the first credentials were not used")
	}

	if issuer.SetCredentials(mustCredentials(t, nextKey, next)) {
		t.Error("credentials that are not valid yet replaced valid ones")
	}
	verify(t, mustToken(t, issuer), &currentKey.PublicKey)

	now = now.Add(10 * time.Minute)
	if !issuer.SetCredentials(mustCredentials(t, nextKey, next)) {
		t.Error("credentials that have become valid were not used")
	}
	verify(t, mustToken(t, issuer), &nextKey.PublicKey)
}

func TestSetCredentialsReplacesExpired(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	issuer := NewIssuer("ttd")
	issuer.now = func() time.Time { return now }
	expiredKey, expired := newCertificateValid(t, now.Add(-2*time.Hour), now.Add(-time.Hour))
	nextKey, next := newCertificateValid(t, now.Add(10*time.Minute), now.Add(24*time.Hour))
	issuer.SetCredentials(mustCredentials(t, expiredKey, expired))

	// Expired credentials still sign: the platform rejects the token either way, and the proxy stays ready
	// for requests that carry the app's own.
	if !issuer.Ready() {
		t.Error("the issuer is not ready with expired credentials")
	}
	if notAfter, ok := issuer.NotAfter(); !ok || !notAfter.Equal(expired.NotAfter) {
		t.Errorf("NotAfter() = %v, %v, want %v", notAfter, ok, expired.NotAfter)
	}

	if !issuer.SetCredentials(mustCredentials(t, nextKey, next)) {
		t.Error("credentials that are not valid yet did not replace expired ones")
	}
}

func newCertificate(t *testing.T) (*rsa.PrivateKey, *x509.Certificate) {
	t.Helper()
	return newCertificateValid(t, time.Now().Add(-time.Hour), time.Now().Add(time.Hour))
}

func newCertificateValid(t *testing.T, notBefore, notAfter time.Time) (*rsa.PrivateKey, *x509.Certificate) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	template := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "ttd"},
		NotBefore:    notBefore.Truncate(time.Second),
		NotAfter:     notAfter.Truncate(time.Second),
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		t.Fatalf("create certificate: %v", err)
	}
	certificate, err := x509.ParseCertificate(der)
	if err != nil {
		t.Fatalf("parse certificate: %v", err)
	}
	return key, certificate
}

func mustCredentials(t *testing.T, key *rsa.PrivateKey, certificate *x509.Certificate) *Credentials {
	t.Helper()
	credentials, err := newCredentials(key, certificate)
	if err != nil {
		t.Fatalf("newCredentials: %v", err)
	}
	return credentials
}

func mustToken(t *testing.T, issuer *Issuer) string {
	t.Helper()
	token, err := issuer.Token()
	if err != nil {
		t.Fatalf("Token(): %v", err)
	}
	return token
}

// verify checks token's signature with publicKey and returns its header and claims.
func verify(t *testing.T, token string, publicKey *rsa.PublicKey) (header, claims) {
	t.Helper()
	segments := strings.Split(token, ".")
	if len(segments) != 3 {
		t.Fatalf("token has %d segments, want 3", len(segments))
	}
	signature, err := base64.RawURLEncoding.DecodeString(segments[2])
	if err != nil {
		t.Fatalf("decode signature: %v", err)
	}
	digest := sha256.Sum256([]byte(segments[0] + "." + segments[1]))
	if err := rsa.VerifyPKCS1v15(publicKey, crypto.SHA256, digest[:], signature); err != nil {
		t.Fatalf("verify signature: %v", err)
	}
	var gotHeader header
	decodeSegment(t, segments[0], &gotHeader)
	var gotClaims claims
	decodeSegment(t, segments[1], &gotClaims)
	return gotHeader, gotClaims
}

func decodeSegment(t *testing.T, segment string, value any) {
	t.Helper()
	data, err := base64.RawURLEncoding.DecodeString(segment)
	if err != nil {
		t.Fatalf("decode segment: %v", err)
	}
	decoder := json.NewDecoder(strings.NewReader(string(data)))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(value); err != nil {
		t.Fatalf("unmarshal segment %s: %v", data, err)
	}
}
