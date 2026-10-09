package generator

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"altinn.studio/pdf3/internal/cdp"
	"altinn.studio/pdf3/internal/frontendcache"
)

type preparedPage struct {
	commander cdp.Commander
	contextID string
	sessionID string
}

// A page's paused requests are drained before its context is disposed. The
// mutex prevents new event work from racing with stop's Wait.
//
//nolint:containedctx,embeddedstructfieldcheck // The lifetime context precedes the embedded page to avoid padding in the pointer layout.
type renderPage struct {
	ctx context.Context
	*preparedPage
	cancel     context.CancelFunc
	cacheSlots chan struct{}
	work       sync.WaitGroup
	mu         sync.Mutex
	closed     bool
}

func (p *renderPage) start(fn func()) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.closed {
		return
	}
	p.work.Go(fn)
}

func (p *renderPage) stop() {
	p.mu.Lock()
	p.closed = true
	p.cancel()
	p.mu.Unlock()
	p.work.Wait()
}

type compilationSeed struct {
	*renderPage

	asset  *frontendcache.Asset
	result chan string
}

// publicFrontendClient retains upstream sockets while every browser context
// remains disposable. LocalTest's mediated CA is also needed by Go's client.
//
//nolint:gosec // The host supplies the trust bundle path, not a render request.
func publicFrontendClient() *http.Client {
	baseTransport, ok := http.DefaultTransport.(*http.Transport)
	if !ok {
		return &http.Client{Timeout: 10 * time.Second}
	}
	transport := baseTransport.Clone()
	if path := os.Getenv("STUDIO_CA_BUNDLE"); path != "" {
		if pem, err := os.ReadFile(path); err == nil {
			roots, rootErr := x509.SystemCertPool()
			if rootErr != nil {
				roots = x509.NewCertPool()
			}
			roots.AppendCertsFromPEM(pem)
			transport.TLSClientConfig = &tls.Config{RootCAs: roots, MinVersion: tls.VersionTLS12}
		}
	}
	return &http.Client{Transport: transport, Timeout: 10 * time.Second}
}

func (w *browserSession) createPage(ctx context.Context) (*preparedPage, error) {
	// Once Chrome accepts this command, retain its context ID even if the page
	// deadline expires; attachPage will then dispose the known context on failure.
	resp, err := w.conn.SendCommand(
		context.WithoutCancel(ctx),
		"Target.createBrowserContext",
		map[string]any{"disposeOnDetach": true},
	)
	if err != nil {
		return nil, fmt.Errorf("create context: %w", err)
	}
	contextID := w.resultString(resp, "browserContextId")
	page, err := w.attachPage(ctx, contextID)
	if err != nil {
		_, disposeErr := w.conn.SendCommand(
			context.WithoutCancel(ctx),
			"Target.disposeBrowserContext",
			map[string]any{"browserContextId": contextID},
		)
		w.assertA(disposeErr == nil || w.ctx.Err() != nil, "Failed to dispose incomplete page", "error", disposeErr)
	}
	return page, err
}

func (w *browserSession) attachPage(ctx context.Context, contextID string) (*preparedPage, error) {
	resp, err := w.conn.SendCommand(
		ctx,
		"Target.createTarget",
		map[string]any{"url": "about:blank", "browserContextId": contextID},
	)
	if err != nil {
		return nil, fmt.Errorf("create target: %w", err)
	}
	resp, err = w.conn.SendCommand(
		ctx,
		"Target.attachToTarget",
		map[string]any{"targetId": w.resultString(resp, "targetId"), "flatten": true},
	)
	if err != nil {
		return nil, fmt.Errorf("attach target: %w", err)
	}
	page := &preparedPage{contextID: contextID, sessionID: w.resultString(resp, "sessionId")}
	page.commander = w.conn.Session(page.sessionID)
	commands := []cdp.Command{
		{Method: "Page.enable"}, {Method: "Runtime.enable"}, {Method: "Log.enable"},
		{Method: "Fetch.enable", Params: map[string]any{"patterns": []map[string]any{{
			"urlPattern":   "https://altinncdn.no/toolkits/altinn-app-frontend/*/altinn-app-frontend.js",
			"resourceType": "Script", "requestStage": "Request",
		}}}},
	}
	if err := commandBatchError(commands, page.commander.SendCommandBatch(ctx, commands)); err != nil {
		return nil, fmt.Errorf("enable page domains: %w", err)
	}
	return page, nil
}

func (w *browserSession) handleFrontendEvent(sessionID, method string, params any) bool {
	if seed := w.seedPage.Load(); seed != nil && sessionID == seed.sessionID {
		p, ok := params.(map[string]any)
		if !ok {
			return true
		}
		switch method {
		case "Page.compilationCacheProduced":
			url, urlOK := p["url"].(string)
			data, dataOK := p["data"].(string)
			if urlOK && dataOK && url == seed.asset.URL && len(data) <= 24<<20 {
				select {
				case seed.result <- data:
				default:
				}
			}
		case "Fetch.requestPaused":
			seed.start(func() { w.fulfillSeed(seed, p) })
		}
		return true // Seed-page logs and script failures never belong to a user render.
	}
	if method != "Fetch.requestPaused" {
		return false
	}
	if page := w.activePage.Load(); page != nil && sessionID == page.sessionID {
		if p, ok := params.(map[string]any); ok {
			page.start(func() { w.serveFrontend(page, p) })
		}
	}
	return true
}

func pausedRequest(params map[string]any) (string, string, bool) {
	id, idOK := params["requestId"].(string)
	request, requestOK := params["request"].(map[string]any)
	url, urlOK := request["url"].(string)
	method, methodOK := request["method"].(string)
	resourceType, typeOK := params["resourceType"].(string)
	headers, headersOK := request["headers"].(map[string]any)
	if !idOK || !requestOK || !urlOK || !methodOK || !typeOK || !headersOK {
		return id, url, false
	}
	for name := range headers {
		if strings.EqualFold(name, "Cookie") || strings.EqualFold(name, "Authorization") {
			return id, url, false
		}
	}
	return id, url, method == http.MethodGet && resourceType == "Script" && frontendcache.Eligible(url)
}

func (w *browserSession) serveFrontend(page *renderPage, params map[string]any) {
	select {
	case page.cacheSlots <- struct{}{}:
		defer func() { <-page.cacheSlots }()
	default:
		id, _, _ := pausedRequest(params)
		w.continueFrontend(page, id)
		return
	}
	id, url, eligible := pausedRequest(params)
	if !eligible {
		w.continueFrontend(page, id)
		return
	}
	// Fetch's request headers can precede Chromium's automatic Cookie header.
	// Inspect cookies in this page's own context before substituting public bytes.
	cookies, err := page.commander.SendCommand(page.ctx, "Network.getCookies", map[string]any{"urls": []string{url}})
	if err != nil || !hasNoCookies(cookies) {
		w.continueFrontend(page, id)
		return
	}
	asset, err := w.frontendCache.Get(page.ctx, url)
	if err != nil {
		w.rootLogger.Debug("Frontend cache miss", "error", err)
		w.continueFrontend(page, id)
		return
	}
	if code := w.frontendCache.Compilation(asset); len(code) > 0 {
		_, err = page.commander.SendCommand(
			page.ctx,
			"Page.addCompilationCache",
			map[string]any{"url": url, "data": base64.StdEncoding.EncodeToString(code)},
		)
		if err != nil {
			w.rootLogger.Warn("Could not import frontend compilation cache", "error", err)
		}
	} else {
		select {
		case w.compileQueue <- asset:
		default:
		} // Bound anonymous background compilation to one queued bundle.
	}
	_, err = page.commander.SendCommand(page.ctx, "Fetch.fulfillRequest", frontendResponse(id, asset))
	if err != nil && page.ctx.Err() == nil {
		w.rootLogger.Warn("Could not fulfill frontend bundle", "error", err)
		w.continueFrontend(page, id)
	}
}

func hasNoCookies(resp *cdp.CDPResponse) bool {
	if resp == nil {
		return false
	}
	result, ok := resp.Result.(map[string]any)
	if !ok {
		return false
	}
	cookies, ok := result["cookies"].([]any)
	return ok && len(cookies) == 0
}

func (w *browserSession) continueFrontend(page *renderPage, id string) {
	if _, err := page.commander.SendCommand(
		page.ctx,
		"Fetch.continueRequest",
		map[string]any{"requestId": id},
	); err != nil &&
		page.ctx.Err() == nil {
		w.rootLogger.Warn("Could not continue frontend request", "error", err)
	}
}

func frontendResponse(id string, asset *frontendcache.Asset) map[string]any {
	names := make([]string, 0, len(asset.Headers))
	for name := range asset.Headers {
		names = append(names, name)
	}
	sort.Strings(names)
	headers := make([]map[string]string, 0, len(names))
	for _, name := range names {
		for _, value := range asset.Headers[name] {
			headers = append(headers, map[string]string{"name": name, "value": value})
		}
	}
	return map[string]any{
		"requestId":       id,
		"responseCode":    http.StatusOK,
		"responseHeaders": headers,
		"body":            base64.StdEncoding.EncodeToString(asset.Body),
	}
}

func (w *browserSession) compileFrontendBundles() {
	defer close(w.compileDone)
	for {
		select {
		case <-w.ctx.Done():
			return
		case asset := <-w.compileQueue:
			if len(w.frontendCache.Compilation(asset)) != 0 {
				continue
			}
			if err := w.produceFrontendCompilation(asset); err != nil && w.ctx.Err() == nil {
				w.rootLogger.Warn("Could not prepare frontend compilation cache", "url", asset.URL, "error", err)
			}
		}
	}
}

func (w *browserSession) produceFrontendCompilation(asset *frontendcache.Asset) error {
	ctx, cancel := context.WithTimeout(w.ctx, 10*time.Second)
	defer cancel()
	prepared, err := w.createPage(ctx)
	if err != nil {
		return err
	}
	seed := &compilationSeed{
		renderPage: &renderPage{preparedPage: prepared, ctx: ctx, cancel: cancel},
		asset:      asset,
		result:     make(chan string, 1),
	}
	w.seedPage.Store(seed)
	defer func() {
		w.seedPage.Store(nil)
		seed.stop()
		if w.ctx.Err() == nil {
			_, disposeErr := w.conn.SendCommand(
				context.WithoutCancel(ctx),
				"Target.disposeBrowserContext",
				map[string]any{"browserContextId": prepared.contextID},
			)
			w.assertA(
				disposeErr == nil || w.ctx.Err() != nil,
				"Failed to dispose frontend compilation seed",
				"error",
				disposeErr,
			)
		}
	}()
	_, err = prepared.commander.SendCommand(
		ctx,
		"Page.produceCompilationCache",
		map[string]any{"scripts": []map[string]any{{"url": asset.URL}}},
	)
	if err != nil {
		return fmt.Errorf("request compilation cache: %w", err)
	}
	urlJSON, err := json.Marshal(asset.URL)
	if err != nil {
		return fmt.Errorf("encode bundle URL: %w", err)
	}
	expression := `new Promise(resolve => { const script = document.createElement('script'); script.src = ` + string(
		urlJSON,
	) + `; script.onload = () => resolve(true); script.onerror = () => resolve(false); document.head.appendChild(script); })`
	_, err = prepared.commander.SendCommand(
		ctx,
		"Runtime.evaluate",
		map[string]any{"expression": expression, "awaitPromise": true, "returnByValue": true},
	)
	if err != nil {
		return fmt.Errorf("load compilation seed: %w", err)
	}
	select {
	case data := <-seed.result:
		code, decodeErr := base64.StdEncoding.DecodeString(data)
		if decodeErr != nil {
			return fmt.Errorf("decode compilation cache: %w", decodeErr)
		}
		w.frontendCache.SetCompilation(asset, code)
		w.rootLogger.Info("Prepared frontend compilation cache", "url", asset.URL, "bytes", len(code))
		return nil
	case <-ctx.Done():
		return fmt.Errorf("wait for compilation cache: %w", ctx.Err())
	}
}

func (w *browserSession) fulfillSeed(seed *compilationSeed, params map[string]any) {
	id, url, eligible := pausedRequest(params)
	if !eligible || url != seed.asset.URL {
		w.continueFrontend(seed.renderPage, id)
		return
	}
	if _, err := seed.commander.SendCommand(
		seed.ctx,
		"Fetch.fulfillRequest",
		frontendResponse(id, seed.asset),
	); err != nil &&
		seed.ctx.Err() == nil {
		w.rootLogger.Warn("Could not fulfill compilation seed", "error", err)
	}
}
