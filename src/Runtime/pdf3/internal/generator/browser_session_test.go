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

func TestHandleEvent_LogsBrowserErrorsWithoutPayloads(t *testing.T) {
	var logs bytes.Buffer
	w := &browserSession{
		ctx:    t.Context(),
		logger: slog.New(slog.NewTextHandler(&logs, nil)),
	}
	requestAttributes := telemetry.NewRequestAttributes()
	w.currentRequest.Store(&workerRequest{ctx: telemetry.WithRequestAttributes(t.Context(), requestAttributes)})

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
		"exception": map[string]any{"description": "TypeError: x is undefined\n    at main.js:1"},
	}})

	got := logs.String()
	for _, want := range []string{
		`level=WARN msg="Browser console error" cdp.method=Runtime.consoleAPICalled message="Failed to load Object"`,
		`level=WARN msg="Browser log error" cdp.method=Log.entryAdded message="Failed to load resource: 401" ` +
			`source=https://app.local/ttd/app/api/data`,
		`level=WARN msg="Browser JavaScript exception" cdp.method=Runtime.exceptionThrown ` +
			`message="TypeError: x is undefined\n    at main.js:1"`,
	} {
		if !strings.Contains(got, want) {
			t.Errorf("logs missing %q:\n%s", want, got)
		}
	}
	for _, leaked := range []string{"page data", "token=secret"} {
		if strings.Contains(got, leaked) {
			t.Errorf("logs contain %q:\n%s", leaked, got)
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
		"pdf.process.console_errors",
		"pdf.process.browser_errors",
		"pdf.process.js_exceptions",
	} {
		if counts[key] != 1 {
			t.Errorf("%s = %d, want 1", key, counts[key])
		}
	}
}

func TestLogBrowserError_CapsLogsPerRequest(t *testing.T) {
	var logs bytes.Buffer
	w := &browserSession{
		ctx:    t.Context(),
		logger: slog.New(slog.NewTextHandler(&logs, nil)),
	}
	for range maxBrowserLogsPerRequest + 3 {
		w.logBrowserError("Browser console error", "Runtime.consoleAPICalled", strings.Repeat("x", 2000), "")
	}

	if got := strings.Count(logs.String(), "\n"); got != maxBrowserLogsPerRequest {
		t.Errorf("logged %d browser errors, want %d", got, maxBrowserLogsPerRequest)
	}
	if got := w.browserLogsDropped.Load(); got != 3 {
		t.Errorf("dropped = %d, want 3", got)
	}
	if strings.Contains(logs.String(), strings.Repeat("x", maxBrowserMessageLength+1)) {
		t.Errorf("message not truncated to %d bytes", maxBrowserMessageLength)
	}
}
