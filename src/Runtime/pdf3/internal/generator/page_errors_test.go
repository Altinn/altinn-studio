package generator

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/trace"

	"altinn.studio/pdf3/internal/cdp"
	"altinn.studio/pdf3/internal/telemetry"
	"altinn.studio/pdf3/internal/telemetry/attr"
	"altinn.studio/pdf3/internal/types"
)

var errUnexpectedParams = errors.New("unexpected command parameters")

const (
	pageLoadError = "Failed to load resource: the server responded with a status of 500 ()"
	cleanupError  = "Failed to load resource: net::ERR_ABORTED"
)

// pageConnection plays a browser that opens a page in a new context for each request. The page
// reports an error as it loads, and another as cleanup disposes of its context, and otherwise
// loads, passes its wait and prints. Like Chrome, it reports events from another goroutine than
// the one sending commands.
type pageConnection struct {
	session *browserSession
	// pageSessionID is the session of the page the browser has open
	pageSessionID atomic.Pointer[string]
	pages         atomic.Int32
}

// events sends events from the page's session from another goroutine, and returns once they're
// handled.
func (c *pageConnection) events(sessionID string, events ...cdp.CDPMessage) {
	done := make(chan struct{})
	go func() {
		defer close(done)
		for _, event := range events {
			c.session.handleEvent(sessionID, event.Method, event.Params)
		}
	}()
	<-done
}

func logEntry(entry map[string]any) cdp.CDPMessage {
	return cdp.CDPMessage{Method: "Log.entryAdded", Params: map[string]any{"entry": entry}}
}

func (c *pageConnection) SendCommand(_ context.Context, method string, _ any) (*cdp.CDPResponse, error) {
	switch method {
	case "Target.createBrowserContext":
		return &cdp.CDPResponse{Result: map[string]any{"browserContextId": "context"}}, nil
	case "Target.createTarget":
		return &cdp.CDPResponse{Result: map[string]any{"targetId": "target"}}, nil
	case "Target.attachToTarget":
		sessionID := fmt.Sprintf("page-%d", c.pages.Add(1))
		c.pageSessionID.Store(&sessionID)
		return &cdp.CDPResponse{Result: map[string]any{"sessionId": sessionID}}, nil
	case "Target.disposeBrowserContext":
		if sessionID := c.pageSessionID.Swap(nil); sessionID != nil {
			c.events(*sessionID, logEntry(map[string]any{"level": "error", "source": "network", "text": cleanupError}))
		}
	}
	return &cdp.CDPResponse{Result: map[string]any{}}, nil
}

func (c *pageConnection) SendCommandBatch(_ context.Context, batch []cdp.Command) []*cdp.CommandResponse {
	responses := make([]*cdp.CommandResponse, len(batch))
	for i := range batch {
		responses[i] = &cdp.CommandResponse{Resp: &cdp.CDPResponse{Result: map[string]any{}}}
	}
	return responses
}

//nolint:ireturn // Implements cdp.Connection.
func (c *pageConnection) Session(sessionID string) cdp.Commander {
	return &fakePage{conn: c, sessionID: sessionID}
}

func (c *pageConnection) Close() error { return nil }

// fakePage is the page of a pageConnection.
type fakePage struct {
	conn      *pageConnection
	sessionID string
}

func (p *fakePage) SendCommand(_ context.Context, method string, params any) (*cdp.CDPResponse, error) {
	switch method {
	case "Page.navigate":
		navigateParams, ok := params.(map[string]any)
		if !ok {
			return nil, errUnexpectedParams
		}
		p.conn.events(p.sessionID, logEntry(map[string]any{
			"level": "error", "source": "network", "text": pageLoadError,
			"url": stringField(navigateParams, "url") + "api/process",
		}))
	case "Runtime.evaluate":
		return &cdp.CDPResponse{Result: map[string]any{"result": map[string]any{"type": "boolean", "value": true}}}, nil
	case "Page.printToPDF":
		return &cdp.CDPResponse{Result: map[string]any{"data": base64.StdEncoding.EncodeToString([]byte("%PDF"))}}, nil
	}
	return &cdp.CDPResponse{Result: map[string]any{}}, nil
}

func (p *fakePage) SendCommandBatch(ctx context.Context, batch []cdp.Command) []*cdp.CommandResponse {
	return p.conn.SendCommandBatch(ctx, batch)
}

type capturedRecord struct {
	attrs   map[string]string
	message string
	level   slog.Level
	traceID trace.TraceID
}

// captureHandler keeps every record with its attributes and the trace it was logged in.
type captureHandler struct {
	mu      *sync.Mutex
	records *[]capturedRecord
	attrs   []slog.Attr
}

func newCaptureHandler() *captureHandler {
	return &captureHandler{mu: &sync.Mutex{}, records: &[]capturedRecord{}}
}

func (h *captureHandler) Enabled(context.Context, slog.Level) bool { return true }

func (h *captureHandler) Handle(ctx context.Context, record slog.Record) error {
	attrs := map[string]string{}
	for _, a := range h.attrs {
		attrs[a.Key] = a.Value.String()
	}
	record.Attrs(func(a slog.Attr) bool {
		attrs[a.Key] = a.Value.String()
		return true
	})
	h.mu.Lock()
	defer h.mu.Unlock()
	*h.records = append(*h.records, capturedRecord{
		attrs:   attrs,
		message: record.Message,
		level:   record.Level,
		traceID: trace.SpanContextFromContext(ctx).TraceID(),
	})
	return nil
}

func (h *captureHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &captureHandler{mu: h.mu, records: h.records, attrs: append(slices.Clone(h.attrs), attrs...)}
}

func (h *captureHandler) WithGroup(string) slog.Handler { return h }

func (h *captureHandler) snapshot() []capturedRecord {
	h.mu.Lock()
	defer h.mu.Unlock()
	return slices.Clone(*h.records)
}

func (h *captureHandler) count(message string) int {
	n := 0
	for _, record := range h.snapshot() {
		if record.message == message {
			n++
		}
	}
	return n
}

// runRequests runs requests through a browser session's request loop, as the worker does, and
// returns once each has been answered and cleaned up, with the URL of the request in each trace.
func runRequests(t *testing.T, logs *captureHandler, urls []string) map[trace.TraceID]string {
	t.Helper()
	return runRequestsWith(t, logs, urls, func(*browserSession) {})
}

// runRequestsWith is runRequests, calling started with the session before the requests run.
func runRequestsWith(
	t *testing.T,
	logs *captureHandler,
	urls []string,
	started func(*browserSession),
) map[trace.TraceID]string {
	t.Helper()
	conn := &pageConnection{}
	sessionCtx, cancel := context.WithCancel(context.Background())
	logger := slog.New(logs)
	w := &browserSession{
		conn:          conn,
		tracer:        sdktrace.NewTracerProvider().Tracer("test"),
		logger:        logger,
		sessionLogger: logger,
		queue:         make(chan workerRequest, len(urls)),
		ctx:           sessionCtx,
		cancel:        cancel,
	}
	conn.session = w
	started(w)
	exited := make(chan struct{})
	go func() {
		defer close(exited)
		w.handleRequests()
	}()

	tracer := sdktrace.NewTracerProvider().Tracer("test")
	traces := map[trace.TraceID]string{}
	responders := make([]chan workerResponse, 0, len(urls))
	for _, requestURL := range urls {
		ctx, span := tracer.Start(
			telemetry.WithRequestAttributes(t.Context(), telemetry.NewRequestAttributes()),
			"entry",
		)
		t.Cleanup(func() { span.End() })
		traces[span.SpanContext().TraceID()] = requestURL
		responder := make(chan workerResponse, 1)
		responders = append(responders, responder)
		w.queue <- workerRequest{
			ctx:        ctx,
			enqueuedAt: time.Now(),
			responder:  responder,
			// As Generate gives it
			logger:  logger.With(attr.RequestURL, telemetry.RedactURL(requestURL)),
			request: types.PdfRequest{URL: requestURL},
		}
	}
	for _, responder := range responders {
		if response := <-responder; response.Error != nil {
			t.Fatalf("response error = %v", response.Error)
		}
	}
	// Cleanup runs after the response; the loop must not be stopped in the middle of it, or its
	// assertions exit the test binary. A test that fails before this leaves the loop waiting on its
	// queue, idle, rather than risk that.
	deadline := time.Now().Add(5 * time.Second)
	for logs.count("Cleanup completed") < len(urls) {
		if time.Now().After(deadline) {
			t.Fatalf("cleaned up %d of %d requests", logs.count("Cleanup completed"), len(urls))
		}
		time.Sleep(time.Millisecond)
	}
	cancel()
	<-exited
	return traces
}

// TestHandleRequests_LogsPageErrorsWithTheirRequest checks that a page error is logged with the
// request's URL and in its trace, and that an error the page reports as cleanup disposes of its
// context is not logged as the page's.
func TestHandleRequests_LogsPageErrorsWithTheirRequest(t *testing.T) {
	logs := newCaptureHandler()
	requestURL := "https://ttd.apps.tt02.altinn.no/ttd/app/"
	traces := runRequests(t, logs, []string{requestURL})

	var pageErrors []capturedRecord
	for _, record := range logs.snapshot() {
		if _, ok := record.attrs[attr.PageErrorKind]; ok {
			pageErrors = append(pageErrors, record)
		}
	}
	if len(pageErrors) != 1 {
		t.Fatalf("logged %d page errors, want the page's 1, not cleanup's: %+v", len(pageErrors), pageErrors)
	}
	got := pageErrors[0]
	if got.level != slog.LevelWarn || got.attrs[attr.PageErrorMessage] != pageLoadError {
		t.Errorf("page error = %s %q, want WARN %q", got.level, got.attrs[attr.PageErrorMessage], pageLoadError)
	}
	if got.attrs[attr.RequestURL] != requestURL {
		t.Errorf("page error %s = %q, want %q", attr.RequestURL, got.attrs[attr.RequestURL], requestURL)
	}
	if traces[got.traceID] != requestURL {
		t.Errorf("page error logged in trace %s, not the request's", got.traceID)
	}
}

// TestHandleRequests_PageErrorsStayWithTheirRequest sends page errors from another goroutine, as
// Chrome's events arrive, while requests start and finish and the session swaps its logger, and
// checks that each error is logged with one request's URL and in that request's trace. Run with
// -race.
func TestHandleRequests_PageErrorsStayWithTheirRequest(t *testing.T) {
	logs := newCaptureHandler()
	urls := make([]string, 20)
	for i := range urls {
		urls[i] = fmt.Sprintf("https://ttd.apps.tt02.altinn.no/ttd/app%d/", i)
	}

	started := make(chan *browserSession, 1)
	stop := make(chan struct{})
	stopped := make(chan struct{})
	go func() {
		defer close(stopped)
		var session *browserSession
		select {
		case session = <-started:
		case <-stop:
			return
		}
		for {
			select {
			case <-stop:
				return
			default:
				// The page's session can end, and the next request's start, before the event is
				// handled, as when Chrome's events race the worker's requests.
				sessionID := ""
				if id := session.pageSessionID.Load(); id != nil {
					sessionID = *id
				}
				session.handleEvent(sessionID, "Runtime.exceptionThrown", map[string]any{
					"exceptionDetails": map[string]any{"text": "Uncaught TypeError"},
				})
			}
		}
	}()
	// Stops the errors however the test ends, so a failed test doesn't leave them spinning.
	t.Cleanup(func() {
		close(stop)
		<-stopped
	})
	traces := runRequestsWith(t, logs, urls, func(w *browserSession) { started <- w })

	pageErrors := 0
	for _, record := range logs.snapshot() {
		if _, ok := record.attrs[attr.PageErrorKind]; !ok {
			continue
		}
		pageErrors++
		if requestURL := traces[record.traceID]; requestURL == "" || record.attrs[attr.RequestURL] != requestURL {
			t.Fatalf(
				"page error with %s %q logged in the trace of %q",
				attr.RequestURL,
				record.attrs[attr.RequestURL],
				requestURL,
			)
		}
	}
	if pageErrors == 0 {
		t.Fatal("logged no page errors, so nothing was checked")
	}
}
