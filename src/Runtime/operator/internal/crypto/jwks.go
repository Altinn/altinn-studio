package crypto

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"errors"
	"time"

	opclock "altinn.studio/operator/internal/clock"
	"github.com/go-jose/go-jose/v4"
)

type Jwks struct {
	Keys []*Jwk `json:"keys"`
}

type Jwk struct {
	inner jose.JSONWebKey
	// exp stores the Unix timestamp of certificate expiry (NotAfter)
	// Required by Maskinporten API, preserved even when certificates are removed for public key
	exp *int64
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
		return nil, err
	}

	if j.exp == nil {
		return data, nil
	}

	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, err
	}

	m["exp"] = *j.exp
	return json.Marshal(m)
}

// jwkWithExp is used for unmarshaling JSON that may include Maskinporten's 'exp' field
type jwkWithExp struct {
	jose.JSONWebKey
	Exp *int64 `json:"exp,omitempty"`
}

func (j *Jwk) UnmarshalJSON(b []byte) error {
	var wrapper jwkWithExp
	if err := json.Unmarshal(b, &wrapper); err != nil {
		return err
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
	clock opclock.Clock,
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
