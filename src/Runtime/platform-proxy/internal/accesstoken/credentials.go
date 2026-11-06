// Package accesstoken issues platform access tokens, the JWTs that the Altinn Platform's APIs read from the
// PlatformAccessToken header to tell which service owner's runtime cluster a request comes from.
//
// Apps issue the same tokens with Altinn.Common.AccessTokenClient, signed with the certificate the runtime
// cluster keeps in the accesstoken Secret. The platform validates them with Altinn.Common.AccessToken, using
// the public certificate it keeps for each issuer, so a token issued here must look like one an app issues.
package accesstoken

import (
	"crypto/rsa"
	"crypto/sha1" //nolint:gosec // The x5t header and .NET's key ID are SHA-1 thumbprints by definition.
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"software.sslmate.com/src/go-pkcs12"
)

var (
	errNotRSA      = errors.New("the certificate's private key is not an RSA key")
	errKeyMismatch = errors.New("the certificate does not belong to the private key")
)

// Credentials are the private key and certificate that sign tokens.
type Credentials struct {
	notBefore time.Time
	notAfter  time.Time
	key       *rsa.PrivateKey
	// keyID is the certificate's SHA-1 thumbprint in uppercase hex, the kid .NET gives a token signed with
	// an X509SigningCredentials.
	keyID string
	// thumbprint is the same thumbprint, base64url encoded, for the x5t header.
	thumbprint string
}

// ParsePKCS12 reads credentials from a PKCS #12 file without a password, the accesstokencredentials.pfx
// that apps load.
func ParsePKCS12(pfx []byte) (*Credentials, error) {
	key, certificate, _, err := pkcs12.DecodeChain(pfx, "")
	if err != nil {
		return nil, fmt.Errorf("decode PKCS #12: %w", err)
	}
	rsaKey, ok := key.(*rsa.PrivateKey)
	if !ok {
		return nil, errNotRSA
	}
	return newCredentials(rsaKey, certificate)
}

func newCredentials(key *rsa.PrivateKey, certificate *x509.Certificate) (*Credentials, error) {
	publicKey, ok := certificate.PublicKey.(*rsa.PublicKey)
	if !ok || !publicKey.Equal(&key.PublicKey) {
		return nil, errKeyMismatch
	}
	sum := sha1.Sum(certificate.Raw) //nolint:gosec // A thumbprint, see the import.
	return &Credentials{
		key:        key,
		keyID:      strings.ToUpper(hex.EncodeToString(sum[:])),
		thumbprint: base64.RawURLEncoding.EncodeToString(sum[:]),
		notBefore:  certificate.NotBefore,
		notAfter:   certificate.NotAfter,
	}, nil
}

// KeyID identifies the certificate, as the kid of the tokens it signs. It is public, and safe to log.
func (c *Credentials) KeyID() string {
	return c.keyID
}

// NotBefore is when the certificate becomes valid.
func (c *Credentials) NotBefore() time.Time {
	return c.notBefore
}

// NotAfter is when the certificate expires.
func (c *Credentials) NotAfter() time.Time {
	return c.notAfter
}
