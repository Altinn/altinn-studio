package main

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/attribute"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/metric/metricdata"

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
			handler := otelhttp.NewHandler(
				generatePdfHandler(slog.New(slog.DiscardHandler), stubGenerator{err: tt.err}),
				"POST /generate",
				otelhttp.WithMeterProvider(sdkmetric.NewMeterProvider(sdkmetric.WithReader(reader))),
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
		})
	}
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
