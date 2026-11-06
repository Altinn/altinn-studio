package accesstoken

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"
)

// Header is the request header the platform's APIs read the token from.
const Header = "PlatformAccessToken"

const (
	// audience is the audience Altinn.Common.AccessTokenClient sets. The platform does not check it.
	audience = "platform.altinn.no"
	// lifetime and notBeforeAdjustment are Altinn.Common.AccessTokenClient's defaults.
	lifetime            = 5 * time.Minute
	notBeforeAdjustment = -5 * time.Second
	// renewAfter is when a token is replaced, well before it expires, so that one that is sent just
	// before then still has minutes left when the platform validates it.
	renewAfter = lifetime / 2
)

// ErrNoCredentials means the issuer has no credentials to sign with yet.
var ErrNoCredentials = errors.New("no credentials to sign platform access tokens with")

// Issuer issues tokens for one service owner and reuses each until it is due for renewal.
type Issuer struct {
	renewAt     time.Time
	now         func() time.Time
	credentials *Credentials
	issuer      string
	token       string
	mu          sync.Mutex
}

// NewIssuer returns an issuer of tokens for the service owner serviceOwner, such as ttd. It has no
// credentials until SetCredentials is called.
func NewIssuer(serviceOwner string) *Issuer {
	return &Issuer{issuer: serviceOwner, now: time.Now}
}

// SetCredentials makes the issuer sign with credentials from now on.
func (i *Issuer) SetCredentials(credentials *Credentials) {
	i.mu.Lock()
	defer i.mu.Unlock()
	if i.credentials != nil && i.credentials.keyID == credentials.keyID {
		return
	}
	i.credentials = credentials
	i.token = ""
}

// Ready reports whether the issuer has credentials.
func (i *Issuer) Ready() bool {
	i.mu.Lock()
	defer i.mu.Unlock()
	return i.credentials != nil
}

// Token returns a valid token.
func (i *Issuer) Token() (string, error) {
	i.mu.Lock()
	defer i.mu.Unlock()
	if i.credentials == nil {
		return "", ErrNoCredentials
	}
	now := i.now()
	if i.token != "" && now.Before(i.renewAt) {
		return i.token, nil
	}
	token, err := i.sign(now)
	if err != nil {
		return "", err
	}
	i.token = token
	i.renewAt = now.Add(renewAfter)
	return token, nil
}

type header struct {
	Algorithm  string `json:"alg"`
	KeyID      string `json:"kid"`
	Type       string `json:"typ"`
	Thumbprint string `json:"x5t"`
}

// claims are those Altinn.Common.AccessTokenClient sets for a token without an app. The app claim,
// urn:altinn:app, is left out while the issuer cannot tell which app a request comes from.
type claims struct {
	Issuer    string `json:"iss"`
	Audience  string `json:"aud"`
	NotBefore int64  `json:"nbf"`
	Expires   int64  `json:"exp"`
	IssuedAt  int64  `json:"iat"`
}

func (i *Issuer) sign(now time.Time) (string, error) {
	encodedHeader, err := encodeSegment(header{
		Algorithm:  "RS256",
		KeyID:      i.credentials.keyID,
		Type:       "JWT",
		Thumbprint: i.credentials.thumbprint,
	})
	if err != nil {
		return "", err
	}
	encodedClaims, err := encodeSegment(claims{
		Issuer:    i.issuer,
		Audience:  audience,
		NotBefore: now.Add(notBeforeAdjustment).Unix(),
		Expires:   now.Add(lifetime).Unix(),
		IssuedAt:  now.Unix(),
	})
	if err != nil {
		return "", err
	}
	signingInput := encodedHeader + "." + encodedClaims
	digest := sha256.Sum256([]byte(signingInput))
	signature, err := rsa.SignPKCS1v15(rand.Reader, i.credentials.key, crypto.SHA256, digest[:])
	if err != nil {
		return "", fmt.Errorf("sign platform access token: %w", err)
	}
	return signingInput + "." + base64.RawURLEncoding.EncodeToString(signature), nil
}

func encodeSegment(value any) (string, error) {
	segment, err := json.Marshal(value)
	if err != nil {
		return "", fmt.Errorf("encode platform access token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(segment), nil
}
