package main

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/attribute"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"

	"altinn.studio/pdf3/internal/config"
	"altinn.studio/pdf3/internal/serviceowner"
	"altinn.studio/pdf3/internal/telemetry/attr"
	"altinn.studio/pdf3/internal/types"
)

// stubGenerator returns a fixed PDF, or err when it is set.
type stubGenerator struct {
	err *types.PDFError
}

func (g stubGenerator) Generate(context.Context, types.PdfRequest) (*types.PdfResult, *types.PDFError) {
	if g.err != nil {
		return nil, g.err
	}
	return &types.PdfResult{Data: []byte("%PDF-")}, nil
}

func (stubGenerator) Close() error { return nil }

func (stubGenerator) IsReady() bool { return true }

var errWriteFailed = errors.New("write failed")

// failingBodyWriter fails body writes so the handler logs through its request logger.
type failingBodyWriter struct {
	*httptest.ResponseRecorder
}

func (failingBodyWriter) Write([]byte) (int, error) { return 0, errWriteFailed }

func TestGeneratePdfHandlerLogsOnlyCurrentRequestURL(t *testing.T) {
	var logs bytes.Buffer
	handler := generatePdfHandler(slog.New(slog.NewTextHandler(&logs, nil)), stubGenerator{}, &config.Config{})

	for _, url := range []string{"http://example.com/first", "http://example.com/second"} {
		logs.Reset()
		body := strings.NewReader(`{"url":"` + url + `"}`)
		r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/generate", body)
		r.Header.Set("Content-Type", "application/json")
		handler(failingBodyWriter{httptest.NewRecorder()}, r)

		line := strings.TrimSpace(logs.String())
		if !strings.Contains(line, "Failed to write PDF response") {
			t.Fatalf("expected write failure log, got %q", line)
		}
		if got := strings.Count(line, " "+attr.RequestURL+"="); got != 1 {
			t.Fatalf("expected exactly one %s field, got %d in %q", attr.RequestURL, got, line)
		}
		if !strings.Contains(line, " "+attr.RequestURL+"="+url) {
			t.Fatalf("expected %s=%s in %q", attr.RequestURL, url, line)
		}
	}
}

func TestGeneratePdfHandlerLogsURLWithoutQueryOrFragment(t *testing.T) {
	var logs bytes.Buffer
	handler := generatePdfHandler(slog.New(slog.NewTextHandler(&logs, nil)), stubGenerator{}, &config.Config{})

	body := strings.NewReader(`{"url":"http://user:pass@example.com/ttd/app?token=secret#/instance/1"}`)
	r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/generate", body)
	r.Header.Set("Content-Type", "application/json")
	handler(failingBodyWriter{httptest.NewRecorder()}, r)

	line := logs.String()
	if !strings.Contains(line, " "+attr.RequestURL+"=http://example.com/ttd/app ") {
		t.Errorf("expected the URL without user, query or fragment in %q", line)
	}
	for _, leaked := range []string{"pass", "secret", "instance"} {
		if strings.Contains(line, leaked) {
			t.Errorf("log contains %q: %q", leaked, line)
		}
	}
}

// serviceOwnerGenerator records the service owner the generator gets the request for.
type serviceOwnerGenerator struct {
	stubGenerator

	got *string
}

func (g serviceOwnerGenerator) Generate(ctx context.Context, req types.PdfRequest) (*types.PdfResult, *types.PDFError) {
	*g.got = serviceowner.FromContext(ctx)
	return g.stubGenerator.Generate(ctx, req)
}

func TestGeneratePdfHandler_ServiceOwnerAndApp(t *testing.T) {
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
			name:             "config wins over header",
			configured:       "ttd",
			header:           "ikta",
			appHostname:      "tt02.altinn.no",
			url:              appPage,
			wantServiceOwner: "ttd",
			wantApp:          "my-app",
		},
		{
			name:             "header without config",
			header:           "ikta",
			appHostname:      "tt02.altinn.no",
			url:              appPage,
			wantServiceOwner: "ikta",
			wantApp:          "my-app",
		},
		{
			name:        "invalid header is ignored",
			header:      "IKTA",
			appHostname: "tt02.altinn.no",
			url:         appPage,
			wantApp:     "my-app",
		},
		{name: "unknown app hostname records no app", configured: "ttd", url: appPage, wantServiceOwner: "ttd"},
		{name: "page that isn't an app's", appHostname: "tt02.altinn.no", url: "https://example.com/ttd/my-app/"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			spans := tracetest.NewSpanRecorder()
			var gotServiceOwner string
			cfg := &config.Config{ServiceOwner: tt.configured, AppHostname: tt.appHostname}
			handler := otelhttp.NewHandler(
				generatePdfHandler(slog.New(slog.DiscardHandler), serviceOwnerGenerator{got: &gotServiceOwner}, cfg),
				"POST /generate",
				otelhttp.WithTracerProvider(sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(spans))),
			)
			body := strings.NewReader(`{"url":"` + tt.url + `"}`)
			r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/generate", body)
			r.Header.Set("Content-Type", "application/json")
			if tt.header != "" {
				r.Header.Set(serviceowner.Header, tt.header)
			}
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, r)

			if w.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200", w.Code)
			}
			if gotServiceOwner != tt.wantServiceOwner {
				t.Errorf("generator got service owner %q, want %q", gotServiceOwner, tt.wantServiceOwner)
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
