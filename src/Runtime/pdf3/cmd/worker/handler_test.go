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
	handler := generatePdfHandler(slog.New(slog.NewTextHandler(&logs, nil)), stubGenerator{})

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
