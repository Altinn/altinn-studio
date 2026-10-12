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

	"altinn.studio/pdf3/internal/types"
)

type stubGenerator struct{}

func (stubGenerator) Generate(context.Context, types.PdfRequest) (*types.PdfResult, *types.PDFError) {
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
	handler := generatePdfHandler(slog.New(slog.NewTextHandler(&logs, nil)), stubGenerator{})

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
		if got := strings.Count(line, " url="); got != 1 {
			t.Fatalf("expected exactly one url field, got %d in %q", got, line)
		}
		if !strings.Contains(line, " url="+url) {
			t.Fatalf("expected url=%s in %q", url, line)
		}
	}
}
