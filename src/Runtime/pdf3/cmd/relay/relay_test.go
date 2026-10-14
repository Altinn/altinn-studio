package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"maps"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	"go.opentelemetry.io/otel/trace"

	"altinn.studio/pdf3/internal/auth"
	ihttp "altinn.studio/pdf3/internal/http"
	"altinn.studio/pdf3/internal/serviceowner"
	"altinn.studio/pdf3/internal/telemetry"
	"altinn.studio/pdf3/internal/telemetry/attr"
)

const requestBody = `{"url":"https://ttd.apps.tt02.altinn.no/ttd/app/instance/1/abc?pdf=1"}`

var errConnectionRefused = errors.New("connection refused")

// logRecorder collects a relay's log records, from whichever goroutine serves the request.
type logRecorder struct {
	buf bytes.Buffer
	mu  sync.Mutex
}

func (l *logRecorder) Write(p []byte) (int, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.buf.Write(p) //nolint:wrapcheck // io.Writer passes on the buffer's error as it is.
}

func (l *logRecorder) String() string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.buf.String()
}

// recordLogs makes rl log to the returned recorder.
func recordLogs(rl *relay) *logRecorder {
	logs := &logRecorder{}
	rl.logger = slog.New(slog.NewTextHandler(logs, nil))
	return logs
}

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
	return newRelay(logger, upstream, keys, "ttd", func() bool { return false })
}

// recordSpans makes the global tracer provider, which the relay's middleware uses, record its spans
// for the rest of the test.
func recordSpans(t *testing.T) *tracetest.SpanRecorder {
	t.Helper()
	spans := tracetest.NewSpanRecorder()
	previous := otel.GetTracerProvider()
	otel.SetTracerProvider(sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(spans)))
	t.Cleanup(func() { otel.SetTracerProvider(previous) })
	return spans
}

// serveRelay serves rl as main does, with the middleware and with base as the context its requests
// derive from, and calls done when a request has been handled, aborted or not.
func serveRelay(t *testing.T, rl *relay, base context.Context, done func()) *httptest.Server {
	t.Helper()
	handler := telemetry.WrapHandler("POST /pdf", func(w http.ResponseWriter, r *http.Request) {
		defer done()
		rl.handlePdf(w, r)
	})
	server := httptest.NewUnstartedServer(handler)
	server.Config.BaseContext = func(net.Listener) context.Context { return base }
	server.Start()
	t.Cleanup(server.Close)
	return server
}

// postTo sends the request body to server, with ctx as the request's context.
func postTo(ctx context.Context, t *testing.T, server *httptest.Server) (*http.Response, error) {
	t.Helper()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, server.URL, strings.NewReader(requestBody))
	if err != nil {
		t.Fatalf("NewRequest() error = %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	return server.Client().Do(req) //nolint:wrapcheck // The test checks the client's error as it is.
}

func closeBody(t *testing.T, resp *http.Response) {
	t.Helper()
	if err := resp.Body.Close(); err != nil {
		t.Errorf("Close() error = %v", err)
	}
}

// startPDF answers with a 200 and the start of a PDF, large enough that the relay sends its status
// on, then waits for release or for the relay to cancel the request. The relay may cancel it while
// the PDF is still being written, so a failed write ends the response.
func startPDF(t *testing.T, release <-chan struct{}) http.HandlerFunc {
	t.Helper()
	return func(w http.ResponseWriter, r *http.Request) {
		if _, err := io.Copy(io.Discard, r.Body); err != nil {
			t.Errorf("Copy() error = %v", err)
		}
		w.Header().Set("Content-Type", "application/pdf")
		if _, err := io.WriteString(w, "%PDF-"+strings.Repeat("x", 64*1024)); err != nil {
			return
		}
		if err := http.NewResponseController(w).Flush(); err != nil {
			return
		}
		select {
		case <-release:
		case <-r.Context().Done():
		}
	}
}

// requireAborted checks that resp, a 200, is cut off with a read error rather than ending cleanly.
func requireAborted(t *testing.T, resp *http.Response) {
	t.Helper()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want the upstream's 200", resp.StatusCode)
	}
	if body, err := io.ReadAll(resp.Body); err == nil {
		t.Fatalf("read a complete response of %d bytes, want a read error", len(body))
	}
}

// requireErrorSpan checks that the request's server span ended with an error of errorType and the
// status code that was sent.
func requireErrorSpan(t *testing.T, spans *tracetest.SpanRecorder, errorType string) {
	t.Helper()
	var servers []sdktrace.ReadOnlySpan
	for _, span := range spans.Ended() {
		if span.SpanKind() == trace.SpanKindServer {
			servers = append(servers, span)
		}
	}
	if len(servers) != 1 {
		t.Fatalf("ended %d server spans, want 1", len(servers))
	}
	span := servers[0]
	if span.Status().Code != codes.Error {
		t.Fatalf("span status = %v, want Error", span.Status())
	}
	attrs := attribute.NewSet(span.Attributes()...)
	if got, _ := attrs.Value(attr.ErrorType); got.AsString() != errorType {
		t.Fatalf("span %s = %q, want %q", attr.ErrorType, got.AsString(), errorType)
	}
	if got, _ := attrs.Value(attr.HTTPResponseStatusCode); got.AsInt64() != http.StatusOK {
		t.Fatalf("span %s = %d, want 200", attr.HTTPResponseStatusCode, got.AsInt64())
	}
}

func post(t *testing.T, handler http.Handler, header http.Header) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/pdf", strings.NewReader(requestBody))
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
	rec := post(t, http.HandlerFunc(rl.handlePdf), nil)

	if rec.Code != http.StatusOK || rec.Body.String() != "%PDF-1.7 test" {
		t.Fatalf("response = %d %q", rec.Code, rec.Body.String())
	}
	if rec.Header().Get("Content-Type") != "application/pdf" || rec.Header().Get("Content-Length") != "13" {
		t.Fatalf(
			"Content-Type = %q, Content-Length = %q",
			rec.Header().Get("Content-Type"),
			rec.Header().Get("Content-Length"),
		)
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
			rec := post(t, http.HandlerFunc(rl.handlePdf), nil)

			if rec.Code != status || rec.Body.String() != `{"title":"upstream"}` {
				t.Fatalf("response = %d %q", rec.Code, rec.Body.String())
			}
			if calls.Load() != 1 {
				t.Fatalf("upstream called %d times, want 1", calls.Load())
			}
		})
	}
}

func TestRelayReturnsBadGatewayWhenUpstreamDoesNotAccept(t *testing.T) {
	for _, status := range []int{
		http.StatusFound,
		http.StatusTemporaryRedirect,
		http.StatusUnauthorized,
		http.StatusForbidden,
	} {
		t.Run(http.StatusText(status), func(t *testing.T) {
			var calls atomic.Int32
			var upstream *httptest.Server
			upstream = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				calls.Add(1)
				w.Header().Set("Location", upstream.URL+"/elsewhere")
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(status)
				if _, err := w.Write([]byte(`{"title":"upstream title"}`)); err != nil {
					t.Errorf("Write() error = %v", err)
				}
			}))
			defer upstream.Close()

			rl := newTestRelay(t, upstream.URL)
			logs := recordLogs(rl)
			rec := post(t, http.HandlerFunc(rl.handlePdf), nil)

			if rec.Code != http.StatusBadGateway {
				t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadGateway)
			}
			if rec.Header().Get("Location") != "" || strings.Contains(rec.Body.String(), "upstream title") {
				t.Fatalf(
					"passed on the upstream response: Location %q, body %q",
					rec.Header().Get("Location"),
					rec.Body.String(),
				)
			}
			if calls.Load() != 1 {
				t.Fatalf("upstream called %d times, want 1", calls.Load())
			}
			if got := logs.String(); !strings.Contains(got, "level=ERROR") ||
				!strings.Contains(got, attr.HTTPResponseStatusCode+"="+strconv.Itoa(status)) {
				t.Fatalf("logs = %q, want an error with the upstream status", got)
			}
		})
	}
}

func TestRelayAbortsTruncatedResponse(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := io.Copy(io.Discard, r.Body); err != nil {
			t.Errorf("Copy() error = %v", err)
		}
		conn, buf, err := http.NewResponseController(w).Hijack()
		if err != nil {
			t.Errorf("Hijack() error = %v", err)
			return
		}
		defer func() {
			if err := conn.Close(); err != nil {
				t.Errorf("Close() error = %v", err)
			}
		}()
		// A 200 and the start of a PDF, large enough that the relay sends its status on, then the
		// connection closes before the last chunk.
		chunk := "%PDF-" + strings.Repeat("x", 64*1024)
		if _, err := fmt.Fprintf(
			buf,
			"HTTP/1.1 200 OK\r\nContent-Type: application/pdf\r\nTransfer-Encoding: chunked\r\n\r\n%x\r\n%s\r\n",
			len(chunk),
			chunk,
		); err != nil {
			t.Errorf("WriteString() error = %v", err)
		}
		if err := buf.Flush(); err != nil {
			t.Errorf("Flush() error = %v", err)
		}
	}))
	defer upstream.Close()

	rl := newTestRelay(t, upstream.URL)
	logs := recordLogs(rl)
	spans := recordSpans(t)
	// A real server, with the middleware main uses, so the abort reaches the connection.
	handled := make(chan struct{})
	server := serveRelay(t, rl, t.Context(), func() { close(handled) })

	resp, err := postTo(t.Context(), t, server)
	if err != nil {
		t.Fatalf("Do() error = %v", err)
	}
	defer closeBody(t, resp)
	requireAborted(t, resp)
	<-handled

	if got := logs.String(); !strings.Contains(got, `level=ERROR msg="Failed to copy the PDF service response"`) {
		t.Fatalf("logs = %q, want an error", got)
	}
	requireErrorSpan(t, spans, "upstream_response_failed")
}

func TestRelayAbortsResponseOnShutdown(t *testing.T) {
	release := make(chan struct{})
	defer close(release)
	upstream := httptest.NewServer(startPDF(t, release))
	defer upstream.Close()

	shutdown, shutDown := context.WithCancel(t.Context())
	defer shutDown()
	rl := newTestRelay(t, upstream.URL)
	rl.shuttingDown = func() bool { return shutdown.Err() != nil }
	logs := recordLogs(rl)
	spans := recordSpans(t)
	handled := make(chan struct{})
	server := serveRelay(t, rl, shutdown, func() { close(handled) })

	resp, err := postTo(t.Context(), t, server)
	if err != nil {
		t.Fatalf("Do() error = %v", err)
	}
	defer closeBody(t, resp)
	// The status is sent and the PDF has started, as when the host cancels the server's context.
	shutDown()
	requireAborted(t, resp)
	<-handled

	got := logs.String()
	if strings.Contains(got, "level=ERROR") ||
		!strings.Contains(got, `level=WARN msg="The relay shut down while the PDF service response was copied"`) {
		t.Fatalf("logs = %q, want the shutdown at WARN", got)
	}
	requireErrorSpan(t, spans, "shutting_down")
}

func TestRelayLogsClientThatGaveUpDuringCopyAtInfo(t *testing.T) {
	release := make(chan struct{})
	defer close(release)
	upstream := httptest.NewServer(startPDF(t, release))
	defer upstream.Close()

	rl := newTestRelay(t, upstream.URL)
	logs := recordLogs(rl)
	handled := make(chan struct{})
	server := serveRelay(t, rl, t.Context(), func() { close(handled) })

	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	resp, err := postTo(ctx, t, server)
	if err != nil {
		t.Fatalf("Do() error = %v", err)
	}
	defer closeBody(t, resp)
	// The app disconnects after the status, while the PDF is still being copied.
	cancel()
	<-handled

	got := logs.String()
	if strings.Contains(got, "level=ERROR") || strings.Contains(got, "level=WARN") ||
		!strings.Contains(got, `level=INFO msg="The client gave up while the PDF service response was copied"`) {
		t.Fatalf("logs = %q, want the client giving up at INFO", got)
	}
}

func TestRelayRetriesConnectFailures(t *testing.T) {
	var gotBody string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("ReadAll() error = %v", err)
		}
		gotBody = string(body)
		if _, err := w.Write([]byte("%PDF-1.7 test")); err != nil {
			t.Errorf("Write() error = %v", err)
		}
	}))
	defer upstream.Close()

	rl := newTestRelay(t, upstream.URL)
	var dials atomic.Int32
	var dialer net.Dialer
	rl.client.Transport = &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			if dials.Add(1) == 1 {
				return nil, &net.OpError{Op: "dial", Net: network, Err: errConnectionRefused}
			}
			return dialer.DialContext(ctx, network, addr)
		},
	}
	rec := post(t, http.HandlerFunc(rl.handlePdf), nil)

	if rec.Code != http.StatusOK || rec.Body.String() != "%PDF-1.7 test" {
		t.Fatalf("response = %d %q", rec.Code, rec.Body.String())
	}
	if dials.Load() != 2 {
		t.Fatalf("dialed %d times, want 2", dials.Load())
	}
	if gotBody != requestBody {
		t.Fatalf("upstream got body %q, want %q", gotBody, requestBody)
	}
}

func TestRelayDoesNotRetryAfterConnecting(t *testing.T) {
	var calls atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		if _, err := io.Copy(io.Discard, r.Body); err != nil {
			t.Errorf("Copy() error = %v", err)
		}
		// The request may have been processed, so the relay must not send it again.
		conn, _, err := http.NewResponseController(w).Hijack()
		if err != nil {
			t.Errorf("Hijack() error = %v", err)
			return
		}
		if err := conn.Close(); err != nil {
			t.Errorf("Close() error = %v", err)
		}
	}))
	defer upstream.Close()

	rl := newTestRelay(t, upstream.URL)
	rec := post(t, http.HandlerFunc(rl.handlePdf), nil)

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadGateway)
	}
	if calls.Load() != 1 {
		t.Fatalf("upstream called %d times, want 1", calls.Load())
	}
}

func TestRelayLogsClientThatGaveUpAtInfo(t *testing.T) {
	received := make(chan struct{})
	release := make(chan struct{})
	upstream := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		if _, err := io.Copy(io.Discard, r.Body); err != nil {
			t.Errorf("Copy() error = %v", err)
		}
		close(received)
		select {
		case <-release:
		case <-r.Context().Done():
		}
	}))
	defer upstream.Close()
	defer close(release)

	rl := newTestRelay(t, upstream.URL)
	logs := recordLogs(rl)
	handled := make(chan struct{})
	server := serveRelay(t, rl, t.Context(), func() { close(handled) })

	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	go func() {
		<-received
		cancel()
	}()
	if resp, err := postTo(ctx, t, server); err == nil {
		closeBody(t, resp)
		t.Fatalf("got a %d response, want the request cancelled", resp.StatusCode)
	}
	<-handled

	got := logs.String()
	if strings.Contains(got, "level=ERROR") || strings.Contains(got, "level=WARN") ||
		!strings.Contains(got, `level=INFO msg="The client gave up before the PDF service responded"`) {
		t.Fatalf("logs = %q, want the client giving up at INFO", got)
	}
}

func TestRelayAnswersServiceUnavailableOnShutdownBeforeUpstreamAnswers(t *testing.T) {
	received := make(chan struct{})
	release := make(chan struct{})
	defer close(release)
	upstream := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		if _, err := io.Copy(io.Discard, r.Body); err != nil {
			t.Errorf("Copy() error = %v", err)
		}
		close(received)
		select {
		case <-release:
		case <-r.Context().Done():
		}
	}))
	defer upstream.Close()

	shutdown, shutDown := context.WithCancel(t.Context())
	defer shutDown()
	rl := newTestRelay(t, upstream.URL)
	rl.shuttingDown = func() bool { return shutdown.Err() != nil }
	logs := recordLogs(rl)
	handled := make(chan struct{})
	server := serveRelay(t, rl, shutdown, func() { close(handled) })

	go func() {
		<-received
		shutDown()
	}()
	resp, err := postTo(t.Context(), t, server)
	if err != nil {
		t.Fatalf("Do() error = %v", err)
	}
	defer closeBody(t, resp)
	<-handled

	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", resp.StatusCode, http.StatusServiceUnavailable)
	}
	got := logs.String()
	if strings.Contains(got, "level=ERROR") ||
		!strings.Contains(got, `level=WARN msg="The relay shut down before the PDF service responded"`) {
		t.Fatalf("logs = %q, want the shutdown at WARN", got)
	}
}

func TestRelayWaitsLongerThanApps(t *testing.T) {
	// Apps call pdf3 with HttpClient's default timeout, which ends a slow request today.
	const appTimeout = 100 * time.Second
	if rl := newTestRelay(t, "http://upstream"); rl.timeout <= appTimeout {
		t.Fatalf("timeout = %v, want more than the apps' %v", rl.timeout, appTimeout)
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
	rec := post(t, http.HandlerFunc(rl.handlePdf), nil)

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
	logs := recordLogs(rl)
	rec := post(t, http.HandlerFunc(rl.handlePdf), nil)

	if rec.Code != http.StatusGatewayTimeout {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusGatewayTimeout)
	}
	// The relay's own timeout is an error, unlike a client that gives up.
	if got := logs.String(); !strings.Contains(got, `level=ERROR msg="Failed to reach the PDF service"`) {
		t.Fatalf("logs = %q, want an error", got)
	}
}

func TestRelayRejectsBadRequestsLocally(t *testing.T) {
	var calls atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {
		calls.Add(1)
	}))
	defer upstream.Close()
	rl := newTestRelay(t, upstream.URL)

	getRec := httptest.NewRecorder()
	rl.handlePdf(getRec, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/pdf", nil))
	if getRec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("GET: status = %d", getRec.Code)
	}

	if calls.Load() != 0 {
		t.Fatalf("upstream called %d times, want 0", calls.Load())
	}
}

// TestRelayAnswersOversizedBodiesAsTheProxy pins the local proxy's answers, which
// TestGeneratePdf_OversizedBody in cmd/proxy pins too.
func TestRelayAnswersOversizedBodiesAsTheProxy(t *testing.T) {
	oversized := `{"url":"https://ttd.apps.tt02.altinn.no/` + strings.Repeat("x", maxBodySize) + `"}`
	tests := []struct {
		name          string
		contentType   string
		want          ihttp.ProblemDetails
		contentLength int64
	}{
		{
			name:          "with Content-Length",
			contentType:   "application/json",
			contentLength: int64(len(oversized)),
			want: ihttp.ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.11",
				Title:  "Request Entity Too Large",
				Status: http.StatusRequestEntityTooLarge,
				Detail: "Request body too large (max 65536 bytes)",
			},
		},
		{
			name:          "chunked",
			contentType:   "application/json",
			contentLength: -1,
			want: ihttp.ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.1",
				Title:  "Bad Request",
				Status: http.StatusBadRequest,
				Detail: "Invalid JSON payload: http: request body too large",
			},
		},
		{
			name:          "not JSON",
			contentType:   "text/plain",
			contentLength: int64(len(oversized)),
			want: ihttp.ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.13",
				Title:  "Unsupported Media Type",
				Status: http.StatusUnsupportedMediaType,
				Detail: "Content-Type must be application/json",
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var calls atomic.Int32
			upstream := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {
				calls.Add(1)
			}))
			defer upstream.Close()
			rl := newTestRelay(t, upstream.URL)

			req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/pdf", strings.NewReader(oversized))
			req.Header.Set("Content-Type", tt.contentType)
			req.ContentLength = tt.contentLength
			rec := httptest.NewRecorder()
			rl.handlePdf(rec, req)

			var got ihttp.ProblemDetails
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatalf("Unmarshal(%q) error = %v", rec.Body.String(), err)
			}
			if rec.Code != tt.want.Status || !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("response = %d %+v, want %+v", rec.Code, got, tt.want)
			}
			if calls.Load() != 0 {
				t.Fatalf("upstream called %d times, want 0", calls.Load())
			}
		})
	}
}

func TestRelayPropagatesTraceContextButNotBaggage(t *testing.T) {
	previous := otel.GetTextMapPropagator()
	otel.SetTextMapPropagator(
		propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}),
	)
	defer otel.SetTextMapPropagator(previous)

	var got http.Header
	upstream := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		got = r.Header.Clone()
	}))
	defer upstream.Close()

	rl := newTestRelay(t, upstream.URL)
	handler := telemetry.WrapHandler("POST /pdf", rl.handlePdf)
	const traceID = "4bf92f3577b34da6a3ce929d0e0e4736"
	post(t, handler, http.Header{
		"Traceparent": {"00-" + traceID + "-b7ad6b7169203331-01"},
		"Baggage":     {"user.id=12345"},
	})

	if traceparent := got.Get("Traceparent"); !strings.Contains(traceparent, traceID) {
		t.Fatalf("upstream traceparent = %q, want trace %s", traceparent, traceID)
	}
	if baggage := got.Values("Baggage"); len(baggage) != 0 {
		t.Fatalf("upstream got baggage %q, want none", baggage)
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
	post(t, http.HandlerFunc(rl.handlePdf), http.Header{serviceowner.Header: {"ikta"}})

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
