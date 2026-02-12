package crypto

import (
	"errors"
	"fmt"
	"slices"
	"time"

	"github.com/go-jose/go-jose/v4"
	"github.com/go-jose/go-jose/v4/jwt"
	"github.com/google/uuid"

	"altinn.studio/operator/internal/assert"
	opclock "altinn.studio/operator/internal/clock"
)

var (
	errUnexpectedJWTHeaderCount = errors.New("unexpected number of headers in JWT")
	errDecodeClaimsNilJWK       = errors.New("JWK cannot be nil")
	errSignPublicJWK            = errors.New("cannot sign JWT with public key")
	errUnsupportedJWTAlgorithm  = errors.New("unsupported signing algorithm")
)

var SignatureAlgorithms = []jose.SignatureAlgorithm{jose.RS256, jose.RS384, jose.RS512}

var SignatureAlgorithmsStr = []string{string(jose.RS256), string(jose.RS384), string(jose.RS512)}

type Claims struct {
	IssuedAt  time.Time `json:"iat"`
	NotBefore time.Time `json:"nbf"`
	Expiry    time.Time `json:"exp"`
	Issuer    string    `json:"iss"`
	Subject   string    `json:"sub,omitempty"`
	ID        string    `json:"jti"`
	Scope     string    `json:"scope,omitempty"`
	Audience  []string  `json:"aud"`
}

type Jwt struct {
	token jwt.JSONWebToken
}

func ParseJWT(tokenString string) (*Jwt, error) {
	token, err := jwt.ParseSigned(tokenString, SignatureAlgorithms)
	if err != nil {
		return nil, fmt.Errorf("parse signed JWT: %w", err)
	}

	if len(token.Headers) != 1 {
		return nil, errUnexpectedJWTHeaderCount
	}

	return &Jwt{token: *token}, nil
}

func (j *Jwt) DecodeClaims(jwk *Jwk) (*Claims, error) {
	if jwk == nil {
		return nil, errDecodeClaimsNilJWK
	}

	var joseClaims jwt.Claims
	if err := j.token.Claims(jwk.inner, &joseClaims); err != nil {
		return nil, fmt.Errorf("decode standard JWT claims: %w", err)
	}

	// Convert from go-jose claims to our encapsulated claims
	claims := Claims{
		Audience: joseClaims.Audience,
		Issuer:   joseClaims.Issuer,
		Subject:  joseClaims.Subject,
		ID:       joseClaims.ID,
		Scope:    "", // Will be extracted from private claims if present
	}

	if joseClaims.IssuedAt != nil {
		claims.IssuedAt = joseClaims.IssuedAt.Time()
	}
	if joseClaims.NotBefore != nil {
		claims.NotBefore = joseClaims.NotBefore.Time()
	}
	if joseClaims.Expiry != nil {
		claims.Expiry = joseClaims.Expiry.Time()
	}

	// Extract private claims (like scope)
	var privateClaims map[string]any
	if err := j.token.Claims(jwk.inner, &privateClaims); err == nil {
		if scope, ok := privateClaims["scope"].(string); ok {
			claims.Scope = scope
		}
	}
	return &claims, nil
}

func (j *Jwt) KeyID() string {
	headerCount := len(j.token.Headers)
	assert.That(headerCount == 1, "unexpected number of headers in JWT", "count", headerCount)
	return j.token.Headers[0].KeyID
}

func NewJWT(
	jwk *Jwk,
	audience []string,
	issuer string,
	scope string,
	expiry time.Time,
	clock opclock.Clock,
) (string, error) {
	if jwk.IsPublic() {
		return "", errSignPublicJWK
	}

	issuedAt := clock.Now()

	pubClaims := jwt.Claims{
		Audience:  audience,
		Issuer:    issuer,
		IssuedAt:  jwt.NewNumericDate(issuedAt),
		NotBefore: jwt.NewNumericDate(issuedAt),
		Expiry:    jwt.NewNumericDate(expiry),
		ID:        uuid.New().String(),
	}

	privClaims := struct {
		Scope string `json:"scope"`
	}{
		Scope: scope,
	}

	algo := jwk.Algorithm()
	if !slices.Contains(SignatureAlgorithmsStr, algo) {
		return "", fmt.Errorf("%w: %s", errUnsupportedJWTAlgorithm, algo)
	}

	signer, err := jose.NewSigner(
		jose.SigningKey{Algorithm: jose.SignatureAlgorithm(jwk.Algorithm()), Key: jwk.inner},
		(&jose.SignerOptions{}).WithType("JWT").WithHeader("kid", jwk.KeyID()),
	)
	if err != nil {
		return "", fmt.Errorf("create JWT signer: %w", err)
	}

	signedToken, err := jwt.Signed(signer).Claims(pubClaims).Claims(privClaims).Serialize()
	if err != nil {
		return "", fmt.Errorf("serialize signed JWT: %w", err)
	}

	return signedToken, nil
}
