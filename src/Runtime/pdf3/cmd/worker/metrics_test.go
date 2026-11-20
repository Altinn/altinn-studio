package main

import (
	"bytes"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/metric/metricdata"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"

	"altinn.studio/pdf3/internal/config"
	"altinn.studio/pdf3/internal/telemetry/attr"
	"altinn.studio/pdf3/internal/types"
)

func TestGeneratePdfHandler_ErrorType(t *testing.T) {
	t.Parallel()

	const failed = http.StatusInternalServerError
	tests := []struct {
		err           *types.PDFError
		name          string
		wantErrorType string
		invalidJSON   bool
		wantStatus    int
	}{
		{name: "success", wantStatus: http.StatusOK},
		{name: "invalid request", invalidJSON: true, wantStatus: http.StatusBadRequest},
		{name: "queue full", err: pdfError(types.ErrQueueFull), wantStatus: http.StatusTooManyRequests},
		{name: "timeout", err: pdfError(types.ErrTimeout), wantStatus: failed, wantErrorType: "timeout"},
		{name: "dropped", err: pdfError(types.ErrClientDropped), wantStatus: failed, wantErrorType: "client_dropped"},
		{name: "cookie", err: pdfError(types.ErrSetCookieFail), wantStatus: failed, wantErrorType: "set_cookie_failed"},
		{
			name:          "element",
			err:           pdfError(types.ErrElementNotReady),
			wantStatus:    failed,
			wantErrorType: "element_not_ready",
		},
		{
			name:          "generation",
			err:           pdfError(types.ErrGenerationFail),
			wantStatus:    failed,
			wantErrorType: "generation_failed",
		},
		{
			name:          "browser",
			err:           pdfError(types.ErrUnhandledBrowserError),
			wantStatus:    failed,
			wantErrorType: "unhandled_browser_error",
		},
		{name: "unknown", err: pdfError(errUnknown), wantStatus: failed, wantErrorType: "_OTHER"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			reader := sdkmetric.NewManualReader()
			spans := tracetest.NewSpanRecorder()
			var logs bytes.Buffer
			handler := otelhttp.NewHandler(
				generatePdfHandler(
					slog.New(slog.NewTextHandler(&logs, nil)),
					stubGenerator{err: tt.err},
					&config.Config{},
				),
				"POST /generate",
				otelhttp.WithMeterProvider(sdkmetric.NewMeterProvider(sdkmetric.WithReader(reader))),
				otelhttp.WithTracerProvider(sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(spans))),
			)
			body := `{}`
			if tt.invalidJSON {
				body = `{`
			}
			request := httptest.NewRequestWithContext(
				t.Context(),
				http.MethodPost,
				"/generate",
				strings.NewReader(body),
			)
			request.Header.Set("Content-Type", "application/json")
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)

			if response.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", response.Code, tt.wantStatus)
			}
			want := fmt.Sprintf("%d/%s", tt.wantStatus, tt.wantErrorType)
			if got := requestDurationOutcomes(t, reader); len(got) != 1 || got[want] != 1 {
				t.Errorf("http.server.request.duration by status/error.type = %v, want {%s: 1}", got, want)
			}
			assertEntrySpanOutcome(t, spans, tt.wantErrorType)
			if tt.invalidJSON {
				assertEntrySpanAttribute(t, spans, attr.ResponseRejectionReason, "invalid_json")
			} else {
				assertEntrySpanAttribute(t, spans, attr.RequestWaitForType, "load_event")
			}
			failedLogged := strings.Contains(logs.String(), `level=ERROR msg="PDF generation failed"`) &&
				strings.Contains(logs.String(), " error.type="+tt.wantErrorType+" ")
			if failedLogged != (tt.wantErrorType != "") {
				t.Errorf("failed generation logged = %v, want %v; logs: %s", failedLogged, !failedLogged, logs.String())
			}
		})
	}
}

// assertEntrySpanOutcome checks that a failed generation marks the entry span with error.type
// and an error status, and that other outcomes leave both unset.
func assertEntrySpanOutcome(t *testing.T, spans *tracetest.SpanRecorder, wantErrorType string) {
	t.Helper()
	ended := spans.Ended()
	if len(ended) != 1 {
		t.Fatalf("ended spans = %d, want 1", len(ended))
	}
	span := ended[0]
	var errorType string
	for _, kv := range span.Attributes() {
		if kv.Key == semconv.ErrorTypeKey {
			errorType = kv.Value.AsString()
		}
	}
	if errorType != wantErrorType {
		t.Errorf("entry span error.type = %q, want %q", errorType, wantErrorType)
	}
	wantStatus := codes.Unset
	if wantErrorType != "" {
		wantStatus = codes.Error
	}
	if got := span.Status().Code; got != wantStatus {
		t.Errorf("entry span status = %v, want %v", got, wantStatus)
	}
	if events := span.Events(); len(events) != 0 {
		t.Errorf("entry span events = %v, want none: the request's details are attributes", events)
	}
}

// assertEntrySpanAttribute checks that the request's details are attributes on its entry span.
func assertEntrySpanAttribute(t *testing.T, spans *tracetest.SpanRecorder, key attribute.Key, want string) {
	t.Helper()
	for _, span := range spans.Ended() {
		for _, kv := range span.Attributes() {
			if kv.Key == key {
				if got := kv.Value.String(); got != want {
					t.Errorf("entry span %s = %q, want %q", key, got, want)
				}
				return
			}
		}
	}
	t.Errorf("entry span has no %s attribute", key)
}

var errUnknown = errors.New("unknown")

func pdfError(errType error) *types.PDFError {
	return types.NewPDFError(errType, "", nil)
}

// requestDurationOutcomes counts the http.server.request.duration measurements by
// "status/error.type".
func requestDurationOutcomes(t *testing.T, reader *sdkmetric.ManualReader) map[string]uint64 {
	t.Helper()
	var data metricdata.ResourceMetrics
	if err := reader.Collect(t.Context(), &data); err != nil {
		t.Fatalf("Collect() error = %v", err)
	}
	got := map[string]uint64{}
	for _, scope := range data.ScopeMetrics {
		for _, m := range scope.Metrics {
			histogram, ok := m.Data.(metricdata.Histogram[float64])
			if m.Name != "http.server.request.duration" || !ok {
				continue
			}
			for _, point := range histogram.DataPoints {
				status, _ := point.Attributes.Value(attribute.Key("http.response.status_code"))
				errorType, _ := point.Attributes.Value(attribute.Key("error.type"))
				got[fmt.Sprintf("%d/%s", status.AsInt64(), errorType.AsString())] += point.Count
			}
		}
	}
	return got
}
