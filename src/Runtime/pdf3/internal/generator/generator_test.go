package generator

import (
	"bytes"
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"

	"altinn.studio/pdf3/internal/config"
	"altinn.studio/pdf3/internal/pdfa"
	"altinn.studio/pdf3/internal/serviceowner"
	"altinn.studio/pdf3/internal/telemetry"
	"altinn.studio/pdf3/internal/telemetry/attr"
	"altinn.studio/pdf3/internal/types"
)

func TestPostProcessPDFConvertsWhenPDFAIsEnabled(t *testing.T) {
	input := loadPDFAFixture(t)

	g := &Custom{
		pdfaConverter: pdfa.NewConverter(),
		tracer:        otel.Tracer("test"),
	}

	got, pdfErr := g.postProcessPDF(context.Background(), input)
	if pdfErr != nil {
		t.Fatalf("postProcessPDF() error = %v", pdfErr)
	}
	if string(got) == string(input) {
		t.Fatalf("postProcessPDF() did not modify the PDF")
	}
	if !strings.Contains(string(got), "pdfaid:part") {
		t.Fatalf("postProcessPDF() output does not contain PDF/A metadata")
	}
}

func TestGenerateAppliesPDFAByServiceOwner(t *testing.T) {
	input := loadPDFAFixture(t)

	tests := []struct {
		name         string
		environment  string
		serviceOwner string
		wantPDFA     bool
	}{
		{name: "configured service owner converts pdf", environment: "tt02", serviceOwner: "ikta", wantPDFA: true},
		{name: "other service owner returns raw pdf", environment: "tt02", serviceOwner: "ttd"},
		{
			name:         "configured service owner in another environment returns raw pdf",
			environment:  "at22",
			serviceOwner: "ikta",
		},
		{name: "unknown service owner returns raw pdf", environment: "tt02"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			g := newTestGenerator(tc.environment, input)
			data := telemetry.NewRequestAttributes()
			ctx := telemetry.WithRequestAttributes(context.Background(), data)
			if tc.serviceOwner != "" {
				ctx = serviceowner.WithContext(ctx, tc.serviceOwner)
			}

			result, pdfErr := g.Generate(ctx, types.PdfRequest{URL: "https://example.com"})
			if pdfErr != nil {
				t.Fatalf("Generate() error = %v", pdfErr)
			}

			converted := string(result.Data) != string(input)
			if converted != tc.wantPDFA {
				t.Fatalf("Generate() converted = %v, want %v", converted, tc.wantPDFA)
			}
			if tc.wantPDFA && !strings.Contains(string(result.Data), "pdfaid:part") {
				t.Fatalf("Generate() output does not contain PDF/A metadata")
			}
			span := recordAttributes(t, data)
			if got := span[attribute.Key(attr.ConvertToPDFAEnabled)].AsBool(); got != tc.wantPDFA {
				t.Errorf("%s = %v, want %v", attr.ConvertToPDFAEnabled, got, tc.wantPDFA)
			}
		})
	}
}

func TestGenerateFallsBackToOriginalPDFWhenPDFAConversionFails(t *testing.T) {
	input := []byte("not-a-pdf")
	g := newTestGenerator("tt02", input)

	ctx := serviceowner.WithContext(context.Background(), "ikta")
	result, pdfErr := g.Generate(ctx, types.PdfRequest{URL: "https://example.com"})
	if pdfErr != nil {
		t.Fatalf("Generate() error = %v", pdfErr)
	}
	if string(result.Data) != string(input) {
		t.Fatalf("Generate() did not fall back to the original payload")
	}
}

// recordAttributes returns the request attributes as they end up on the request's entry span.
func recordAttributes(t *testing.T, data *telemetry.RequestAttributes) map[attribute.Key]attribute.Value {
	t.Helper()
	spans := tracetest.NewSpanRecorder()
	_, span := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(spans)).Tracer("test").Start(t.Context(), "entry")
	telemetry.SetOnSpan(span, data)
	span.End()
	got := map[attribute.Key]attribute.Value{}
	for _, kv := range spans.Ended()[0].Attributes() {
		got[kv.Key] = kv.Value
	}
	return got
}

func loadPDFAFixture(t *testing.T) []byte {
	t.Helper()

	inputPath := filepath.Join("..", "pdfa", "testdata", "pdfa-conversion-input.pdf")
	input, err := os.ReadFile(inputPath)
	if err != nil {
		t.Fatalf("ReadFile() error = %v", err)
	}
	return input
}

// newTestGenerator returns a generator in environment that converts ikta's PDFs to PDF/A in tt02.
func newTestGenerator(environment string, responseData []byte) *Custom {
	g := &Custom{
		logger:        slog.New(slog.DiscardHandler),
		tracer:        otel.Tracer("test"),
		pdfaConverter: pdfa.NewConverter(),
		environment:   environment,
		pdfa: config.PDFAConversionConfig{
			Targets: []config.PDFATarget{{Environment: "tt02", ServiceOwner: "ikta"}},
		},
	}

	session := &browserSession{queue: make(chan workerRequest, 1)}
	g.session.Store(session)

	go func() {
		req := <-session.queue
		req.tryRespondOk(responseData)
	}()

	return g
}

func TestWorkerRequest_AbandonedResponseLogsAtInfo(t *testing.T) {
	for name, respond := range map[string]func(*workerRequest){
		"ok":    func(r *workerRequest) { r.tryRespondOk([]byte("%PDF-")) },
		"error": func(r *workerRequest) { r.tryRespondError(types.NewPDFError(types.ErrTimeout, "", nil)) },
	} {
		t.Run(name, func(t *testing.T) {
			var logs bytes.Buffer
			// Nobody receives from the responder: the client has given up.
			req := &workerRequest{
				ctx:       t.Context(),
				responder: make(chan workerResponse),
				logger:    slog.New(slog.NewTextHandler(&logs, nil)),
			}
			respond(req)

			if got := logs.String(); !strings.Contains(got, `level=INFO msg="Client abandoned request`) {
				t.Errorf("log = %q, want the abandoned response at INFO", got)
			}
		})
	}
}
