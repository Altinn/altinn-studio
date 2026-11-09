package main

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWorkerHealthNeedsAReadyWorker(t *testing.T) {
	tests := []struct {
		name   string
		worker int
		want   int
	}{
		{name: "ready", worker: http.StatusOK, want: http.StatusOK},
		{name: "not ready", worker: http.StatusServiceUnavailable, want: http.StatusServiceUnavailable},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var path string
			worker := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				path = r.URL.Path
				w.WriteHeader(tt.worker)
			}))
			t.Cleanup(worker.Close)

			w := httptest.NewRecorder()
			workerHealth(slog.New(slog.DiscardHandler), worker.URL, func() bool { return false })(
				w, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/pdf/health", nil),
			)

			if w.Code != tt.want || path != "/health/ready" {
				t.Fatalf("status = %d, want %d; worker got %q", w.Code, tt.want, path)
			}
		})
	}
}

func TestWorkerHealthIsUnavailableWithoutWorkers(t *testing.T) {
	worker := httptest.NewServer(http.NotFoundHandler())
	url := worker.URL
	worker.Close()

	w := httptest.NewRecorder()
	workerHealth(slog.New(slog.DiscardHandler), url, func() bool { return false })(
		w, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/pdf/health", nil),
	)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusServiceUnavailable)
	}
}
