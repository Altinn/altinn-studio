package crypto

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"time"

	"github.com/go-errors/errors"
	"github.com/go-jose/go-jose/v4"
	"github.com/jonboulle/clockwork"
)

type Jwks struct {
	Keys []*Jwk `json:"keys"`
}

type Jwk struct {
	inner jose.JSONWebKey
}

func NewJwks(keys ...*Jwk) *Jwks {
	return &Jwks{Keys: keys}
}

func NewJwk(certificates []*x509.Certificate, key *rsa.PrivateKey, keyId string, use string, algorithm string) *Jwk {
	return &Jwk{
		inner: jose.JSONWebKey{
			Certificates: certificates,
			Key:          key,
			KeyID:        keyId,
			Use:          use,
			Algorithm:    algorithm,
		},
	}
}

func (j *Jwk) MarshalJSON() ([]byte, error) {
	return json.Marshal(j.inner)
}

func (j *Jwk) UnmarshalJSON(b []byte) error {
	var inner jose.JSONWebKey
	if err := json.Unmarshal(b, &inner); err != nil {
		return err
	}

	j.inner = inner
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
	return &Jwk{inner: publicJwk}
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

func (j *Jwks) ToPublic() (*Jwks, error) {
	if j == nil {
		return nil, errors.New("can't create public keyset from JWKS when it is not initialized")
	}

	result := &Jwks{}
	result.Keys = make([]*Jwk, 0, len(j.Keys))
	for _, jwk := range j.Keys {
		if jwk.IsPublic() {
			return nil, errors.New("keys in client info must be based on private/public key pairs")
		}
		publicJwk := jwk.Public()
		result.Keys = append(result.Keys, publicJwk)
	}

	return result, nil
}
