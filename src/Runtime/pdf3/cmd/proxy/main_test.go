package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/attribute"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"

	"altinn.studio/pdf3/internal/config"
	ihttp "altinn.studio/pdf3/internal/http"
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

// TestGeneratePdf_OversizedBody pins how the proxy answers a body over its limit, which the relay
// must answer the same way (TestRelayAnswersOversizedBodiesAsTheProxy in cmd/relay).
func TestGeneratePdf_OversizedBody(t *testing.T) {
	t.Parallel()

	oversized := `{"url":"https://ttd.apps.tt02.altinn.no/` + strings.Repeat("x", 64*1024) + `"}`
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
			t.Parallel()

			handler := generatePdf(
				slog.New(slog.DiscardHandler),
				&http.Client{Transport: failingTransport{}},
				"http://worker",
				"",
				"",
			)
			r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/pdf", strings.NewReader(oversized))
			r.Header.Set("Content-Type", tt.contentType)
			r.ContentLength = tt.contentLength
			w := httptest.NewRecorder()
			handler(w, r)

			var got ihttp.ProblemDetails
			if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
				t.Fatalf("Unmarshal(%q) error = %v", w.Body.String(), err)
			}
			if w.Code != tt.want.Status || !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("response = %d %+v, want %+v", w.Code, got, tt.want)
			}
		})
	}
}

// loadAPIKeysEnv makes the test binary run loadAPIKeys, so TestLoadAPIKeys sees whether it exits.
const loadAPIKeysEnv = "PDF3_TEST_LOAD_API_KEYS"

// TestLoadAPIKeys checks that a proxy shared by all service owners, one in an environment without
// PDF3_SERVICEOWNER, refuses to start without API keys, and that every other proxy starts as before.
func TestLoadAPIKeys(t *testing.T) {
	t.Parallel()
	if os.Getenv(loadAPIKeysEnv) != "" {
		loadAPIKeys(slog.New(slog.NewTextHandler(os.Stderr, nil)), config.ReadConfig())
		return
	}

	keyFile := filepath.Join(t.TempDir(), "keys")
	if err := os.WriteFile(keyFile, []byte("core-key\n"), 0o600); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
	tests := []struct {
		name         string
		environment  string
		serviceOwner string
		apiKeysFile  string
		wantExit     bool
	}{
		{name: "shared cluster without keys", environment: "tt02", wantExit: true},
		{name: "shared cluster with keys", environment: "tt02", apiKeysFile: keyFile},
		{name: "tenant cluster", environment: "tt02", serviceOwner: "ttd"},
		{name: "local cluster", environment: "local"},
		{name: "localtest", environment: config.EnvironmentLocaltest},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			cmd := exec.CommandContext(t.Context(), os.Args[0], "-test.run=^TestLoadAPIKeys$")
			cmd.Env = append(
				os.Environ(),
				loadAPIKeysEnv+"=1",
				"PDF3_ENVIRONMENT="+tt.environment,
				config.ServiceOwnerEnv+"="+tt.serviceOwner,
				config.APIKeysFileEnv+"="+tt.apiKeysFile,
			)
			output, err := cmd.CombinedOutput()
			var exitErr *exec.ExitError
			exited := errors.As(err, &exitErr) && exitErr.ExitCode() == 1
			if exited != tt.wantExit || (!tt.wantExit && err != nil) {
				t.Fatalf("exited = %v (%v), want %v; output: %s", exited, err, tt.wantExit, output)
			}
			if tt.wantExit && !strings.Contains(string(output), "level=ERROR msg=\"PDF3_API_KEYS_FILE must be set") {
				t.Fatalf("output = %s, want the error logged", output)
			}
		})
	}
}
