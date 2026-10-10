package generator

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/cdp"
)

// preparedPage is a browser context with a single blank page that no request has used yet.
// The request loop prepares the next one right after disposing the previous request's context,
// so that a request doesn't wait for the browser to create it. It is handed to exactly one
// request, and disposed with that request like any other context.
type preparedPage struct {
	// warmup is nil when warming is disabled
	warmup    *warmup
	contextID string
	sessionID string
}

// warmup loads the configured public assets into a prepared context from a second blank page,
// before any request arrives, so that the request's page finds them in the context's HTTP cache
// instead of downloading them. It runs on its own goroutine while the loop waits for a request.
//
// The warm-up page only inserts <link rel=preload> elements: it runs none of the assets, and
// stores nothing except their HTTP cache entries. The context has no cookies yet, the request's
// cookies are set after it is handed over.
type warmup struct {
	started time.Time
	// err, targetID, duration and loaded are set by the goroutine before it closes done
	err      error
	done     chan struct{}
	cancel   context.CancelFunc
	targetID string
	duration time.Duration
	loaded   int
}

const (
	warmupDisabled = "disabled"
	warmupComplete = "complete"
	// warmupLoading means the request arrived before the assets finished loading. The warm-up page
	// stays open, and the request's page joins the downloads in progress instead of starting its own.
	warmupLoading = "loading"
	warmupFailed  = "failed"
)

var errInvalidWarmupResult = errors.New("invalid warm-up result")

// prewarmTimeout bounds how long an asset may take to load. The warm-up page gives up on it then,
// and the warm-up stops waiting a little later, well within the CDP command timeout.
const (
	prewarmTimeout     = 15 * time.Second
	prewarmWaitTimeout = prewarmTimeout + 5*time.Second
)

// prewarmPromise is the global of the warm-up page that resolves with how many assets loaded.
// It only exists in that page, which no request uses.
const prewarmPromise = "pdf3Prewarm"

// prewarmExpression returns a script that starts preloading the assets and stores a promise of
// how many of them loaded in prewarmPromise. An asset that takes longer than prewarmTimeout counts
// as not loaded. Preloads without a crossorigin attribute are fetched
// like v8 apps fetch the frontend bundle and stylesheet (no-cors, credentials included), which
// matters if the cache is ever split by credentials mode.
func prewarmExpression(urls []string) string {
	assets := make([][2]string, 0, len(urls))
	for _, u := range urls {
		assets = append(assets, [2]string{u, preloadDestination(u)})
	}
	assetsJSON, err := json.Marshal(assets)
	assert.That(err == nil, "Failed to encode prewarm assets", "error", err)
	return fmt.Sprintf(`globalThis.%s = Promise.all(%s.map(([href, as]) => new Promise((resolve) => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = as;
  link.href = href;
  link.onload = () => resolve(true);
  link.onerror = () => resolve(false);
  setTimeout(() => resolve(false), %d);
  document.head.appendChild(link);
}))).then((loaded) => loaded.filter(Boolean).length);
undefined`, prewarmPromise, assetsJSON, prewarmTimeout.Milliseconds())
}

// preloadDestination returns the preload type for an asset: stylesheets by their extension,
// everything else as a script.
func preloadDestination(rawURL string) string {
	if parsed, err := url.Parse(rawURL); err == nil && strings.HasSuffix(strings.ToLower(parsed.Path), ".css") {
		return "style"
	}
	return "script"
}

// prepareNextPage creates the context for the next request and starts warming it. It must only
// run once the previous request's context is disposed. Creating the context takes the browser
// ~15 ms, which happens here on the loop, the warm-up runs in the background. If preparing
// fails, the next request opens its own context.
func (w *browserSession) prepareNextPage() {
	if w.prepared != nil || w.ctx.Err() != nil {
		// A request that ended before opening a page left the prepared one untouched
		return
	}
	start := time.Now()
	page, err := w.newPage(w.ctx)
	if err != nil {
		w.rootLogger.Warn("Failed to prepare a page for the next request, it will open its own", "error", err)
		if page != nil {
			_, disposeErr := w.conn.SendCommand(context.WithoutCancel(w.ctx), "Target.disposeBrowserContext",
				map[string]any{"browserContextId": page.contextID})
			w.assertA(
				disposeErr == nil || w.ctx.Err() != nil,
				"Failed to dispose a browser context that failed to prepare", "error", disposeErr,
			)
		}
		return
	}
	if w.prewarmExpression != "" {
		page.warmup = w.startWarmup(page.contextID)
	}
	w.prepared = page
	w.rootLogger.Info("Prepared page for the next request", "duration", time.Since(start),
		"warmup", page.warmup != nil)
}

// startWarmup starts warming the context in the background.
func (w *browserSession) startWarmup(contextID string) *warmup {
	//nolint:gosec // stopWarmup calls cancel, when the page is handed over or the session ends.
	ctx, cancel := context.WithCancel(w.ctx)
	wu := &warmup{done: make(chan struct{}), cancel: cancel, started: time.Now()}
	go w.runWarmup(ctx, wu, contextID)
	return wu
}

// runWarmup opens the warm-up page and starts the downloads, waits for them, then closes the page.
// Only waiting is cancelled when the page is handed to a request. Opening the page and starting
// the downloads takes ~15 ms and is not cancelled, so that none of those commands is in flight
// once the request has the context: the request waits for them, then joins the downloads. What
// remains is the browser's reply to the wait, which runs nothing and arrives when the warm-up
// page's promise settles (at most prewarmTimeout) or the context is disposed. It is ignored.
func (w *browserSession) runWarmup(ctx context.Context, wu *warmup, contextID string) {
	defer close(wu.done)
	targetID, page, err := w.openWarmupPage(contextID)
	if err != nil {
		wu.err = err
		if w.ctx.Err() == nil {
			w.rootLogger.Warn("Failed to start the warm-up", "error", err)
		}
		return
	}

	wu.targetID = targetID
	waitCtx, cancelWait := context.WithTimeout(ctx, prewarmWaitTimeout)
	defer cancelWait()
	resp, err := page.SendCommand(waitCtx, "Runtime.evaluate", map[string]any{
		"expression":    prewarmPromise,
		"awaitPromise":  true,
		"returnByValue": true,
	})
	wu.duration = time.Since(wu.started)
	if err == nil {
		wu.loaded, err = parseWarmupResult(resp)
	}
	if err != nil {
		wu.err = err
		if ctx.Err() == nil {
			w.rootLogger.Warn("Warm-up failed", "error", err, "duration", wu.duration)
		}
		return
	}

	// The assets are in the cache. Close the warm-up page so that the request gets a context
	// that holds only its own page. Not cancelled either, the request waits for it.
	_, err = w.conn.SendCommand(w.ctx, "Target.closeTarget", map[string]any{"targetId": wu.targetID})
	if err != nil && w.ctx.Err() == nil {
		w.rootLogger.Warn("Failed to close the warm-up page", "error", err)
	}
	w.rootLogger.Info("Warmed prepared page", "duration", wu.duration, "loaded", wu.loaded,
		"assets", w.prewarmAssets)
}

// openWarmupPage opens a blank page in the context and starts preloading the assets in it. It
// returns the page's target and session.
//
//nolint:ireturn // The page is a CDP session, which the cdp package exposes as an interface.
func (w *browserSession) openWarmupPage(contextID string) (string, cdp.Commander, error) {
	targetID, sessionID, err := w.attachBlankPage(w.ctx, contextID)
	if err != nil {
		return "", nil, err
	}
	page := w.conn.Session(sessionID)
	resp, err := page.SendCommand(w.ctx, "Runtime.evaluate", map[string]any{"expression": w.prewarmExpression})
	if err == nil {
		err = evaluateException(resp)
	}
	if err != nil {
		return "", nil, fmt.Errorf("start preloading: %w", err)
	}
	return targetID, page, nil
}

// evaluateException returns the exception a Runtime.evaluate response reports, if any.
func evaluateException(resp *cdp.CDPResponse) error {
	result, ok := resp.Result.(map[string]any)
	if !ok {
		return errInvalidWarmupResult
	}
	if details, hasException := result["exceptionDetails"]; hasException {
		return fmt.Errorf("%w: %v", errEvaluateException, details)
	}
	return nil
}

func parseWarmupResult(resp *cdp.CDPResponse) (int, error) {
	if err := evaluateException(resp); err != nil {
		return 0, err
	}
	result, ok := resp.Result.(map[string]any)
	if !ok {
		return 0, errInvalidWarmupResult
	}
	value, ok := result["result"].(map[string]any)
	if !ok {
		return 0, errInvalidWarmupResult
	}
	loaded, ok := value["value"].(float64)
	if !ok {
		return 0, errInvalidWarmupResult
	}
	return int(loaded), nil
}

// takePreparedPage hands the prepared page, if there is one, to the request. It stops the
// warm-up first: once it returns, no goroutine or command of ours runs against the context.
func (w *browserSession) takePreparedPage(span trace.Span) *preparedPage {
	page := w.prepared
	w.prepared = nil
	if span.IsRecording() {
		span.SetAttributes(attribute.Bool("pdf.page.prepared", page != nil))
	}
	if page == nil {
		return nil
	}

	state := stopWarmup(page.warmup)
	logArgs := []any{"warmup", state}
	if page.warmup != nil {
		logArgs = append(logArgs, "warmup_age", time.Since(page.warmup.started))
		if state == warmupComplete {
			logArgs = append(logArgs, "warmup_duration", page.warmup.duration, "loaded", page.warmup.loaded,
				"assets", w.prewarmAssets)
		}
	}
	w.logger.Info("Using prepared page", logArgs...)
	if span.IsRecording() {
		span.SetAttributes(attribute.String("pdf.page.warmup", state))
	}
	return page
}

// stopWarmup stops waiting for the warm-up and returns how far it got. When it returns, the
// warm-up goroutine has exited.
func stopWarmup(wu *warmup) string {
	if wu == nil {
		return warmupDisabled
	}
	wu.cancel()
	<-wu.done
	switch {
	case wu.err == nil:
		return warmupComplete
	case errors.Is(wu.err, context.Canceled):
		// Stopped by the request, unless the session is closing, when it doesn't matter
		return warmupLoading
	default:
		return warmupFailed
	}
}

// discardPreparedPage stops the warm-up of a page no request will use, when the session ends.
// Closing the browser disposes the context.
func (w *browserSession) discardPreparedPage() {
	if w.prepared != nil {
		stopWarmup(w.prepared.warmup)
		w.prepared = nil
	}
}
