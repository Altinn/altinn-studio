package proxy

import (
	"bufio"
	"bytes"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
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
	"go.opentelemetry.io/otel/sdk/trace/tracetest"

	"altinn.studio/platform-proxy/internal/accesstoken"
)

// spans records the spans the proxy ends. A recording provider also gives the proxy a trace context to pass on.
var spans = tracetest.NewSpanRecorder()

func TestMain(m *testing.M) {
	otel.SetTracerProvider(sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(spans)))
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

func TestTokenHeaderValues(t *testing.T) {
	tests := map[string]struct {
		sent      []string
		want      []string
		wantIssue bool
	}{
		"none":                {sent: nil, want: []string{"signed-token"}, wantIssue: true},
		"empty":               {sent: []string{""}, want: []string{"signed-token"}, wantIssue: true},
		"the app's":           {sent: []string{"apps-token"}, want: []string{"apps-token"}},
		"empty and the app's": {sent: []string{"", "apps-token"}, want: []string{"", "apps-token"}},
		"two of the app's":    {sent: []string{"a", "b"}, want: []string{"a", "b"}},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			up := newUpstream(t)
			issuer := &fakeIssuer{token: "signed-token"}
			p := newProxy(t, up.URL, issuer)
			r := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/storage/api/v1/applications", nil)
			for _, value := range tt.sent {
				r.Header.Add(accesstoken.Header, value)
			}

			p.ServeHTTP(httptest.NewRecorder(), r)

			got := up.request.Header.Values(accesstoken.Header)
			if strings.Join(got, "|") != strings.Join(tt.want, "|") || len(got) != len(tt.want) {
				t.Errorf("upstream got %q, want %q", got, tt.want)
			}
			if (issuer.calls > 0) != tt.wantIssue {
				t.Errorf("issued %d tokens, want an issued token: %v", issuer.calls, tt.wantIssue)
			}
			if values := r.Header.Values(accesstoken.Header); len(values) != len(tt.sent) {
				t.Errorf("the app's request was changed to %q", values)
			}
		})
	}
}

func TestRejectsTokenAsHopByHopHeader(t *testing.T) {
	up := newUpstream(t)
	p := newProxy(t, up.URL, &fakeIssuer{token: "signed-token"})
	r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/storage/api/v1/instances", nil)
	r.Header.Set("Connection", "keep-alive, platformaccesstoken")
	r.Header.Set(accesstoken.Header, "apps-token")
	w := httptest.NewRecorder()

	p.ServeHTTP(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
	assertProblem(t, w, http.StatusBadRequest)
	if up.request != nil {
		t.Error("the request was forwarded")
	}
}

// A transport error can quote the response, so the proxy must not log or record its message.
func TestErrorsKeepResponseContentOutOfTelemetry(t *testing.T) {
	const secret = "01017012345-secret-token"
	address := serveRaw(t, "HTTP/1.1 200 OK\r\nContent-Length: 0\r\n"+secret+" is not a header\r\n\r\n")

	// The transport's error does quote it, so the test would catch a leak.
	resp, err := http.Get("http://" + address) //nolint:noctx // A plain client, to see the transport's error.
	if err == nil {
		if closeErr := resp.Body.Close(); closeErr != nil {
			t.Errorf("close response: %v", closeErr)
		}
		t.Fatal("the malformed response was accepted")
	}
	if !strings.Contains(err.Error(), secret) {
		t.Fatalf("the transport's error no longer quotes the response, so this test checks nothing: %v", err)
	}

	var logs bytes.Buffer
	target, err := url.Parse("http://" + address)
	if err != nil {
		t.Fatalf("parse address: %v", err)
	}
	p, err := New(slog.New(slog.NewTextHandler(&logs, nil)), target, &fakeIssuer{token: "signed-token"})
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	w := httptest.NewRecorder()
	p.ServeHTTP(w, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/register/api/v1/x", nil))

	if w.Code != http.StatusBadGateway {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadGateway)
	}
	if strings.Contains(logs.String(), secret) || strings.Contains(w.Body.String(), secret) {
		t.Errorf("the response's content reached the logs or the app:\n%s\n%s", logs.String(), w.Body.String())
	}
	for _, span := range spans.Ended() {
		if strings.Contains(span.Status().Description, secret) ||
			strings.Contains(fmt.Sprint(span.Attributes()), secret) {
			t.Errorf("the response's content reached span %q", span.Name())
		}
	}
}

func TestClassify(t *testing.T) {
	tests := map[string]struct {
		err        error
		wantType   string
		wantStatus int
	}{
		"timeout": {
			err:        &net.OpError{Op: "read", Err: timeoutError{}},
			wantType:   errorUpstreamTimeout,
			wantStatus: http.StatusGatewayTimeout,
		},
		"dial": {
			err:        &net.OpError{Op: "dial", Err: errRefused},
			wantType:   errorUpstreamUnreachable,
			wantStatus: http.StatusBadGateway,
		},
		"certificate": {
			err:        fmt.Errorf("tls: %w", &tls.CertificateVerificationError{Err: x509.UnknownAuthorityError{}}),
			wantType:   errorUpstreamCertificate,
			wantStatus: http.StatusBadGateway,
		},
		"other": {err: errMalformed, wantType: errorUpstreamFailed, wantStatus: http.StatusBadGateway},
	}
	for name, tt := range tests {
		status, errorType := classify(tt.err)
		if status != tt.wantStatus || errorType != tt.wantType {
			t.Errorf("%s: classify = %d %q, want %d %q", name, status, errorType, tt.wantStatus, tt.wantType)
		}
	}
}

var (
	errRefused   = errors.New("connection refused")
	errMalformed = errors.New("malformed HTTP response")
)

type timeoutError struct{}

func (timeoutError) Error() string   { return "timeout" }
func (timeoutError) Timeout() bool   { return true }
func (timeoutError) Temporary() bool { return true }

// serveRaw answers every connection with response after reading the request's headers, and returns its address.
func serveRaw(t *testing.T, response string) string {
	t.Helper()
	listener, err := (&net.ListenConfig{}).Listen(t.Context(), "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	t.Cleanup(func() {
		if err := listener.Close(); err != nil {
			t.Errorf("close listener: %v", err)
		}
	})
	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			go func() {
				defer func() {
					if err := conn.Close(); err != nil {
						t.Logf("close connection: %v", err)
					}
				}()
				reader := bufio.NewReader(conn)
				for {
					line, err := reader.ReadString('\n')
					if err != nil || line == "\r\n" {
						break
					}
				}
				if _, err := io.WriteString(conn, response); err != nil {
					t.Logf("write response: %v", err)
				}
			}()
		}
	}()
	return listener.Addr().String()
}
