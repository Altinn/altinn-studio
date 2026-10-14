package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/attribute"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/metric/metricdata"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
)

// workerStub answers every worker request with status, and records the URL of each.
type workerStub struct {
	urls   []string
	status int
}

func (s *workerStub) RoundTrip(r *http.Request) (*http.Response, error) {
	var req struct {
		URL string `json:"url"`
	}
	err := json.NewDecoder(r.Body).Decode(&req)
	if closeErr := r.Body.Close(); closeErr != nil {
		return nil, fmt.Errorf("close worker request body: %w", closeErr)
	}
	if err != nil {
		return nil, fmt.Errorf("decode worker request: %w", err)
	}
	s.urls = append(s.urls, req.URL)
	return &http.Response{
		StatusCode: s.status,
		Header:     http.Header{},
		Body:       io.NopCloser(strings.NewReader("worker response")),
	}, nil
}

func TestGeneratePdf_URLKind(t *testing.T) {
	t.Parallel()

	const (
		tt02     = "tt02.altinn.no"
		appURL   = "https://ttd.apps.tt02.altinn.no/ttd/app/"
		instance = "instance/512345/0fc98a23-fe31-4ef5-8fb9-dd3f479354cd"
	)
	tests := []struct {
		name         string
		url          string
		appHostname  string
		wantKind     string
		wantReason   string
		workerStatus int
		wantStatus   int
		invalidJSON  bool
	}{
		{
			name:         "v9 standard page",
			url:          appURL + instance + "?pdf=1&lang=nb",
			appHostname:  tt02,
			workerStatus: http.StatusOK,
			wantStatus:   http.StatusOK,
			wantKind:     "standard",
		},
		{
			name:         "v8 standard page",
			url:          appURL + "#/" + instance + "?pdf=1&lang=nb",
			appHostname:  tt02,
			workerStatus: http.StatusOK,
			wantStatus:   http.StatusOK,
			wantKind:     "standard",
		},
		{
			name:         "custom app page, worker fails",
			url:          appURL + "custom?pdf=1",
			appHostname:  tt02,
			workerStatus: http.StatusInternalServerError,
			wantStatus:   http.StatusInternalServerError,
			wantKind:     "app_other",
		},
		{
			name:         "other host, worker rejects",
			url:          "https://example.com/ttd/app/" + instance + "?pdf=1",
			appHostname:  tt02,
			workerStatus: http.StatusBadRequest,
			wantStatus:   http.StatusBadRequest,
			wantKind:     "other",
			wantReason:   "host",
		},
		{
			name:         "org mismatch is served",
			url:          "https://ttd.apps.tt02.altinn.no/nav/app/" + instance + "?pdf=1",
			appHostname:  tt02,
			workerStatus: http.StatusOK,
			wantStatus:   http.StatusOK,
			wantKind:     "other",
			wantReason:   "org_mismatch",
		},
		{
			name:         "cluster local service is served",
			url:          "http://myapp.default.svc.cluster.local:5005/ttd/app/" + instance + "?pdf=1&lang=nb",
			appHostname:  tt02,
			workerStatus: http.StatusOK,
			wantStatus:   http.StatusOK,
			wantKind:     "cluster_local",
		},
		{
			name:        "request that fails validation",
			url:         "",
			appHostname: tt02,
			wantStatus:  http.StatusBadRequest,
			wantKind:    "other",
			wantReason:  "scheme",
		},
		{
			name:        "unparsable body",
			invalidJSON: true,
			appHostname: tt02,
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:         "unknown app hostname",
			url:          appURL + instance + "?pdf=1&lang=nb",
			workerStatus: http.StatusOK,
			wantStatus:   http.StatusOK,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			reader := sdkmetric.NewManualReader()
			spans := tracetest.NewSpanRecorder()
			logger := slog.New(slog.DiscardHandler)
			worker := &workerStub{status: tt.workerStatus}
			client := &http.Client{Transport: worker}
			handler := otelhttp.NewHandler(
				http.HandlerFunc(generatePdf(logger, client, "http://worker", tt.appHostname)),
				"POST /pdf",
				otelhttp.WithMeterProvider(sdkmetric.NewMeterProvider(sdkmetric.WithReader(reader))),
				otelhttp.WithTracerProvider(sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(spans))),
			)

			body := `{`
			if !tt.invalidJSON {
				encoded, err := json.Marshal(map[string]string{"url": tt.url})
				if err != nil {
					t.Fatal(err)
				}
				body = string(encoded)
			}
			request := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/pdf", strings.NewReader(body))
			request.Header.Set("Content-Type", "application/json")
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)

			if response.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", response.Code, tt.wantStatus)
			}
			var wantForwarded []string
			if tt.workerStatus != 0 {
				wantForwarded = []string{tt.url}
			}
			if !slices.Equal(worker.urls, wantForwarded) {
				t.Errorf("URLs forwarded to the worker = %q, want %q", worker.urls, wantForwarded)
			}
			want := fmt.Sprintf("%d/%s", tt.wantStatus, tt.wantKind)
			if got := requestDurationByURLKind(t, reader); len(got) != 1 || got[want] != 1 {
				t.Errorf("http.server.request.duration by status/%s = %v, want {%s: 1}", urlKindKey, got, want)
			}
			ended := spans.Ended()
			if len(ended) != 1 {
				t.Fatalf("ended spans = %d, want 1", len(ended))
			}
			attrs := attribute.NewSet(ended[0].Attributes()...)
			if got, _ := attrs.Value(urlKindKey); got.AsString() != tt.wantKind {
				t.Errorf("span %s = %q, want %q", urlKindKey, got.AsString(), tt.wantKind)
			}
			if got, _ := attrs.Value(urlRejectionKey); got.AsString() != tt.wantReason {
				t.Errorf("span %s = %q, want %q", urlRejectionKey, got.AsString(), tt.wantReason)
			}
		})
	}
}

// requestDurationByURLKind counts the http.server.request.duration measurements by
// "status/altinn.pdf.url_kind".
func requestDurationByURLKind(t *testing.T, reader *sdkmetric.ManualReader) map[string]uint64 {
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
				kind, _ := point.Attributes.Value(urlKindKey)
				got[fmt.Sprintf("%d/%s", status.AsInt64(), kind.AsString())] += point.Count
			}
		}
	}
	return got
}
