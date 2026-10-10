package generator

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	"altinn.studio/pdf3/internal/cdp"
)

func TestPreloadDestination(t *testing.T) {
	tests := map[string]string{
		"https://altinncdn.no/toolkits/altinn-app-frontend/4/altinn-app-frontend.css": "style",
		"https://altinncdn.no/toolkits/altinn-app-frontend/4/altinn-app-frontend.js":  "script",
		"http://a.test/STYLE.CSS?v=1":  "style",
		"http://a.test/app.js?x=.css":  "script",
		"http://a.test/no-extension":   "script",
		"http://a.test/style.css#frag": "style",
	}
	for rawURL, want := range tests {
		if got := preloadDestination(rawURL); got != want {
			t.Errorf("preloadDestination(%q) = %q, want %q", rawURL, got, want)
		}
	}
}

func TestPrewarmExpressionEmbedsAssetsAsJSON(t *testing.T) {
	expression := prewarmExpression([]string{"http://a.test/app.js", `http://a.test/"quoted".css`})
	want := `globalThis.pdf3Prewarm = Promise.all([["http://a.test/app.js","script"],["http://a.test/\"quoted\".css","style"]].map(`
	if !strings.HasPrefix(expression, want) {
		t.Fatalf("prewarmExpression() = %s", expression)
	}
	if !strings.Contains(expression, "setTimeout(() => resolve(false), 15000)") {
		t.Fatalf("an asset that doesn't load must time out: %s", expression)
	}
	if !strings.Contains(expression, "link.rel = 'preload'") || strings.Contains(expression, "crossorigin") {
		t.Fatalf("assets must be preloaded without crossorigin, like v8 apps load them: %s", expression)
	}
}

func TestParseWarmupResult(t *testing.T) {
	loaded, err := parseWarmupResult(&cdp.CDPResponse{
		Result: map[string]any{"result": map[string]any{"type": "number", "value": float64(2)}},
	})
	if err != nil || loaded != 2 {
		t.Fatalf("parseWarmupResult() = %d, %v", loaded, err)
	}
	_, err = parseWarmupResult(&cdp.CDPResponse{Result: map[string]any{"exceptionDetails": map[string]any{}}})
	if !errors.Is(err, errEvaluateException) {
		t.Fatalf("exception result = %v", err)
	}
	_, err = parseWarmupResult(&cdp.CDPResponse{Result: map[string]any{"result": map[string]any{"value": "2"}}})
	if !errors.Is(err, errInvalidWarmupResult) {
		t.Fatalf("invalid result = %v", err)
	}
}

func TestStopWarmup(t *testing.T) {
	if state := stopWarmup(nil); state != warmupDisabled {
		t.Fatalf("no warm-up = %s", state)
	}

	// The goroutine finished before the request arrived
	finished := &warmup{done: make(chan struct{}), cancel: func() {}}
	close(finished.done)
	if state := stopWarmup(finished); state != warmupComplete {
		t.Fatalf("finished warm-up = %s", state)
	}

	// The request arrives while the assets load: stopWarmup cancels the goroutine and waits for it
	ctx, cancel := context.WithCancel(t.Context())
	loading := &warmup{done: make(chan struct{}), cancel: cancel}
	exited := false
	go func() {
		<-ctx.Done()
		loading.err = fmt.Errorf("evaluate: %w", ctx.Err())
		exited = true
		close(loading.done)
	}()
	if state := stopWarmup(loading); state != warmupLoading || !exited {
		t.Fatalf("loading warm-up = %s, goroutine exited: %v", state, exited)
	}

	// Opening the warm-up page failed, there is no goroutine to cancel
	failed := &warmup{done: make(chan struct{}), cancel: func() {}, err: errFakeCommand}
	close(failed.done)
	if state := stopWarmup(failed); state != warmupFailed {
		t.Fatalf("failed warm-up = %s", state)
	}
}
