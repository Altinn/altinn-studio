package generator

import (
	"context"
	"sync/atomic"
	"testing"

	"altinn.studio/pdf3/internal/cdp"
	"altinn.studio/pdf3/internal/frontendcache"
)

const publicBundleURL = "https://altinncdn.no/toolkits/altinn-app-frontend/4.21.4/altinn-app-frontend.js"

func TestPausedRequestRequiresAnonymousVersionedScript(t *testing.T) {
	//nolint:govet // Keep table fields in the same readable order as its cases.
	tests := []struct {
		name, url, method, resource string
		headers                     map[string]any
		eligible                    bool
	}{
		{"public script", publicBundleURL, "GET", "Script", nil, true},
		{"cookie", publicBundleURL, "GET", "Script", map[string]any{"cookie": "user=data"}, false},
		{"authorization", publicBundleURL, "GET", "Script", map[string]any{"AUTHORIZATION": "Bearer user"}, false},
		{
			"mutable alias",
			"https://altinncdn.no/toolkits/altinn-app-frontend/4/altinn-app-frontend.js",
			"GET",
			"Script",
			nil,
			false,
		},
		{"app script", "https://org.apps.altinn.no/org/app/custom.js", "GET", "Script", nil, false},
		{"fetch", publicBundleURL, "GET", "Fetch", nil, false},
		{"post", publicBundleURL, "POST", "Script", nil, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, _, eligible := pausedRequest(map[string]any{
				"requestId": "request", "resourceType": tt.resource,
				"request": map[string]any{"url": tt.url, "method": tt.method, "headers": tt.headers},
			})
			if eligible != tt.eligible {
				t.Fatalf("eligible = %v, want %v", eligible, tt.eligible)
			}
		})
	}
}

func TestFrontendCompilationRequiresSeedSession(t *testing.T) {
	seed := &compilationSeed{
		renderPage: &renderPage{preparedPage: &preparedPage{sessionID: "seed"}},
		asset:      &frontendcache.Asset{URL: publicBundleURL}, result: make(chan string, 1),
	}
	w := &browserSession{}
	w.seedPage.Store(seed)
	params := map[string]any{"url": publicBundleURL, "data": "user-controlled"}
	w.handleFrontendEvent("user", "Page.compilationCacheProduced", params)
	params["url"] = "https://untrusted.example/script.js"
	w.handleFrontendEvent("seed", "Page.compilationCacheProduced", params)
	select {
	case <-seed.result:
		t.Fatal("untrusted compilation entered the seed cache")
	default:
	}
	params["url"] = publicBundleURL
	params["data"] = "trusted"
	w.handleFrontendEvent("seed", "Page.compilationCacheProduced", params)
	if result := <-seed.result; result != "trusted" {
		t.Fatalf("unexpected seed result %q", result)
	}
}

func TestRenderPageStopDrainsAndRejectsEventWork(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	page := &renderPage{ctx: ctx, cancel: cancel}
	started, finished := make(chan struct{}), make(chan struct{})
	page.start(func() { close(started); <-ctx.Done(); close(finished) })
	<-started
	page.stop()
	select {
	case <-finished:
	default:
		t.Fatal("stop returned before paused work drained")
	}
	var ran atomic.Bool
	page.start(func() { ran.Store(true) })
	if ran.Load() {
		t.Fatal("disposed page accepted new event work")
	}
}

func TestAutomaticCookiesBypassSharedAssets(t *testing.T) {
	for _, resp := range []*cdp.CDPResponse{
		nil, {Result: map[string]any{}},
		{Result: map[string]any{"cookies": []any{map[string]any{"name": "user", "value": "secret"}}}},
	} {
		if hasNoCookies(resp) {
			t.Fatal("unknown or credentialed context considered anonymous")
		}
	}
	if !hasNoCookies(&cdp.CDPResponse{Result: map[string]any{"cookies": []any{}}}) {
		t.Fatal("empty context not considered anonymous")
	}
}
