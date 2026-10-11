package auth

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"go.opentelemetry.io/otel/attribute"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"

	"altinn.studio/pdf3/internal/telemetry/attr"
)

func writeKeys(t *testing.T, path string, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
}

func loadKeys(t *testing.T, content string) (*KeyFile, string) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "keys")
	writeKeys(t, path, content)
	keys, err := Load(slog.New(slog.DiscardHandler), path)
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	return keys, path
}

func TestValid(t *testing.T) {
	keys, _ := loadKeys(t, "# rotated 2026-10\nnew-key\n\n  old-key  \n")

	for token, want := range map[string]bool{
		"new-key":           true,
		"old-key":           true,
		"":                  false,
		"new-ke":            false,
		"new-key2":          false,
		"# rotated 2026-10": false,
	} {
		if got := keys.Valid(token); got != want {
			t.Errorf("Valid(%q) = %v, want %v", token, got, want)
		}
	}
	if got := keys.First(); got != "new-key" {
		t.Errorf("First() = %q, want new-key", got)
	}
}

func TestLoadFailsWithoutKeys(t *testing.T) {
	path := filepath.Join(t.TempDir(), "keys")
	writeKeys(t, path, "# no keys\n\n")
	if _, err := Load(slog.New(slog.DiscardHandler), path); err == nil {
		t.Fatal("Load() succeeded for a file without keys")
	}
	if _, err := Load(slog.New(slog.DiscardHandler), filepath.Join(t.TempDir(), "missing")); err == nil {
		t.Fatal("Load() succeeded for a missing file")
	}
}

func TestReloadOnChange(t *testing.T) {
	keys, path := loadKeys(t, "old-key\n")

	writeKeys(t, path, "new-key\nold-key\n")
	if changed, err := keys.reload(); err != nil || !changed {
		t.Fatalf("reload() = %v, %v, want true, nil", changed, err)
	}
	if !keys.Valid("new-key") || !keys.Valid("old-key") {
		t.Fatal("both keys must be valid during rotation")
	}

	writeKeys(t, path, "new-key\n")
	// Give the file a distinct modification time even on coarse filesystem clocks.
	future := time.Now().Add(time.Minute)
	if err := os.Chtimes(path, future, future); err != nil {
		t.Fatalf("Chtimes() error = %v", err)
	}
	if changed, err := keys.reload(); err != nil || !changed {
		t.Fatalf("reload() = %v, %v, want true, nil", changed, err)
	}
	if keys.Valid("old-key") {
		t.Fatal("removed key is still valid")
	}
}

func TestReloadKeepsKeysWhenFileBreaks(t *testing.T) {
	keys, path := loadKeys(t, "key\n")

	writeKeys(t, path, "\n\n# emptied by mistake\n")
	if _, err := keys.reload(); err == nil {
		t.Fatal("reload() succeeded for a file without keys")
	}
	if err := os.Remove(path); err != nil {
		t.Fatalf("Remove() error = %v", err)
	}
	if _, err := keys.reload(); err == nil {
		t.Fatal("reload() succeeded for a missing file")
	}
	if !keys.Valid("key") {
		t.Fatal("keys must be kept when the file can't be used")
	}
}

func TestWatchStopsWithContext(t *testing.T) {
	keys, _ := loadKeys(t, "key\n")
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		keys.Watch(ctx, time.Millisecond)
		close(done)
	}()
	cancel()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("Watch() did not stop")
	}
}

func TestRequireAPIKey(t *testing.T) {
	keys, _ := loadKeys(t, "secret\n")
	handler := RequireAPIKey(slog.New(slog.DiscardHandler), keys, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	for header, want := range map[string]int{
		"Bearer secret": http.StatusOK,
		"bearer secret": http.StatusOK,
		"Bearer wrong":  http.StatusUnauthorized,
		"Basic secret":  http.StatusUnauthorized,
		"secret":        http.StatusUnauthorized,
		"":              http.StatusUnauthorized,
	} {
		req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/pdf", nil)
		if header != "" {
			req.Header.Set("Authorization", header)
		}
		rec := httptest.NewRecorder()
		handler(rec, req)
		if rec.Code != want {
			t.Errorf("Authorization %q: status = %d, want %d", header, rec.Code, want)
		}
		if want == http.StatusUnauthorized && rec.Header().Get("WWW-Authenticate") != "Bearer" {
			t.Errorf("Authorization %q: missing WWW-Authenticate header", header)
		}
	}
}

func TestRequireAPIKeyRecordsRejectionOnSpan(t *testing.T) {
	keys, _ := loadKeys(t, "secret\n")
	handler := RequireAPIKey(slog.New(slog.DiscardHandler), keys, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	for header, want := range map[string]string{"Bearer secret": "", "Bearer wrong": "unauthorized"} {
		spans := tracetest.NewSpanRecorder()
		ctx, span := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(spans)).
			Tracer("test").
			Start(t.Context(), "POST /pdf")
		req := httptest.NewRequestWithContext(ctx, http.MethodPost, "/pdf", nil)
		req.Header.Set("Authorization", header)
		handler(httptest.NewRecorder(), req)
		span.End()

		attrs := attribute.NewSet(spans.Ended()[0].Attributes()...)
		got, _ := attrs.Value(attr.ResponseRejectionReason)
		if got.AsString() != want {
			t.Errorf("Authorization %q: %s = %q, want %q", header, attr.ResponseRejectionReason, got.AsString(), want)
		}
	}
}
