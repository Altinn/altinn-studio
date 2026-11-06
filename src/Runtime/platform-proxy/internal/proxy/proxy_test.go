package proxy

import (
	"encoding/json"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"

	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"

	"altinn.studio/platform-proxy/internal/accesstoken"
)

// TestMain records spans, so the proxy has a trace context to pass on.
func TestMain(m *testing.M) {
	otel.SetTracerProvider(sdktrace.NewTracerProvider())
	os.Exit(m.Run())
}

type fakeIssuer struct {
	err   error
	token string
	calls int
}

func (f *fakeIssuer) Token() (string, error) {
	f.calls++
	return f.token, f.err
}

// upstream records the last request it got and answers with 201 and a body.
type upstream struct {
	*httptest.Server

	request *http.Request
	body    string
}

func newUpstream(t *testing.T) *upstream {
	t.Helper()
	u := &upstream{}
	u.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read request body: %v", err)
		}
		u.request, u.body = r, string(body)
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Upstream", "yes")
		w.WriteHeader(http.StatusCreated)
		if _, err := io.WriteString(w, `{"id":"1"}`); err != nil {
			t.Errorf("write response: %v", err)
		}
	}))
	t.Cleanup(u.Close)
	return u
}

func newProxy(t *testing.T, upstreamURL string, issuer TokenIssuer) *Proxy {
	t.Helper()
	target, err := url.Parse(upstreamURL)
	if err != nil {
		t.Fatalf("parse upstream URL: %v", err)
	}
	p, err := New(slog.New(slog.DiscardHandler), target, issuer)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	return p
}

func TestForwardsRequestWithToken(t *testing.T) {
	up := newUpstream(t)
	issuer := &fakeIssuer{token: "signed-token"}
	p := newProxy(t, up.URL, issuer)

	r := httptest.NewRequestWithContext(
		t.Context(),
		http.MethodPost,
		"http://platform-proxy.runtime-platform-proxy/storage/api/v1/instances?appId=ttd/app",
		strings.NewReader(`{"a":1}`),
	)
	r.Header.Set("Authorization", "Bearer user-token")
	r.Header.Set("X-Forwarded-For", "203.0.113.1")
	w := httptest.NewRecorder()
	p.ServeHTTP(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusCreated)
	}
	if w.Body.String() != `{"id":"1"}` || w.Header().Get("X-Upstream") != "yes" {
		t.Errorf("response = %q with headers %v, want the upstream's", w.Body.String(), w.Header())
	}

	got := up.request
	if got.URL.Path != "/storage/api/v1/instances" || got.URL.RawQuery != "appId=ttd/app" {
		t.Errorf("upstream got %s?%s, want the app's path and query", got.URL.Path, got.URL.RawQuery)
	}
	if got.Host != strings.TrimPrefix(up.URL, "http://") {
		t.Errorf("upstream got Host %q, want its own", got.Host)
	}
	if up.body != `{"a":1}` {
		t.Errorf("upstream got body %q", up.body)
	}
	if values := got.Header.Values(accesstoken.Header); len(values) != 1 || values[0] != "signed-token" {
		t.Errorf("upstream got %s %q, want the issued token", accesstoken.Header, values)
	}
	if got.Header.Get("Authorization") != "Bearer user-token" {
		t.Errorf("upstream got Authorization %q, want the app's", got.Header.Get("Authorization"))
	}
	if forwardedFor := got.Header.Get("X-Forwarded-For"); forwardedFor != "" {
		t.Errorf("upstream got X-Forwarded-For %q, want none", forwardedFor)
	}
	if got.Header.Get("Traceparent") == "" {
		t.Error("upstream got no trace context")
	}
}

func TestKeepsTheAppsToken(t *testing.T) {
	up := newUpstream(t)
	issuer := &fakeIssuer{token: "signed-token"}
	p := newProxy(t, up.URL, issuer)

	r := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/profile/api/v1/users/1", nil)
	r.Header.Set(accesstoken.Header, "apps-token")
	p.ServeHTTP(httptest.NewRecorder(), r)

	if values := up.request.Header.Values(accesstoken.Header); len(values) != 1 || values[0] != "apps-token" {
		t.Errorf("upstream got %s %q, want the app's token only", accesstoken.Header, values)
	}
	if issuer.calls != 0 {
		t.Errorf("the proxy issued %d tokens for a request that had one", issuer.calls)
	}
}

func TestDoesNotForwardWithoutToken(t *testing.T) {
	up := newUpstream(t)
	p := newProxy(t, up.URL, &fakeIssuer{err: accesstoken.ErrNoCredentials})

	w := httptest.NewRecorder()
	p.ServeHTTP(w, httptest.NewRequestWithContext(t.Context(), http.MethodDelete, "/storage/api/v1/instances/1/2", nil))

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("status = %d, want %d", w.Code, http.StatusServiceUnavailable)
	}
	assertProblem(t, w, http.StatusServiceUnavailable)
	if up.request != nil {
		t.Error("the request was forwarded without a token")
	}
}

func TestUnreachableUpstream(t *testing.T) {
	listener, err := (&net.ListenConfig{}).Listen(t.Context(), "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	address := listener.Addr().String()
	if err := listener.Close(); err != nil {
		t.Fatalf("close listener: %v", err)
	}
	p := newProxy(t, "http://"+address, &fakeIssuer{token: "signed-token"})

	w := httptest.NewRecorder()
	p.ServeHTTP(w, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/storage/api/v1/applications", nil))

	if w.Code != http.StatusBadGateway {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadGateway)
	}
	assertProblem(t, w, http.StatusBadGateway)
}

func TestRoute(t *testing.T) {
	tests := map[string]string{
		"/storage/api/v1/instances/50001/9f0c": "/storage/*",
		"/register/api/v1/parties/lookup":      "/register/*",
		"/eformidling/api/messages":            "/eformidling/*",
		"/storage":                             "/storage/*",
		"/":                                    "/*",
		"":                                     "/*",
		"/12345678901/storage":                 "/*",
		"/storagex/api":                        "/*",
	}
	for path, want := range tests {
		if got := Route(path); got != want {
			t.Errorf("Route(%q) = %q, want %q", path, got, want)
		}
	}
}

func TestRequestMethod(t *testing.T) {
	for method, want := range map[string]string{"GET": "GET", "PATCH": "PATCH", "PROPFIND": "_OTHER", "get": "_OTHER"} {
		if got := requestMethod(method); got != want {
			t.Errorf("requestMethod(%q) = %q, want %q", method, got, want)
		}
	}
}

func TestStatusRecorderSkipsInformational(t *testing.T) {
	recorder := &statusRecorder{ResponseWriter: httptest.NewRecorder()}
	recorder.WriteHeader(http.StatusContinue)
	recorder.WriteHeader(http.StatusNoContent)
	if recorder.status != http.StatusNoContent {
		t.Errorf("status = %d, want %d", recorder.status, http.StatusNoContent)
	}
	if err := http.NewResponseController(recorder).Flush(); err != nil {
		t.Errorf("flush through the recorder: %v", err)
	}
}

func assertProblem(t *testing.T, w *httptest.ResponseRecorder, status int) {
	t.Helper()
	if contentType := w.Header().Get("Content-Type"); contentType != "application/problem+json" {
		t.Errorf("Content-Type = %q, want application/problem+json", contentType)
	}
	var problem problemDetails
	if err := json.Unmarshal(w.Body.Bytes(), &problem); err != nil {
		t.Fatalf("decode problem details: %v", err)
	}
	if problem.Status != status {
		t.Errorf("problem status = %d, want %d", problem.Status, status)
	}
}
