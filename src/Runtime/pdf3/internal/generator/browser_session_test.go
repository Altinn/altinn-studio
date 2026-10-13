package generator

import (
	"bytes"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"sync"
	"testing"

	"go.opentelemetry.io/otel/attribute"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"

	"altinn.studio/pdf3/internal/telemetry"
	"altinn.studio/pdf3/internal/telemetry/attr"
)

func TestHtmlIDPattern(t *testing.T) {
	//nolint:govet // Table readability matters more here than packing test-only struct fields.
	tests := []struct {
		selector string
		want     bool
		reason   string
	}{
		// Valid simple ID selectors (should match and use optimized path)
		{"#myId", true, "simple ID with letters"},
		{"#my-id", true, "ID with hyphens"},
		{"#my_id", true, "ID with underscores"},
		{"#ID123", true, "ID with numbers"},
		{"#_underscore", true, "ID starting with underscore"},
		{"#id-with-many-hyphens", true, "ID with multiple hyphens"},
		{"#CamelCaseId", true, "camelCase ID"},
		{"#UPPERCASE", true, "uppercase ID"},
		{"#a", true, "single character ID"},
		{"#id123", true, "ID with numbers at end"},

		// HTML5 allows these, so if we're being permissive they should match
		{"#123", true, "ID starting with number (HTML5 allows)"},
		{"#-dash", true, "ID starting with dash (HTML5 allows)"},

		// Complex selectors (should NOT match - need querySelector)
		{"#id.class", false, "ID with class selector"},
		{"#id .child", false, "ID with descendant selector"},
		{"#id>.child", false, "ID with child combinator"},
		{"#id+sibling", false, "ID with adjacent sibling combinator"},
		{"#id~sibling", false, "ID with general sibling combinator"},
		{"#id[attr]", false, "ID with attribute selector"},
		{"#id:hover", false, "ID with pseudo-class"},
		{"#id::before", false, "ID with pseudo-element"},
		{"#id1,#id2", false, "multiple selectors"},

		// Not ID selectors at all (should NOT match)
		{".class", false, "class selector"},
		{"div", false, "element selector"},
		{"[attr]", false, "attribute selector"},
		{"*", false, "universal selector"},
		{"", false, "empty string"},
		{" #id", false, "ID with leading space"},
		{"#id ", false, "ID with trailing space"},
	}

	for _, tt := range tests {
		t.Run(tt.selector, func(t *testing.T) {
			got := htmlIDSelectorPattern.MatchString(tt.selector)
			if got != tt.want {
				t.Errorf("htmlIDPattern.MatchString(%q) = %v, want %v (%s)",
					tt.selector, got, tt.want, tt.reason)
			}
		})
	}
}

// sendPageErrors sends the page's three kinds of error event, with payloads that must not be
// logged.
func sendPageErrors(w *browserSession) {
	w.handleEvent("Runtime.consoleAPICalled", map[string]any{
		"type": "error",
		"args": []any{
			map[string]any{"type": "string", "value": "Failed to load"},
			map[string]any{"type": "object", "description": "Object", "preview": map[string]any{"secret": "page data"}},
		},
	})
	w.handleEvent("Log.entryAdded", map[string]any{"entry": map[string]any{
		"level":  "error",
		"source": "network",
		"text":   "Failed to load resource: the server responded with a status of 500 ()",
		"url":    "https://app.local/ttd/app/instances/1/2/process?token=secret",
	}})
	w.handleEvent("Runtime.exceptionThrown", map[string]any{"exceptionDetails": map[string]any{
		"text":      "Uncaught",
		"exception": map[string]any{"description": strings.Repeat("TypeError: x is undefined ", 100)},
	}})
}

// syncBuffer is a log destination that the CDP event goroutine and the request's can write to
// and read at once.
type syncBuffer struct {
	buf bytes.Buffer
	mu  sync.Mutex
}

func (b *syncBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	n, err := b.buf.Write(p)
	if err != nil {
		return n, fmt.Errorf("write log: %w", err)
	}
	return n, nil
}

func (b *syncBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

func newTestSession(logs io.Writer) *browserSession {
	return &browserSession{logger: slog.New(slog.NewTextHandler(logs, nil))}
}

// startRequestPageErrors makes w record page errors for a request, as handleRequests does.
func startRequestPageErrors(t *testing.T, w *browserSession) *pageErrors {
	t.Helper()
	requestErrors := &pageErrors{
		ctx:        t.Context(),
		logger:     w.logger,
		attributes: telemetry.NewRequestAttributes(),
	}
	w.currentPageErrors.Store(requestErrors)
	return requestErrors
}

func TestPageErrors_OneWarningPerError(t *testing.T) {
	var logs bytes.Buffer
	w := newTestSession(&logs)
	requestErrors := startRequestPageErrors(t, w)

	sendPageErrors(w)
	w.currentPageErrors.Store(nil)
	requestErrors.logNotLogged()

	got := strings.Split(strings.TrimSpace(logs.String()), "\n")
	if len(got) != 3 {
		t.Fatalf("logged %d records, want one per error:\n%s", len(got), logs.String())
	}
	want := []string{
		`level=WARN msg="Page logged a console error" ` + attr.PageErrorMessage + `="Failed to load Object"`,
		`level=WARN msg="Browser reported a page error" ` + attr.PageErrorLogSource + `=network ` +
			attr.PageErrorMessage + `="Failed to load resource: the server responded with a status of 500 ()" ` +
			attr.PageErrorURL + `=https://app.local/ttd/app/instances/1/2/process`,
		`level=WARN msg="Page threw an uncaught exception" ` + attr.PageErrorMessage + `="TypeError: x is undefined`,
	}
	for i, record := range got {
		if !strings.Contains(record, want[i]) {
			t.Errorf("record %d = %q, want %q", i, record, want[i])
		}
	}
	for _, leaked := range []string{"page data", "token=secret"} {
		if strings.Contains(logs.String(), leaked) {
			t.Errorf("log contains %q:\n%s", leaked, logs.String())
		}
	}

	// The counts are on the request's attributes as soon as the errors arrive, before the
	// response ends the entry span.
	spans := tracetest.NewSpanRecorder()
	_, span := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(spans)).Tracer("test").Start(t.Context(), "entry")
	telemetry.SetOnSpan(span, requestErrors.attributes)
	span.End()
	counts := map[attribute.Key]int64{}
	for _, kv := range spans.Ended()[0].Attributes() {
		counts[kv.Key] = kv.Value.AsInt64()
	}
	for _, key := range []attribute.Key{
		attr.PageConsoleErrors,
		attr.PageBrowserErrors,
		attr.PageJSExceptions,
	} {
		if counts[key] != 1 {
			t.Errorf("%s = %d, want 1", key, counts[key])
		}
	}
}

func TestPageErrors_TruncatedAndRedacted(t *testing.T) {
	var logs bytes.Buffer
	w := newTestSession(&logs)
	startRequestPageErrors(t, w)

	w.handleEvent("Log.entryAdded", map[string]any{"entry": map[string]any{
		"level": "error",
		"text":  "see https://user:pass@app.local/ttd/app/a?token=secret " + strings.Repeat("x", 2000),
		"url":   "https://user:pass@app.local/ttd/app/api/data?token=secret#frag",
	}})

	got := logs.String()
	if !strings.Contains(got, " "+attr.PageErrorURL+"=https://app.local/ttd/app/api/data") {
		t.Errorf("log = %q, want the URL without user, query or fragment", got)
	}
	if !strings.Contains(got, "see https://app.local/ttd/app/a ") {
		t.Errorf("log = %q, want the URL in the message without user, query or fragment", got)
	}
	if strings.Contains(got, strings.Repeat("x", maxBrowserMessageLength)) {
		t.Errorf("message not truncated to %d bytes", maxBrowserMessageLength)
	}
	for _, leaked := range []string{"pass", "secret", "frag"} {
		if strings.Contains(got, leaked) {
			t.Errorf("log contains %q:\n%s", leaked, got)
		}
	}
}

func TestPageErrors_LoggedUpToTheLimit(t *testing.T) {
	var logs bytes.Buffer
	w := newTestSession(&logs)
	requestErrors := startRequestPageErrors(t, w)

	for range 10 {
		sendPageErrors(w)
	}
	w.currentPageErrors.Store(nil)
	requestErrors.logNotLogged()

	got := logs.String()
	if n := strings.Count(got, "level=WARN msg=\"Page logged") + strings.Count(got, "level=WARN msg=\"Browser") +
		strings.Count(got, "level=WARN msg=\"Page threw"); n != maxLoggedPageErrors {
		t.Errorf("logged %d page errors, want %d", n, maxLoggedPageErrors)
	}
	want := `level=WARN msg="Page reported more errors than were logged" ` + attr.PageErrorsNotLogged + `=6`
	if !strings.HasSuffix(strings.TrimSpace(got), want) {
		t.Errorf("last record = %q, want %q", got[strings.LastIndex(strings.TrimSpace(got), "\n")+1:], want)
	}
}

func TestPageErrors_NoneOrLateLogNothing(t *testing.T) {
	var logs bytes.Buffer
	w := newTestSession(&logs)

	// No errors while the request ran.
	requestErrors := startRequestPageErrors(t, w)
	w.currentPageErrors.Store(nil)
	// An error that arrives after the request finished belongs to no request.
	sendPageErrors(w)
	requestErrors.logNotLogged()

	if logs.Len() != 0 {
		t.Errorf("logged %q, want nothing", logs.String())
	}
}

// TestPageErrors_LateErrorsDoNotRace sends page errors from another goroutine, as the CDP reader
// does, while requests start and finish. Run with -race.
func TestPageErrors_LateErrorsDoNotRace(t *testing.T) {
	var logs syncBuffer
	w := newTestSession(&logs)
	done := make(chan struct{})
	go func() {
		defer close(done)
		for range 200 {
			sendPageErrors(w)
		}
	}()

	for range 50 {
		requestErrors := startRequestPageErrors(t, w)
		w.currentPageErrors.Store(nil)
		requestErrors.logNotLogged()
	}
	<-done
	if got, limit := strings.Count(logs.String(), "\n"), 50*(maxLoggedPageErrors+1); got > limit {
		t.Errorf("logged %d records for 50 requests, want at most %d", got, limit)
	}
}

func TestHandleWaitError_LogsDetailsAtInfoWithoutPayload(t *testing.T) {
	tests := map[string]struct {
		data any
		want string
	}{
		"exception": {
			data: map[string]any{
				"text": "Uncaught",
				"exception": map[string]any{
					"description": "Error: boom",
					"preview":     map[string]any{"secret": "page data"},
				},
			},
			want: attr.WaitException + `="Error: boom"`,
		},
		"other result": {
			data: map[string]any{"type": "object", "value": map[string]any{"secret": "page data"}},
			want: attr.WaitResultBytes + "=",
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			var logs bytes.Buffer
			w := newTestSession(&logs)
			req := &workerRequest{
				ctx:       t.Context(),
				responder: make(chan workerResponse, 1),
				logger:    slog.New(slog.DiscardHandler),
			}

			if err := w.handleWaitError(req, "JavaScript exception during wait", tt.data, "exception"); err == nil {
				t.Fatal("handleWaitError() = nil, want the wait's error")
			}

			got := logs.String()
			if !strings.Contains(got, tt.want) {
				t.Errorf("log = %q, want %q", got, tt.want)
			}
			if !strings.Contains(got, "level=INFO ") {
				t.Errorf("log = %q, want the details at INFO: the request logs its one error", got)
			}
			if strings.Contains(got, "page data") {
				t.Errorf("log contains the payload: %q", got)
			}
		})
	}
}

func TestPageErrors_FirstMessageHasURLsRedacted(t *testing.T) {
	tests := map[string]struct {
		event  map[string]any
		method string
		want   string
	}{
		"console message": {
			method: "Runtime.consoleAPICalled",
			event: map[string]any{"type": "error", "args": []any{
				map[string]any{"type": "string", "value": "GET https://app.local/api?token=secret 401"},
			}},
			want: `message="GET https://app.local/api 401"`,
		},
		"log entry": {
			method: "Log.entryAdded",
			event: map[string]any{"entry": map[string]any{
				"level": "error",
				"text":  "Failed to load https://user:pass@app.local/a#/instance/1 and wss://app.local/ws?ticket=x",
			}},
			want: `message="Failed to load https://app.local/a and wss://app.local/ws"`,
		},
		"exception": {
			method: "Runtime.exceptionThrown",
			event: map[string]any{"exceptionDetails": map[string]any{"exception": map[string]any{
				"description": "Error: boom\n    at f (https://app.local/app/?render=light:1:2)",
			}}},
			want: `message="Error: boom\n    at f (https://app.local/app/)"`,
		},
		"no URL": {
			method: "Runtime.exceptionThrown",
			event:  map[string]any{"exceptionDetails": map[string]any{"text": "Uncaught TypeError"}},
			want:   `message="Uncaught TypeError"`,
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			var logs bytes.Buffer
			w := newTestSession(&logs)
			startRequestPageErrors(t, w)
			w.handleEvent(tt.method, tt.event)

			got := logs.String()
			if !strings.Contains(got, tt.want) {
				t.Errorf("log = %q, want %q", got, tt.want)
			}
			for _, leaked := range []string{"token", "pass", "instance", "ticket", "render"} {
				if strings.Contains(got, leaked) {
					t.Errorf("log contains %q: %q", leaked, got)
				}
			}
		})
	}
}

func TestPageErrors_RedactsBeforeTruncating(t *testing.T) {
	var logs bytes.Buffer
	w := newTestSession(&logs)
	startRequestPageErrors(t, w)

	// The URL's query straddles the truncation point: redacting first leaves none of it.
	prefix := strings.Repeat("x", maxBrowserMessageLength-30)
	w.handleEvent("Log.entryAdded", map[string]any{"entry": map[string]any{
		"level": "error",
		"text":  prefix + " https://app.local/a?token=secret-value-that-is-long " + strings.Repeat("y", 100),
	}})

	got := logs.String()
	if strings.Contains(got, "token") || strings.Contains(got, "secret") {
		t.Errorf("log contains the query: %q", got)
	}
	if !strings.Contains(got, prefix+" https://app.local/a ") || !strings.Contains(got, "...(truncated)") {
		t.Errorf("log = %q, want the redacted URL, then the message truncated", got)
	}
}
