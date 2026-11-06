package proxy

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"altinn.studio/platform-proxy/internal/accesstoken"
)

func TestHealthChecksThePlatformWithAToken(t *testing.T) {
	var got *http.Request
	platform := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r
		w.Header().Set("Content-Type", "application/json")
		if _, err := w.Write([]byte(`{"issuer":"https://platform.example"}`)); err != nil {
			t.Errorf("write response: %v", err)
		}
	}))
	t.Cleanup(platform.Close)

	w := checkHealth(t, platform.URL, &fakeIssuer{token: "signed-token"}, nil)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusOK)
	}
	if got.URL.Path != healthCheckPath {
		t.Errorf("the platform got %s, want %s", got.URL.Path, healthCheckPath)
	}
	if token := got.Header.Get(accesstoken.Header); token != "signed-token" {
		t.Errorf("the platform got %s %q, want the issued token", accesstoken.Header, token)
	}
}

func TestHealthIsUnavailable(t *testing.T) {
	expired := &fakeIssuer{token: "signed-token", notAfter: time.Now().Add(-time.Minute)}
	tests := map[string]struct {
		issuer       *fakeIssuer
		answer       int
		wantRequests int
	}{
		"no certificate":      {issuer: &fakeIssuer{err: accesstoken.ErrNoCredentials}, answer: http.StatusOK},
		"expired certificate": {issuer: expired, answer: http.StatusOK},
		"platform not found":  {issuer: &fakeIssuer{token: "t"}, answer: http.StatusNotFound, wantRequests: 1},
		"platform down":       {issuer: &fakeIssuer{token: "t"}, answer: http.StatusBadGateway, wantRequests: 1},
		"redirect":            {issuer: &fakeIssuer{token: "t"}, answer: http.StatusFound, wantRequests: 1},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			requests := 0
			platform := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				requests++
				if tt.answer == http.StatusFound {
					w.Header().Set("Location", "https://elsewhere.example/")
				}
				w.WriteHeader(tt.answer)
			}))
			t.Cleanup(platform.Close)

			w := checkHealth(t, platform.URL, tt.issuer, nil)

			if w.Code != http.StatusServiceUnavailable {
				t.Errorf("status = %d, want %d", w.Code, http.StatusServiceUnavailable)
			}
			if requests != tt.wantRequests {
				t.Errorf("the platform got %d requests, want %d", requests, tt.wantRequests)
			}
		})
	}
}

func TestHealthKeepsResponseContentOutOfLogs(t *testing.T) {
	const secret = "01017012345-secret-token"
	address := serveRaw(t, "HTTP/1.1 200 OK\r\nContent-Length: 0\r\n"+secret+" is not a header\r\n\r\n")
	var logs bytes.Buffer

	w := checkHealth(t, "http://"+address, &fakeIssuer{token: "signed-token"}, &logs)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("status = %d, want %d", w.Code, http.StatusServiceUnavailable)
	}
	if strings.Contains(logs.String(), secret) || strings.Contains(w.Body.String(), secret) {
		t.Errorf("the response's content reached the logs or the caller:\n%s\n%s", logs.String(), w.Body.String())
	}
}

func checkHealth(t *testing.T, upstream string, issuer *fakeIssuer, logs *bytes.Buffer) *httptest.ResponseRecorder {
	t.Helper()
	target, err := url.Parse(upstream)
	if err != nil {
		t.Fatalf("parse upstream: %v", err)
	}
	handler := slog.DiscardHandler
	if logs != nil {
		handler = slog.NewTextHandler(logs, nil)
	}
	w := httptest.NewRecorder()
	NewHealthChecker(slog.New(handler), target, issuer).
		ServeHTTP(w, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/health/platform", nil))
	return w
}
