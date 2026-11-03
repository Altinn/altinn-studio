// Package auth authenticates the callers of the run API and the engine on the callback API.
//
// Each sends a projected ServiceAccount token whose audience is the operator. A Reviewer checks it, so the operator
// holds no keys and no secret of its own, and the operator maps the user name of the token to a caller in its
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
	// cacheTTL bounds how long a revoked token keeps working. Callers send each request with a token, and a review
	// for each would double the load on the API server.
	cacheTTL = time.Minute
	// cacheSize bounds the memory that tokens can take. There are a few callers, each with a token that changes
	// about once an hour.
	cacheSize = 1024
)

var (
	ErrUnauthenticated = errors.New("the token is missing or not valid for the core operator")
	ErrForbidden       = errors.New("the identity of the token may not use this API")
	errReview          = errors.New("review the token")
)

// Reviewer checks a token with whoever issued it.
type Reviewer interface {
	Review(ctx context.Context, token string, audiences []string) (TokenStatus, error)
}

// TokenStatus is a reviewer's answer about a token.
type TokenStatus struct {
	Username string
	// Audiences are the audiences of the request that the token is valid for.
	Audiences     []string
	Authenticated bool
}

// Principal is who sent a request: the engine, or a caller by its id.
type Principal struct {
	Caller string
	Engine bool
}

// Identities maps reviewed user names to principals.
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

// Authenticate returns the principal of a bearer token. It returns ErrUnauthenticated for a token the API server does
// not accept for the audience, and ErrForbidden for a valid token of an unknown identity.
func (a *Authenticator) Authenticate(ctx context.Context, token string) (Principal, error) {
	if token == "" {
		return Principal{}, ErrUnauthenticated
	}
	username, err := a.username(ctx, token)
	if err != nil {
		return Principal{}, err
	}
	if username == a.identities.Engine {
		return Principal{Engine: true}, nil
	}
	if caller, ok := a.identities.Callers(username); ok {
		return Principal{Caller: caller}, nil
	}
	return Principal{}, fmt.Errorf("%w: %s", ErrForbidden, username)
}

func (a *Authenticator) username(ctx context.Context, token string) (string, error) {
	// The cache keys on a hash, so the process keeps no token that someone could read from a heap dump.
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
	// With spec.audiences set, the API server returns the audiences the token is valid for. A token for the API
	// server itself is authenticated without them.
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

// expiry reads the exp claim of a JWT, so a cached review ends with the token. The API server has checked the
// signature, so the claim can be trusted here. A token that is no JWT gets the cache time.
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
	// Every entry is fresh, which takes more callers than exist. Dropping one at random costs one more review.
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

// RequireCaller lets through requests from callers in the configuration, and puts the caller id in the context.
func (a *Authenticator) RequireCaller(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal, ok := a.authenticate(w, r)
		if !ok {
			return
		}
		if principal.Engine {
			problem.Write(w, r, http.StatusForbidden, "The engine may use only the callback API.")
			return
		}
		next.ServeHTTP(w, r.WithContext(WithCaller(r.Context(), principal.Caller)))
	})
}

// RequireEngine lets through requests from the engine only.
func (a *Authenticator) RequireEngine(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal, ok := a.authenticate(w, r)
		if !ok {
			return
		}
		if !principal.Engine {
			problem.Write(w, r, http.StatusForbidden, "Only the engine may use the callback API.")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *Authenticator) authenticate(w http.ResponseWriter, r *http.Request) (Principal, bool) {
	token, found := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	if !found {
		token = ""
	}
	principal, err := a.Authenticate(r.Context(), strings.TrimSpace(token))
	switch {
	case err == nil:
		return principal, true
	case errors.Is(err, ErrUnauthenticated):
		w.Header().Set("WWW-Authenticate", `Bearer realm="core-operator"`)
		problem.Write(w, r, http.StatusUnauthorized, "Send a ServiceAccount token with the audience core-operator.")
	case errors.Is(err, ErrForbidden):
		problem.Write(w, r, http.StatusForbidden, "The ServiceAccount is not a caller of the core operator.")
	default:
		logging.FromContext(r.Context()).Error(err, "Token review failed")
		problem.Write(w, r, http.StatusServiceUnavailable, "The operator could not check the token.")
	}
	return Principal{}, false
}
