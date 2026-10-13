package generator

import (
	"bytes"
	"log/slog"
	"strings"
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
		"level": "error",
		"text":  "Failed to load resource: 401",
		"url":   "https://app.local/ttd/app/api/data?token=secret",
	}})
	w.handleEvent("Runtime.exceptionThrown", map[string]any{"exceptionDetails": map[string]any{
		"text":      "Uncaught",
		"exception": map[string]any{"description": strings.Repeat("TypeError: x is undefined ", 100)},
	}})
}

func newTestSession(logs *bytes.Buffer) *browserSession {
	return &browserSession{logger: slog.New(slog.NewTextHandler(logs, nil))}
}

func TestPageErrors_OneWarningPerRequest(t *testing.T) {
	var logs bytes.Buffer
	w := newTestSession(&logs)
	requestAttributes := telemetry.NewRequestAttributes()
	requestErrors := &pageErrors{attributes: requestAttributes}
	w.currentPageErrors.Store(requestErrors)

	sendPageErrors(w)
	sendPageErrors(w)
	if logs.Len() != 0 {
		t.Fatalf("logged while the request ran, want one record at its end:\n%s", logs.String())
	}
	w.currentPageErrors.Store(nil)
	w.logPageErrors(t.Context(), requestErrors)

	got := logs.String()
	if n := strings.Count(got, "\n"); n != 1 {
		t.Fatalf("logged %d records, want 1:\n%s", n, got)
	}
	want := `level=WARN msg="Page reported errors" ` +
		attr.PageConsoleErrors + `=2 ` + attr.PageBrowserErrors + `=2 ` + attr.PageJSExceptions + `=2 ` +
		attr.PageErrorCDPMethod + `=Runtime.consoleAPICalled ` + attr.PageErrorMessage + `="Failed to load Object"`
	if !strings.Contains(got, want) {
		t.Errorf("log = %q, want %q", got, want)
	}
	for _, leaked := range []string{"page data", "token=secret"} {
		if strings.Contains(got, leaked) {
			t.Errorf("log contains %q:\n%s", leaked, got)
		}
	}

	// The counts are on the request's attributes as soon as the errors arrive, before the
	// response ends the entry span.
	spans := tracetest.NewSpanRecorder()
	_, span := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(spans)).Tracer("test").Start(t.Context(), "entry")
	telemetry.SetOnSpan(span, requestAttributes)
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
		if counts[key] != 2 {
			t.Errorf("%s = %d, want 2", key, counts[key])
		}
	}
}

func TestPageErrors_FirstErrorIsTruncatedAndRedacted(t *testing.T) {
	var logs bytes.Buffer
	w := newTestSession(&logs)
	requestErrors := &pageErrors{attributes: telemetry.NewRequestAttributes()}
	w.currentPageErrors.Store(requestErrors)

	w.handleEvent("Log.entryAdded", map[string]any{"entry": map[string]any{
		"level": "error",
		"text":  strings.Repeat("x", 2000),
		"url":   "https://user:pass@app.local/ttd/app/api/data?token=secret#frag",
	}})
	w.logPageErrors(t.Context(), requestErrors)

	got := logs.String()
	if !strings.Contains(got, " "+attr.PageErrorSource+"=https://app.local/ttd/app/api/data") {
		t.Errorf("log = %q, want the source without user, query or fragment", got)
	}
	if strings.Contains(got, strings.Repeat("x", maxBrowserMessageLength+1)) {
		t.Errorf("message not truncated to %d bytes", maxBrowserMessageLength)
	}
	for _, leaked := range []string{"pass", "secret", "frag"} {
		if strings.Contains(got, leaked) {
			t.Errorf("log contains %q:\n%s", leaked, got)
		}
	}
}

func TestPageErrors_NoneOrLateLogNothing(t *testing.T) {
	var logs bytes.Buffer
	w := newTestSession(&logs)
	requestErrors := &pageErrors{attributes: telemetry.NewRequestAttributes()}

	// No errors while the request ran.
	w.currentPageErrors.Store(requestErrors)
	w.currentPageErrors.Store(nil)
	// An error that arrives after the request finished belongs to no request.
	sendPageErrors(w)
	w.logPageErrors(t.Context(), requestErrors)

	if logs.Len() != 0 {
		t.Errorf("logged %q, want nothing", logs.String())
	}
}

// TestPageErrors_LateErrorsDoNotRace sends page errors from another goroutine, as the CDP reader
// does, while requests start and finish. Run with -race.
func TestPageErrors_LateErrorsDoNotRace(t *testing.T) {
	var logs bytes.Buffer
	w := newTestSession(&logs)
	done := make(chan struct{})
	go func() {
		defer close(done)
		for range 200 {
			sendPageErrors(w)
		}
	}()

	records := 0
	for range 50 {
		requestErrors := &pageErrors{attributes: telemetry.NewRequestAttributes()}
		w.currentPageErrors.Store(requestErrors)
		w.currentPageErrors.Store(nil)
		before := logs.Len()
		w.logPageErrors(t.Context(), requestErrors)
		if logs.Len() != before {
			records++
		}
	}
	<-done
	if got := strings.Count(logs.String(), "\n"); got != records || records > 50 {
		t.Errorf("logged %d records for %d requests with errors, want at most one per request", got, records)
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
			want: `exception="Error: boom"`,
		},
		"other result": {
			data: map[string]any{"type": "object", "value": map[string]any{"secret": "page data"}},
			want: "payload_bytes=",
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
			requestErrors := &pageErrors{attributes: telemetry.NewRequestAttributes()}
			w.currentPageErrors.Store(requestErrors)
			w.handleEvent(tt.method, tt.event)
			w.logPageErrors(t.Context(), requestErrors)

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
	requestErrors := &pageErrors{attributes: telemetry.NewRequestAttributes()}
	w.currentPageErrors.Store(requestErrors)

	// The URL's query straddles the truncation point: redacting first leaves none of it.
	prefix := strings.Repeat("x", maxBrowserMessageLength-30)
	w.handleEvent("Log.entryAdded", map[string]any{"entry": map[string]any{
		"level": "error",
		"text":  prefix + " https://app.local/a?token=secret-value-that-is-long " + strings.Repeat("y", 100),
	}})
	w.logPageErrors(t.Context(), requestErrors)

	got := logs.String()
	if strings.Contains(got, "token") || strings.Contains(got, "secret") {
		t.Errorf("log contains the query: %q", got)
	}
	if !strings.Contains(got, prefix+" https://app.local/a ") || !strings.Contains(got, "...(truncated)") {
		t.Errorf("log = %q, want the redacted URL, then the message truncated", got)
	}
}
