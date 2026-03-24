package generator

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	"go.opentelemetry.io/otel"

	"altinn.studio/pdf3/internal/pdfa"
	"altinn.studio/pdf3/internal/types"
	"altinn.studio/pdf3/test/harness"
)

func TestPostProcessPDFConvertsWhenPDFAIsEnabled(t *testing.T) {
	input := loadPDFAFixture(t)

	g := &Custom{
		convertToPDFA: true,
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

func TestGenerateAppliesPDFAByGate(t *testing.T) {
	input := loadPDFAFixture(t)

	tests := []struct {
		name          string
		convertToPDFA bool
		wantEqual     bool
	}{
		{
			name:          "disabled returns raw pdf",
			convertToPDFA: false,
			wantEqual:     true,
		},
		{
			name:          "enabled converts pdf",
			convertToPDFA: true,
			wantEqual:     false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			g := newTestGenerator(tc.convertToPDFA, input)

			result, pdfErr := g.Generate(context.Background(), types.PdfRequest{URL: "https://example.com"})
			if pdfErr != nil {
				t.Fatalf("Generate() error = %v", pdfErr)
			}

			gotEqual := string(result.Data) == string(input)
			if gotEqual != tc.wantEqual {
				t.Fatalf("Generate() raw equality = %v, want %v", gotEqual, tc.wantEqual)
			}
			if tc.convertToPDFA && !strings.Contains(string(result.Data), "pdfaid:part") {
				t.Fatalf("Generate() output does not contain PDF/A metadata")
			}
		})
	}
}

func TestGenerateFallsBackToOriginalPDFWhenPDFAConversionFails(t *testing.T) {
	input := []byte("not-a-pdf")
	g := newTestGenerator(true, input)

	result, pdfErr := g.Generate(context.Background(), types.PdfRequest{URL: "https://example.com"})
	if pdfErr != nil {
		t.Fatalf("Generate() error = %v", pdfErr)
	}
	if string(result.Data) != string(input) {
		t.Fatalf("Generate() did not fall back to the original payload")
	}
}

func loadPDFAFixture(t *testing.T) []byte {
	t.Helper()

	projectRoot, err := harness.FindProjectRoot()
	if err != nil {
		t.Fatalf("FindProjectRoot() error = %v", err)
	}
	inputPath := filepath.Join(projectRoot, "internal", "pdfa", "testdata", "pdfa-conversion-input.pdf")
	input, err := os.ReadFile(inputPath)
	if err != nil {
		t.Fatalf("ReadFile() error = %v", err)
	}
	return input
}

func newTestGenerator(convertToPDFA bool, responseData []byte) *Custom {
	g := &Custom{
		logger:        slog.New(slog.DiscardHandler),
		convertToPDFA: convertToPDFA,
		tracer:        otel.Tracer("test"),
	}
	if convertToPDFA {
		g.pdfaConverter = pdfa.NewConverter()
	}

	session := &browserSession{queue: make(chan workerRequest, 1)}
	g.activeSession = atomic.Pointer[browserSession]{}
	g.activeSession.Store(session)

	go func() {
		req := <-session.queue
		req.tryRespondOk(responseData)
	}()

	return g
}
