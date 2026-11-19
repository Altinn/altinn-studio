// Package auth authenticates the callers of the run API and the engine on the callback API.
//
// Each sends a projected ServiceAccount token with the operator as audience. A Reviewer checks the token, so the
// operator holds no keys and no secrets of its own. The operator maps the user name of the token to a caller in its
// configuration. internal/kube reviews tokens with the Kubernetes API.
package auth

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"

	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/logging"
	"altinn.studio/core-operator/internal/problem"
)

const (
	// cacheTTL limits how long a revoked token continues to work. Callers send a token with each request. A review for
	// each request doubles the load on the API server.
	cacheTTL = time.Minute
	// cacheSize limits the memory for tokens. There are few callers, and the token of each caller changes about once an
	// hour.
	cacheSize = 1024
)

var (
	ErrUnauthenticated = errors.New("the token is missing or not valid for the core operator")
	ErrForbidden       = errors.New("the identity of the token may not use this API")
	errReview          = errors.New("review the token")
)

// Reviewer checks a token with its issuer.
type Reviewer interface {
	Review(ctx context.Context, token string, audiences []string) (TokenStatus, error)
}

type TokenStatus struct {
	Username string
	// Audiences are the audiences of the request that the token is valid for.
	Audiences     []string
	Authenticated bool
}

// Identities maps reviewed user names to callers and the engine.
type Identities struct {
	// Callers returns the caller id of a user name.
	Callers func(username string) (string, bool)
	// Engine is the user name of the engine's ServiceAccount.
	Engine string
}

type cacheEntry struct {
	expires  time.Time
	username string
}

type Authenticator struct {
	reviewer   Reviewer
	clock      clock.Clock
	cache      map[[sha256.Size]byte]cacheEntry
	identities Identities
	audience   string
	mu         sync.Mutex
}

func NewAuthenticator(reviewer Reviewer, clk clock.Clock, audience string, identities Identities) *Authenticator {
	return &Authenticator{
		reviewer:   reviewer,
		clock:      clk,
		audience:   audience,
		identities: identities,
		cache:      make(map[[sha256.Size]byte]cacheEntry),
	}
}

// Caller returns the caller id of a bearer token. It returns ErrUnauthenticated for a token the API server does not
// accept for the audience, and ErrForbidden for a valid token of another identity, such as the engine.
func (a *Authenticator) Caller(ctx context.Context, token string) (string, error) {
	username, err := a.username(ctx, token)
	if err != nil {
		return "", err
	}
	if caller, ok := a.identities.Callers(username); ok {
		return caller, nil
	}
	return "", fmt.Errorf("%w: %s", ErrForbidden, username)
}

// Engine checks that a bearer token is the engine's, with the errors of Caller.
func (a *Authenticator) Engine(ctx context.Context, token string) error {
	username, err := a.username(ctx, token)
	if err == nil && username != a.identities.Engine {
		err = fmt.Errorf("%w: %s", ErrForbidden, username)
	}
	return err
}

func (a *Authenticator) username(ctx context.Context, token string) (string, error) {
	if token == "" {
		return "", ErrUnauthenticated
	}
	// The cache uses a hash as key, so the process keeps no token that someone can read from a heap dump.
	key := sha256.Sum256([]byte(token))
	now := a.clock.Now()

	a.mu.Lock()
	entry, ok := a.cache[key]
	a.mu.Unlock()
	if ok && now.Before(entry.expires) {
		return entry.username, nil
	}

	status, err := a.reviewer.Review(ctx, token, []string{a.audience})
	if err != nil {
		return "", fmt.Errorf("%w: %w", errReview, err)
	}
	// If spec.audiences is set, the API server returns the audiences that the token is valid for. The API server
	// authenticates a token for the API server itself, but without these audiences.
	if !status.Authenticated || !slices.Contains(status.Audiences, a.audience) {
		return "", ErrUnauthenticated
	}

	a.mu.Lock()
	defer a.mu.Unlock()
	if len(a.cache) >= cacheSize {
		a.evictLocked(now)
	}
	expires := now.Add(cacheTTL)
	if tokenExpires, ok := expiry(token); ok && tokenExpires.Before(expires) {
		expires = tokenExpires
	}
	a.cache[key] = cacheEntry{username: status.Username, expires: expires}
	return status.Username, nil
}

// expiry reads the exp claim of a JWT, so that a cached review ends with the token. The API server checked the
// signature before, so this claim is safe to use. A token that is not a JWT gets the cache time.
func expiry(token string) (time.Time, bool) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return time.Time{}, false
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return time.Time{}, false
	}
	var claims struct {
		Expires int64 `json:"exp"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil || claims.Expires == 0 {
		return time.Time{}, false
	}
	return time.Unix(claims.Expires, 0), true
}

func (a *Authenticator) evictLocked(now time.Time) {
	for key, entry := range a.cache {
		if !now.Before(entry.expires) {
			delete(a.cache, key)
		}
	}
	// All entries are fresh, which needs more callers than exist. The authenticator drops a random entry, which costs
	// one more review.
	for key := range a.cache {
		if len(a.cache) < cacheSize {
			break
		}
		delete(a.cache, key)
	}
}

type callerKey struct{}

// CallerFrom returns the caller id that RequireCaller put in the context.
func CallerFrom(ctx context.Context) string {
	caller, ok := ctx.Value(callerKey{}).(string)
	if !ok {
		return ""
	}
	return caller
}

// WithCaller returns a context for a caller, as RequireCaller makes it. Tests use it to skip authentication.
func WithCaller(ctx context.Context, caller string) context.Context {
	return context.WithValue(ctx, callerKey{}, caller)
}

// RequireCaller accepts only requests from callers in the configuration, and it puts the caller id in the context.
func (a *Authenticator) RequireCaller(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		caller, err := a.Caller(r.Context(), bearerToken(r))
		if !a.accepted(w, r, err, "The ServiceAccount is not a caller of the core operator.") {
			return
		}
		next.ServeHTTP(w, r.WithContext(WithCaller(r.Context(), caller)))
	})
}

// RequireEngine accepts only requests from the engine.
func (a *Authenticator) RequireEngine(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if a.accepted(w, r, a.Engine(r.Context(), bearerToken(r)), "Only the engine may use the callback API.") {
			next.ServeHTTP(w, r)
		}
	})
}

// accepted answers a request whose token err refuses, and reports whether the token passed. forbidden tells a valid
// token of another identity who may use the API.
func (a *Authenticator) accepted(w http.ResponseWriter, r *http.Request, err error, forbidden string) bool {
	switch {
	case err == nil:
		return true
	case errors.Is(err, ErrUnauthenticated):
		w.Header().Set("WWW-Authenticate", `Bearer realm="`+a.audience+`"`)
		problem.Write(w, r, http.StatusUnauthorized, "Send a ServiceAccount token with the audience "+a.audience+".")
	case errors.Is(err, ErrForbidden):
		problem.Write(w, r, http.StatusForbidden, forbidden)
	default:
		logging.FromContext(r.Context()).Error(err, "Token review failed")
		problem.Write(w, r, http.StatusServiceUnavailable, "The operator could not check the token.")
	}
	return false
}

func bearerToken(r *http.Request) string {
	token, found := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	if !found {
		return ""
	}
	return strings.TrimSpace(token)
}
