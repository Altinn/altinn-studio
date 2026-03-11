package crypto

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/go-jose/go-jose/v4"
	"github.com/jonboulle/clockwork"
)

type Jwks struct {
	Keys []*Jwk `json:"keys"`
}

type Jwk struct {
	exp   *int64
	inner jose.JSONWebKey
}

func NewJwks(keys ...*Jwk) *Jwks {
	return &Jwks{Keys: keys}
}

func NewJwk(certificates []*x509.Certificate, key *rsa.PrivateKey, keyId string, use string, algorithm string) *Jwk {
	jwk := &Jwk{
		inner: jose.JSONWebKey{
			Certificates: certificates,
			Key:          key,
			KeyID:        keyId,
			Use:          use,
			Algorithm:    algorithm,
		},
	}

	if len(certificates) > 0 {
		expUnix := certificates[0].NotAfter.Unix()
		jwk.exp = &expUnix
	}

	return jwk
}

func (j *Jwk) MarshalJSON() ([]byte, error) {
	data, err := j.inner.MarshalJSON()
	if err != nil {
		return nil, fmt.Errorf("marshal inner JWK: %w", err)
	}

	if j.exp == nil {
		return data, nil
	}

	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, fmt.Errorf("unmarshal JWK JSON: %w", err)
	}

	m["exp"] = *j.exp
	result, marshalErr := json.Marshal(m)
	if marshalErr != nil {
		return nil, fmt.Errorf("marshal JWK wrapper: %w", marshalErr)
	}
	return result, nil
}

// jwkWithExp is used for unmarshaling JSON that may include Maskinporten's 'exp' field.
//
//nolint:govet // fieldalignment savings are negligible compared to keeping the JSON wrapper readable.
type jwkWithExp struct {
	jose.JSONWebKey

	Exp *int64 `json:"exp,omitempty"`
}

func (j *Jwk) UnmarshalJSON(b []byte) error {
	var wrapper jwkWithExp
	if err := json.Unmarshal(b, &wrapper); err != nil {
		return fmt.Errorf("unmarshal JWK: %w", err)
	}

	j.inner = wrapper.JSONWebKey

	// `exp` was initially not added to JWK's, so this makes it backward compatible
	// with any clients that were created before we started adding it
	if wrapper.Exp == nil && len(wrapper.Certificates) > 0 {
		expUnix := wrapper.Certificates[0].NotAfter.Unix()
		j.exp = &expUnix
	} else {
		j.exp = wrapper.Exp
	}

	return nil
}

var _ json.Marshaler = (*Jwk)(nil)
var _ json.Unmarshaler = (*Jwk)(nil)

func (j *Jwk) KeyID() string {
	return j.inner.KeyID
}

func (j *Jwk) Algorithm() string {
	return j.inner.Algorithm
}

func (j *Jwk) IsPublic() bool {
	return j.inner.IsPublic()
}

func (j *Jwk) Public() *Jwk {
	if j.IsPublic() {
		return j
	}

	publicJwk := j.inner.Public()
	// We set certificates to nil here because Maskinporten doesn't want the 'x5c' field
	// which is marshalled from the Certificates field on the struct.
	publicJwk.Certificates = nil

	return &Jwk{
		inner: publicJwk,
		exp:   j.exp,
	}
}

func (j *Jwk) Certificates() []*x509.Certificate {
	if j == nil {
		return nil
	}

	return j.inner.Certificates
}

func (j *Jwk) NewJWT(
	audience []string,
	issuer string,
	scope string,
	expiry time.Time,
	clock clockwork.Clock,
) (string, error) {
	return NewJWT(j, audience, issuer, scope, expiry, clock)
}

var (
	errJwksNotInitialized = errors.New("can't create public keyset from JWKS when it is not initialized")
	errPublicKeysExpected = errors.New("keys in client info must be based on private/public key pairs")
)

func (j *Jwks) ToPublic() (*Jwks, error) {
	if j == nil {
		return nil, errJwksNotInitialized
	}

	result := &Jwks{}
	result.Keys = make([]*Jwk, 0, len(j.Keys))
	for _, jwk := range j.Keys {
		if jwk.IsPublic() {
			return nil, errPublicKeysExpected
		}
		publicJwk := jwk.Public()
		result.Keys = append(result.Keys, publicJwk)
	}

	return result, nil
}
