package main

import (
	"bytes"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/attribute"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"

	"altinn.studio/pdf3/internal/serviceowner"
	"altinn.studio/pdf3/internal/telemetry/attr"
)

var errWorkerUnreachable = errors.New("worker unreachable")

type failingTransport struct{}

func (failingTransport) RoundTrip(*http.Request) (*http.Response, error) {
	return nil, errWorkerUnreachable
}

func TestCallWorker_LogsRetriesAtInfoAndExhaustionAtError(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	client := &http.Client{Transport: failingTransport{}}
	r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/pdf", nil)
	const maxRetries = 2

	w := httptest.NewRecorder()
	if done := callWorker(
		logger,
		t.Context(),
		client,
		"http://worker/generate",
		r,
		w,
		time.Now(),
		1,
		maxRetries,
		nil,
		"",
	); done {
		t.Fatal("callWorker() = true on a retryable failure, want a retry")
	}
	if got := logs.String(); !strings.Contains(got, `level=INFO msg="Worker request failed, will retry"`) {
		t.Errorf("retry log = %q, want it at INFO", got)
	}

	logs.Reset()
	if done := callWorker(
		logger,
		t.Context(),
		client,
		"http://worker/generate",
		r,
		w,
		time.Now(),
		maxRetries,
		maxRetries,
		nil,
		"",
	); !done {
		t.Fatal("callWorker() = false on the last attempt, want it to give up")
	}
	if got := logs.String(); !strings.Contains(got, `level=ERROR msg="Error calling PDF worker"`) {
		t.Errorf("last attempt log = %q, want an error", got)
	}
	if w.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", w.Code)
	}
}

// headerRecorder answers every worker request with a PDF and records the request's headers.
type headerRecorder struct {
	got *http.Header
}

func (h headerRecorder) RoundTrip(r *http.Request) (*http.Response, error) {
	*h.got = r.Header.Clone()
	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{},
		Body:       io.NopCloser(strings.NewReader("%PDF-")),
	}, nil
}

func TestGeneratePdf_ServiceOwnerAndApp(t *testing.T) {
	t.Parallel()

	const appPage = "https://ttd.apps.tt02.altinn.no/ttd/my-app/instance/512345/0fc98a23?pdf=1"
	tests := []struct {
		name             string
		configured       string
		header           string
		appHostname      string
		url              string
		wantServiceOwner string
		wantApp          string
	}{
		{
			name:             "header and app page",
			header:           "ttd",
			appHostname:      "tt02.altinn.no",
			url:              appPage,
			wantServiceOwner: "ttd",
			wantApp:          "my-app",
		},
		{
			name:             "configured service owner wins over the header",
			configured:       "ttd",
			header:           "ikta",
			appHostname:      "tt02.altinn.no",
			url:              appPage,
			wantServiceOwner: "ttd",
			wantApp:          "my-app",
		},
		{
			name:             "configured service owner without a header",
			configured:       "ttd",
			appHostname:      "tt02.altinn.no",
			url:              appPage,
			wantServiceOwner: "ttd",
			wantApp:          "my-app",
		},
		{name: "no header", appHostname: "tt02.altinn.no", url: appPage, wantApp: "my-app"},
		{name: "invalid header", header: "TTD", appHostname: "tt02.altinn.no", url: appPage, wantApp: "my-app"},
		{name: "unknown app hostname", header: "ttd", url: appPage, wantServiceOwner: "ttd"},
		{name: "page that isn't an app's", appHostname: "tt02.altinn.no", url: "https://example.com/ttd/my-app/"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			spans := tracetest.NewSpanRecorder()
			var workerHeader http.Header
			client := &http.Client{Transport: headerRecorder{got: &workerHeader}}
			handler := otelhttp.NewHandler(
				http.HandlerFunc(generatePdf(
					slog.New(slog.DiscardHandler),
					client,
					"http://worker",
					tt.appHostname,
					tt.configured,
				)),
				"POST /pdf",
				otelhttp.WithTracerProvider(sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(spans))),
			)
			r := httptest.NewRequestWithContext(
				t.Context(),
				http.MethodPost,
				"/pdf",
				strings.NewReader(`{"url":"`+tt.url+`"}`),
			)
			r.Header.Set("Content-Type", "application/json")
			if tt.header != "" {
				r.Header.Set(serviceowner.Header, tt.header)
			}
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, r)

			if w.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200", w.Code)
			}
			if got := workerHeader.Get(serviceowner.Header); got != tt.wantServiceOwner {
				t.Errorf("worker got %s %q, want %q", serviceowner.Header, got, tt.wantServiceOwner)
			}
			attrs := attribute.NewSet(spans.Ended()[0].Attributes()...)
			for key, want := range map[string]string{attr.ServiceOwner: tt.wantServiceOwner, attr.App: tt.wantApp} {
				got, found := attrs.Value(attribute.Key(key))
				if want == "" && found {
					t.Errorf("span %s = %q, want none", key, got.AsString())
				}
				if want != "" && got.AsString() != want {
					t.Errorf("span %s = %q, want %q", key, got.AsString(), want)
				}
			}
		})
	}
}
