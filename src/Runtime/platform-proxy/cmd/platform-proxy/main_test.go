package main

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestParseUpstream(t *testing.T) {
	valid := map[string]string{
		"https://platform.altinn.no":             "https://platform.altinn.no",
		"https://platform.tt02.altinn.no/":       "https://platform.tt02.altinn.no",
		"https://platform.at22.altinn.cloud:443": "https://platform.at22.altinn.cloud:443",
	}
	for value, want := range valid {
		upstream, err := parseUpstream(value)
		if err != nil {
			t.Errorf("parseUpstream(%q): %v", value, err)
			continue
		}
		if upstream.String() != want {
			t.Errorf("parseUpstream(%q) = %q, want %q", value, upstream, want)
		}
	}

	invalid := []string{
		"",
		"platform.altinn.no",
		"http://platform.altinn.no",
		"https://platform.altinn.no/storage",
		"https://platform.altinn.no?x=1",
		"https://platform.altinn.no#x",
		"https://user:secret@platform.altinn.no",
		"https://",
	}
	for _, value := range invalid {
		if _, err := parseUpstream(value); err == nil {
			t.Errorf("parseUpstream(%q) succeeded", value)
		}
	}
}

func TestReadConfigServiceOwner(t *testing.T) {
	t.Setenv(upstreamURLEnv, "https://platform.altinn.no")
	for value, ok := range map[string]bool{"ttd": true, "digdir": true, "skd-2": true, "": false, "TTD": false, "-ttd": false} {
		t.Setenv(serviceOwnerEnv, value)
		cfg, err := readConfig()
		if ok && (err != nil || cfg.serviceOwner != value) {
			t.Errorf("readConfig with service owner %q: %v", value, err)
		}
		if !ok && err == nil {
			t.Errorf("readConfig accepted service owner %q", value)
		}
	}
}

func TestHandler(t *testing.T) {
	ready := false
	proxied := ""
	platformChecked := false
	h := handler(
		slog.New(slog.DiscardHandler),
		http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) { proxied = r.URL.Path }),
		http.HandlerFunc(func(http.ResponseWriter, *http.Request) { platformChecked = true }),
		func() bool { return ready },
	)

	tests := []struct {
		path       string
		ready      bool
		wantStatus int
	}{
		{livePath, false, http.StatusOK},
		{readyPath, false, http.StatusServiceUnavailable},
		{readyPath, true, http.StatusOK},
	}
	for _, tt := range tests {
		ready = tt.ready
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequestWithContext(t.Context(), http.MethodGet, tt.path, nil))
		if w.Code != tt.wantStatus {
			t.Errorf("GET %s with ready=%v: status %d, want %d", tt.path, tt.ready, w.Code, tt.wantStatus)
		}
	}
	if platformChecked {
		t.Error("a kubelet probe checked the platform")
	}
	h.ServeHTTP(
		httptest.NewRecorder(),
		httptest.NewRequestWithContext(t.Context(), http.MethodGet, platformHealthPath, nil),
	)
	if !platformChecked {
		t.Errorf("GET %s did not check the platform", platformHealthPath)
	}
	if proxied != "" {
		t.Errorf("a probe reached the proxy: %q", proxied)
	}

	// A path a ServeMux would clean and redirect is forwarded as it is.
	h.ServeHTTP(
		httptest.NewRecorder(),
		httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/storage//api/v1/x", nil),
	)
	if proxied != "/storage//api/v1/x" {
		t.Errorf("proxied path = %q, want it unchanged", proxied)
	}
}
