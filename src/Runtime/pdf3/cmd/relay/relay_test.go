package main

import (
	"io"
	"log/slog"
	"maps"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"

	"altinn.studio/pdf3/internal/auth"
	"altinn.studio/pdf3/internal/serviceowner"
	"altinn.studio/pdf3/internal/telemetry"
)

const requestBody = `{"url":"https://ttd.apps.tt02.altinn.no/ttd/app/instance/1/abc?pdf=1"}`

func newTestRelay(t *testing.T, upstream string) *relay {
	t.Helper()
	path := filepath.Join(t.TempDir(), "key")
	if err := os.WriteFile(path, []byte("relay-key\n"), 0o600); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
	logger := slog.New(slog.DiscardHandler)
	keys, err := auth.Load(logger, path)
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	return newRelay(logger, upstream, keys, "ttd")
}

func post(t *testing.T, handler http.Handler, body string, header http.Header) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/pdf", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	maps.Copy(req.Header, header)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func TestRelayForwardsRequestWithAPIKeyAndServiceOwner(t *testing.T) {
	var got struct {
		method, path, auth, serviceOwner, contentType, body string
	}
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("ReadAll() error = %v", err)
		}
		got.method, got.path, got.body = r.Method, r.URL.Path, string(body)
		got.auth, got.contentType = r.Header.Get("Authorization"), r.Header.Get("Content-Type")
		got.serviceOwner = r.Header.Get(serviceowner.Header)
		w.Header().Set("Content-Type", "application/pdf")
		if _, err := w.Write([]byte("%PDF-1.7 test")); err != nil {
			t.Errorf("Write() error = %v", err)
		}
	}))
	defer upstream.Close()

	rl := newTestRelay(t, upstream.URL+"/pdf3/pdf")
	rec := post(t, http.HandlerFunc(rl.handlePdf), requestBody, nil)

	if rec.Code != http.StatusOK || rec.Body.String() != "%PDF-1.7 test" {
		t.Fatalf("response = %d %q", rec.Code, rec.Body.String())
	}
	if rec.Header().Get("Content-Type") != "application/pdf" {
		t.Fatalf("Content-Type = %q", rec.Header().Get("Content-Type"))
	}
	if got.method != http.MethodPost || got.path != "/pdf3/pdf" || got.body != requestBody {
		t.Fatalf("upstream got %s %s %q", got.method, got.path, got.body)
	}
	if got.auth != "Bearer relay-key" || got.contentType != "application/json" {
		t.Fatalf("upstream got Authorization %q, Content-Type %q", got.auth, got.contentType)
	}
	if got.serviceOwner != "ttd" {
		t.Fatalf("upstream got %s %q, want ttd", serviceowner.Header, got.serviceOwner)
	}
}

func TestRelayPassesErrorsThroughWithoutRetrying(t *testing.T) {
	for _, status := range []int{
		http.StatusBadRequest,
		http.StatusUnauthorized,
		http.StatusTooManyRequests,
		http.StatusInternalServerError,
	} {
		t.Run(http.StatusText(status), func(t *testing.T) {
			var calls atomic.Int32
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				calls.Add(1)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(status)
				if _, err := w.Write([]byte(`{"title":"upstream"}`)); err != nil {
					t.Errorf("Write() error = %v", err)
				}
			}))
			defer upstream.Close()

			rl := newTestRelay(t, upstream.URL)
			rec := post(t, http.HandlerFunc(rl.handlePdf), requestBody, nil)

			if rec.Code != status || rec.Body.String() != `{"title":"upstream"}` {
				t.Fatalf("response = %d %q", rec.Code, rec.Body.String())
			}
			if calls.Load() != 1 {
				t.Fatalf("upstream called %d times, want 1", calls.Load())
			}
		})
	}
}

func TestRelayReturnsBadGatewayWhenUpstreamIsDown(t *testing.T) {
	// Take a free port and release it, so nothing listens on it.
	var listenConfig net.ListenConfig
	listener, err := listenConfig.Listen(t.Context(), "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Listen() error = %v", err)
	}
	addr := listener.Addr().String()
	if err := listener.Close(); err != nil {
		t.Fatalf("Close() error = %v", err)
	}

	rl := newTestRelay(t, "http://"+addr+"/pdf")
	start := time.Now()
	rec := post(t, http.HandlerFunc(rl.handlePdf), requestBody, nil)

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadGateway)
	}
	// Connection failures are retried, with a delay between attempts.
	if elapsed := time.Since(start); elapsed < (maxAttempts-1)*retryDelay {
		t.Fatalf("returned after %v, expected %d attempts", elapsed, maxAttempts)
	}
}

func TestRelayReturnsGatewayTimeoutWhenUpstreamIsSlow(t *testing.T) {
	release := make(chan struct{})
	upstream := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		select {
		case <-release:
		case <-r.Context().Done():
		}
	}))
	defer upstream.Close()
	defer close(release)

	rl := newTestRelay(t, upstream.URL)
	rl.timeout = 100 * time.Millisecond
	rec := post(t, http.HandlerFunc(rl.handlePdf), requestBody, nil)

	if rec.Code != http.StatusGatewayTimeout {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusGatewayTimeout)
	}
}

func TestRelayRejectsBadRequestsLocally(t *testing.T) {
	var calls atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {
		calls.Add(1)
	}))
	defer upstream.Close()
	rl := newTestRelay(t, upstream.URL)

	rec := post(t, http.HandlerFunc(rl.handlePdf), strings.Repeat("x", maxBodySize+1), nil)
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("oversized body: status = %d", rec.Code)
	}

	getRec := httptest.NewRecorder()
	rl.handlePdf(getRec, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/pdf", nil))
	if getRec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("GET: status = %d", getRec.Code)
	}

	if calls.Load() != 0 {
		t.Fatalf("upstream called %d times, want 0", calls.Load())
	}
}

func TestRelayPropagatesTraceContext(t *testing.T) {
	previous := otel.GetTextMapPropagator()
	otel.SetTextMapPropagator(propagation.TraceContext{})
	defer otel.SetTextMapPropagator(previous)

	var traceparent string
	upstream := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		traceparent = r.Header.Get("Traceparent")
	}))
	defer upstream.Close()

	rl := newTestRelay(t, upstream.URL)
	handler := telemetry.WrapHandler("POST /pdf", rl.handlePdf)
	const traceID = "4bf92f3577b34da6a3ce929d0e0e4736"
	post(t, handler, requestBody, http.Header{"Traceparent": {"00-" + traceID + "-b7ad6b7169203331-01"}})

	if !strings.Contains(traceparent, traceID) {
		t.Fatalf("upstream traceparent = %q, want trace %s", traceparent, traceID)
	}
}

func TestRelaySendsItsOwnServiceOwner(t *testing.T) {
	var got string
	upstream := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		got = r.Header.Get(serviceowner.Header)
	}))
	defer upstream.Close()

	rl := newTestRelay(t, upstream.URL)
	// An app can't make the shared pdf3 act for another service owner.
	post(t, http.HandlerFunc(rl.handlePdf), requestBody, http.Header{serviceowner.Header: {"ikta"}})

	if got != "ttd" {
		t.Fatalf("upstream got %s %q, want ttd", serviceowner.Header, got)
	}
}

func TestParseUpstreamURL(t *testing.T) {
	for upstream, want := range map[string]bool{
		"https://platform.tt02.altinn.no/pdf3/pdf":     true,
		"http://pdf3-proxy.pdf3.svc.cluster.local/pdf": true,
		"":                                  false,
		"/pdf3/pdf":                         false,
		"ftp://platform.tt02.altinn.no/pdf": false,
		"https://user:secret@platform.tt02.altinn.no/pdf": false,
		"https://platform.tt02.altinn.no/pdf?key=secret":  false,
		"https://platform.tt02.altinn.no/pdf?":            false,
		"https://platform.tt02.altinn.no/pdf#fragment":    false,
	} {
		if _, got := parseUpstreamURL(upstream); got != want {
			t.Errorf("parseUpstreamURL(%q) = %v, want %v", upstream, got, want)
		}
	}
}
