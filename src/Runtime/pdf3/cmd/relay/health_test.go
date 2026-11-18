package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRelayHealthChecksTheSharedPdf3WithItsAPIKey(t *testing.T) {
	tests := []struct {
		name     string
		upstream int
		want     int
	}{
		{name: "available", upstream: http.StatusOK, want: http.StatusOK},
		{name: "wrong API key", upstream: http.StatusUnauthorized, want: http.StatusServiceUnavailable},
		{name: "no worker ready", upstream: http.StatusServiceUnavailable, want: http.StatusServiceUnavailable},
		{name: "no health endpoint", upstream: http.StatusNotFound, want: http.StatusServiceUnavailable},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var method, path, authorization string
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				method, path, authorization = r.Method, r.URL.Path, r.Header.Get("Authorization")
				w.WriteHeader(tt.upstream)
			}))
			t.Cleanup(upstream.Close)
			rl := newTestRelay(t, upstream.URL+"/pdf/v3")

			w := httptest.NewRecorder()
			rl.handleHealth(w, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/pdf/health", nil))

			if w.Code != tt.want {
				t.Fatalf("status = %d, want %d", w.Code, tt.want)
			}
			if method != http.MethodGet || path != "/pdf/v3/health" || authorization != "Bearer relay-key" {
				t.Fatalf("upstream got %s %s with %q", method, path, authorization)
			}
		})
	}
}

func TestRelayHealthIsUnavailableWhenTheSharedPdf3IsDown(t *testing.T) {
	upstream := httptest.NewServer(http.NotFoundHandler())
	url := upstream.URL
	upstream.Close()
	rl := newTestRelay(t, url+"/pdf/v3")

	w := httptest.NewRecorder()
	rl.handleHealth(w, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/pdf/health", nil))

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusServiceUnavailable)
	}
}

func TestRelayHealthIsUnavailableWhenShuttingDown(t *testing.T) {
	called := false
	upstream := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { called = true }))
	t.Cleanup(upstream.Close)
	rl := newTestRelay(t, upstream.URL+"/pdf/v3")
	rl.shuttingDown = func() bool { return true }

	w := httptest.NewRecorder()
	rl.handleHealth(w, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/pdf/health", nil))

	if w.Code != http.StatusServiceUnavailable || called {
		t.Fatalf("status = %d, upstream called = %t", w.Code, called)
	}
}
