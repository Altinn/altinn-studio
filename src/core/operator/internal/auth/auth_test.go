package auth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	. "github.com/onsi/gomega"
	authenticationv1 "k8s.io/api/authentication/v1"

	"altinn.studio/core-operator/internal/clock"
)

const (
	assistantSA = "system:serviceaccount:default:altinn-altinity-agents-sa"
	designerSA  = "system:serviceaccount:default:altinn-designer"
	engineSA    = "system:serviceaccount:operator-workflow-engine:operator-workflow-engine"
	audience    = "core-operator"
)

var errAPIDown = errors.New("API server down")

// fakeReviewer answers reviews from a map of tokens to user names, as the API server would for valid tokens with the
// operator's audience.
type fakeReviewer struct {
	tokens    map[string]string
	audiences map[string][]string
	err       error
	calls     int
	mu        sync.Mutex
}

func (f *fakeReviewer) Review(
	_ context.Context,
	token string,
	audiences []string,
) (authenticationv1.TokenReviewStatus, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls++
	if f.err != nil {
		return authenticationv1.TokenReviewStatus{}, f.err
	}
	username, ok := f.tokens[token]
	if !ok {
		return authenticationv1.TokenReviewStatus{Authenticated: false}, nil
	}
	tokenAudiences := audiences
	if override, ok := f.audiences[token]; ok {
		tokenAudiences = override
	}
	return authenticationv1.TokenReviewStatus{
		Authenticated: true,
		User:          authenticationv1.UserInfo{Username: username},
		Audiences:     tokenAudiences,
	}, nil
}

func (f *fakeReviewer) callCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.calls
}

func newTestAuthenticator(reviewer Reviewer, clk clock.Clock) *Authenticator {
	callers := map[string]string{assistantSA: "assistant", designerSA: "designer"}
	return NewAuthenticator(reviewer, clk, audience, Identities{
		Callers: func(username string) (string, bool) {
			id, ok := callers[username]
			return id, ok
		},
		Engine: engineSA,
	})
}

func TestAuthenticateMapsServiceAccounts(t *testing.T) {
	RegisterTestingT(t)

	reviewer := &fakeReviewer{
		tokens: map[string]string{
			"assistant-token": assistantSA,
			"designer-token":  designerSA,
			"engine-token":    engineSA,
			"other-token":     "system:serviceaccount:default:someone-else",
			"apiserver-token": assistantSA,
		},
		audiences: map[string][]string{"apiserver-token": {"https://kubernetes.default.svc"}},
	}
	authenticator := newTestAuthenticator(reviewer, clock.NewFakeClock())
	ctx := context.Background()

	principal, err := authenticator.Authenticate(ctx, "assistant-token")
	Expect(err).NotTo(HaveOccurred())
	Expect(principal).To(Equal(Principal{Caller: "assistant"}))

	principal, err = authenticator.Authenticate(ctx, "designer-token")
	Expect(err).NotTo(HaveOccurred())
	Expect(principal).To(Equal(Principal{Caller: "designer"}))

	principal, err = authenticator.Authenticate(ctx, "engine-token")
	Expect(err).NotTo(HaveOccurred())
	Expect(principal).To(Equal(Principal{Engine: true}))

	_, err = authenticator.Authenticate(ctx, "other-token")
	Expect(err).To(MatchError(ErrForbidden))

	_, err = authenticator.Authenticate(ctx, "unknown-token")
	Expect(err).To(MatchError(ErrUnauthenticated))

	_, err = authenticator.Authenticate(ctx, "apiserver-token")
	Expect(err).To(MatchError(ErrUnauthenticated), "a token for another audience")

	_, err = authenticator.Authenticate(ctx, "")
	Expect(err).To(MatchError(ErrUnauthenticated))
}

func TestAuthenticateCachesReviewsForAMinute(t *testing.T) {
	RegisterTestingT(t)

	reviewer := &fakeReviewer{tokens: map[string]string{"assistant-token": assistantSA}}
	clk := clock.NewFakeClock()
	authenticator := newTestAuthenticator(reviewer, clk)
	ctx := context.Background()

	for range 3 {
		_, err := authenticator.Authenticate(ctx, "assistant-token")
		Expect(err).NotTo(HaveOccurred())
	}
	Expect(reviewer.callCount()).To(Equal(1))

	clk.Advance(59 * time.Second)
	_, err := authenticator.Authenticate(ctx, "assistant-token")
	Expect(err).NotTo(HaveOccurred())
	Expect(reviewer.callCount()).To(Equal(1))

	clk.Advance(2 * time.Second)
	_, err = authenticator.Authenticate(ctx, "assistant-token")
	Expect(err).NotTo(HaveOccurred())
	Expect(reviewer.callCount()).To(Equal(2))

	// A refused token is reviewed every time, so a token that becomes valid works at once.
	for range 2 {
		_, err = authenticator.Authenticate(ctx, "unknown-token")
		Expect(err).To(MatchError(ErrUnauthenticated))
	}
	Expect(reviewer.callCount()).To(Equal(4))
}

func TestCacheStaysBounded(t *testing.T) {
	RegisterTestingT(t)

	tokens := make(map[string]string, cacheSize+10)
	for i := range cacheSize + 10 {
		tokens[string(rune('a'+i%26))+time.Duration(i).String()] = assistantSA
	}
	reviewer := &fakeReviewer{tokens: tokens}
	authenticator := newTestAuthenticator(reviewer, clock.NewFakeClock())
	for token := range tokens {
		_, err := authenticator.Authenticate(context.Background(), token)
		Expect(err).NotTo(HaveOccurred())
	}
	Expect(len(authenticator.cache)).To(BeNumerically("<=", cacheSize))
}

func TestMiddlewareKeepsCallersAndTheEngineApart(t *testing.T) {
	reviewer := &fakeReviewer{tokens: map[string]string{
		"assistant-token": assistantSA,
		"engine-token":    engineSA,
		"other-token":     "system:serviceaccount:default:someone-else",
	}}
	authenticator := newTestAuthenticator(reviewer, clock.NewFakeClock())

	var seenCaller string
	callerAPI := authenticator.RequireCaller(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seenCaller = CallerFrom(r.Context())
		w.WriteHeader(http.StatusNoContent)
	}))
	engineAPI := authenticator.RequireEngine(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	cases := []struct {
		handler http.Handler
		name    string
		header  string
		status  int
	}{
		{name: "caller on run API", handler: callerAPI, header: "Bearer assistant-token", status: http.StatusNoContent},
		{name: "engine on run API", handler: callerAPI, header: "Bearer engine-token", status: http.StatusForbidden},
		{name: "engine on callbacks", handler: engineAPI, header: "Bearer engine-token", status: http.StatusNoContent},
		{
			name:    "caller on callbacks",
			handler: engineAPI,
			header:  "Bearer assistant-token",
			status:  http.StatusForbidden,
		},
		{
			name:    "unknown service account",
			handler: callerAPI,
			header:  "Bearer other-token",
			status:  http.StatusForbidden,
		},
		{name: "no token", handler: callerAPI, header: "", status: http.StatusUnauthorized},
		{name: "basic auth", handler: engineAPI, header: "Basic YTpi", status: http.StatusUnauthorized},
		{name: "invalid token", handler: engineAPI, header: "Bearer nope", status: http.StatusUnauthorized},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			RegisterTestingT(t)
			req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/", nil)
			if tc.header != "" {
				req.Header.Set("Authorization", tc.header)
			}
			res := httptest.NewRecorder()
			tc.handler.ServeHTTP(res, req)
			Expect(res.Code).To(Equal(tc.status))
			if tc.status >= 400 {
				Expect(res.Header().Get("Content-Type")).To(Equal("application/problem+json"))
			}
		})
	}
	Expect(seenCaller).To(Equal("assistant"))
}

func TestMiddlewareAnswers503WhenTheReviewFails(t *testing.T) {
	RegisterTestingT(t)

	authenticator := newTestAuthenticator(&fakeReviewer{err: errAPIDown}, clock.NewFakeClock())
	req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer token")
	res := httptest.NewRecorder()
	authenticator.RequireCaller(http.NotFoundHandler()).ServeHTTP(res, req)
	Expect(res.Code).To(Equal(http.StatusServiceUnavailable))
}

// fakeJWT builds a token with an exp claim. Only the API server checks the signature, so the test needs none.
func fakeJWT(t *testing.T, expires time.Time) string {
	t.Helper()
	claims, err := json.Marshal(map[string]any{"sub": "x", "exp": expires.Unix()})
	if err != nil {
		t.Fatal(err)
	}
	return "eyJhbGciOiJSUzI1NiJ9." + base64.RawURLEncoding.EncodeToString(claims) + ".signature"
}

// A token that expires within the cache time stops working when it expires, not a minute after the review.
func TestAuthenticateCachesNoLongerThanTheTokenLives(t *testing.T) {
	RegisterTestingT(t)

	clk := clock.NewFakeClock()
	short := fakeJWT(t, clk.Now().Add(10*time.Second))
	long := fakeJWT(t, clk.Now().Add(time.Hour))
	reviewer := &fakeReviewer{tokens: map[string]string{short: assistantSA, long: assistantSA}}
	authenticator := newTestAuthenticator(reviewer, clk)

	for _, token := range []string{short, long} {
		_, err := authenticator.Authenticate(t.Context(), token)
		Expect(err).NotTo(HaveOccurred())
	}
	Expect(reviewer.callCount()).To(Equal(2))

	clk.Advance(11 * time.Second)
	delete(reviewer.tokens, short)
	_, err := authenticator.Authenticate(t.Context(), short)
	Expect(err).To(MatchError(ErrUnauthenticated))
	_, err = authenticator.Authenticate(t.Context(), long)
	Expect(err).NotTo(HaveOccurred())
	Expect(reviewer.callCount()).To(Equal(3), "the long-lived token is still cached")
}
