package generator

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/browser"
	"altinn.studio/pdf3/internal/cdp"
	"altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/internal/types"
)

type browserSession struct {
	id       int
	logger   *slog.Logger
	browser  *browser.Process
	conn     cdp.Connection
	targetID string

	queue          chan workerRequest
	state          atomic.Uint32
	currentRequest *workerRequest

	// Error tracking for current request
	consoleErrors atomic.Int32
	browserErrors atomic.Int32

	// Shutdown coordination
	ctx    context.Context
	cancel context.CancelFunc
}

func newBrowserSession(logger *slog.Logger, id int) (*browserSession, error) {
	ctx, cancel := context.WithCancel(context.Background())
	sessionLogger := logger.With("id", id)
	sessionLogger.Info("Starting browser session")
	w := &browserSession{
		id:     id,
		logger: sessionLogger,
		queue:  make(chan workerRequest),
		state:  atomic.Uint32{},
		ctx:    ctx,
		cancel: cancel,
	}

	// Start browser process
	var err error
	w.browser, err = browser.Start(id)
	if err != nil {
		return nil, err
	}

	// Connect to the browser with event handler
	w.conn, w.targetID, err = cdp.Connect(ctx, id, w.browser.DebugBaseURL, w.handleEvent)
	if err != nil {
		if closeErr := w.browser.Close(); closeErr != nil {
			w.logger.Error("Failed to connect AND failed to close browser", "error", closeErr)
		}
		return nil, fmt.Errorf("failed to connect to browser: %w", err)
	}

	// Enable required domains
	_, err = w.conn.SendCommand(w.ctx, "Page.enable", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to call Page.enable: %w", err)
	}

	_, err = w.conn.SendCommand(w.ctx, "Runtime.enable", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to enable Runtime.enable: %w", err)
	}

	_, err = w.conn.SendCommand(w.ctx, "Log.enable", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to enable Log.enable: %w", err)
	}

	go w.handleRequests()

	w.logger.Info("Browser worker initialized successfully")
	return w, nil
}

// tryEnqueue attempts to enqueue a request if the session is ready
// Returns true if the request was enqueued, false otherwise
func (w *browserSession) tryEnqueue(req workerRequest) bool {
	select {
	// Queue is unbuffered, so if it isn't waiting here yet just return false
	case w.queue <- req:
		return true
	default:
		return false
	}
}

func (w *browserSession) handleEvent(method string, params any) {
	switch method {
	case "Runtime.consoleAPICalled":
		if p, ok := params.(map[string]any); ok {
			if apiType, ok := p["type"].(string); ok && apiType == "error" {
				w.consoleErrors.Add(1)
				w.logger.Warn("Console error", "details", p)
			}
		}
	case "Log.entryAdded":
		if p, ok := params.(map[string]any); ok {
			if entry, ok := p["entry"].(map[string]any); ok {
				if level, ok := entry["level"].(string); ok && level == "error" {
					w.browserErrors.Add(1)
					w.logger.Warn("Log error", "details", entry)
				}
			}
		}
	}
}

func (w *browserSession) handleRequests() {
	defer func() {
		w.assert(w.ctx.Err() != nil, "Exited worker loop, but process isn't shutting down")
	}()

	for {
		select {
		case <-w.ctx.Done():
			w.logger.Info("Request processing loop shutting down (context cancellation)")
			return
		case req, ok := <-w.queue:
			if !ok {
				w.assert(w.ctx.Err() != nil, "Queue channel closed, but process is not shutting down")
				return
			}

			// Reset error counters for this request
			w.consoleErrors.Store(0)
			w.browserErrors.Store(0)
			w.tryUpdateTestModeOutput(&req, "Before", false)

			w.currentRequest = &req
			rootLogger := w.logger
			w.logger = w.logger.With("url", req.request.URL)
			w.handleRequest(&req)
			w.logger = rootLogger
			w.currentRequest = nil

			w.assertA(
				req.hasResponded(),
				"Did not respond to request", "url", req.request.URL,
			)

			w.tryUpdateTestModeOutput(&req, "After", true)
		}
	}
}

func (w *browserSession) handleRequest(req *workerRequest) {
	w.logger.Info("Processing PDF request")
	start := time.Now()

	defer func() {
		if r := recover(); r != nil {
			w.logger.Error("Recovered from panic", "error", r)
			req.tryRespondError(types.NewPDFError(types.ErrGenerationFail, req.request.URL, fmt.Errorf("%v", r)))
		}

		duration := time.Since(start)
		w.logger.Info("Completed PDF request", "duration", duration)
	}()

	if req.ctx.Err() != nil {
		req.tryRespondError(types.NewPDFError(types.ErrClientDropped, "", req.ctx.Err()))
		// When we return here, we never get to the cleanup state in the defer block of `generatePdf` below.
		// Since we haven't actually used any of the user data the cleanup phase is completely safe to ignore.
		// So let's manually swap into it cleanup state so that outer loop can swap out of this

		// Capture browser state after cleanup (for test internals mode)
		w.tryUpdateTestModeOutput(req, "ClientDropped", false)
		return
	}

	err := w.generatePdf(req)
	if err != nil {
		req.tryRespondError(mapCustomError(err))
	}
}

func (w *browserSession) generatePdf(req *workerRequest) error {
	request := req.request

	startedProcessing := false

	// Ensure cleanup always runs
	defer func() {
		// When we get here we can already accept a request into the queue
		// Cleanup should run fairly fast (low ms range)

		// Capture browser state before cleanup (for test internals mode)
		w.tryUpdateTestModeOutput(req, "BeforeCleanup", false)

		if !startedProcessing {
			w.logger.Info("Never started processing, skipping cleanup")
			req.cleanedUp = true
			return
		}

		// Navigate back to default
		start := time.Now()
		var err error
		for range 3 {
			// Not using request context here, the client might have dropped out already and we should always complete cleanup
			_, err = w.conn.SendCommand(w.ctx, "Page.navigate", map[string]any{
				"url": "about:blank",
			})
			if err == nil {
				break
			}
			w.logger.Warn("Failed to navigate back to about:blank, retrying")
		}
		w.assertA(
			err == nil,
			"failed to navigate back to about:blank during cleanup",
			"error", err,
		)

		if testInput := req.tryGetTestModeInput(); testInput != nil && testInput.CleanupDelaySeconds > 0 {
			w.logger.Info("Waiting for cleanup delay", "seconds", testInput.CleanupDelaySeconds)
			time.Sleep(time.Duration(testInput.CleanupDelaySeconds) * time.Second)
		}

		// Cleanup browser storage
		w.cleanupBrowser(req)

		// Retry cleanup if it failed
		if !req.cleanedUp {
			w.logger.Warn("Failed to cleanup storage, retrying")
			for range 3 {
				w.cleanupBrowser(req)
				if req.cleanedUp {
					break
				}
			}

			w.assert(
				req.cleanedUp,
				"Failed to cleanup storage, we're in an unsafe state and can't proceed",
			)
		}

		duration := time.Since(start)
		w.logger.Info("Cleanup completed", "duration", duration)
	}()

	if req.ctx.Err() != nil {
		return types.NewPDFError(types.ErrClientDropped, "", req.ctx.Err())
	}

	// Set cookies
	if len(request.Cookies) > 0 {
		// Build cookies array for Network.setCookies
		cookies := make([]map[string]any, 0, len(request.Cookies))
		for _, cookie := range request.Cookies {
			sameSite := "Lax"
			switch cookie.SameSite {
			case "Strict":
				sameSite = "Strict"
			case "None":
				sameSite = "None"
			}

			cookieValue := map[string]any{
				"name":     cookie.Name,
				"value":    cookie.Value,
				"sameSite": sameSite,
			}
			if cookie.Domain != "" {
				cookieValue["domain"] = cookie.Domain
			}
			if cookie.Path != "" {
				cookieValue["path"] = cookie.Path
			}
			if cookie.Secure != nil {
				cookieValue["secure"] = *cookie.Secure
			}
			if cookie.HttpOnly != nil {
				cookieValue["httpOnly"] = *cookie.HttpOnly
			}
			if cookie.Url != "" {
				cookieValue["url"] = cookie.Url
			}
			cookies = append(cookies, cookieValue)
		}

		startedProcessing = true
		_, err := w.conn.SendCommand(req.ctx, "Network.setCookies", map[string]any{
			"cookies": cookies,
		})
		if err != nil {
			req.tryRespondError(contextErrorToPDFError(err, types.ErrSetCookieFail, ""))
			return nil
		}
	}

	// Navigate to URL
	if req.hasResponded() {
		return nil
	}
	if req.ctx.Err() != nil {
		req.tryRespondError(types.NewPDFError(types.ErrClientDropped, "", req.ctx.Err()))
		return nil
	}

	startedProcessing = true
	_, err := w.conn.SendCommand(req.ctx, "Page.navigate", map[string]any{
		"url": request.URL,
	})
	if err != nil {
		req.tryRespondError(contextErrorToPDFError(err, types.ErrGenerationFail, ""))
		return nil
	}

	// Wait for element if specified
	if request.WaitFor != nil {
		if req.hasResponded() {
			return nil
		}
		if req.ctx.Err() != nil {
			req.tryRespondError(types.NewPDFError(types.ErrClientDropped, "", req.ctx.Err()))
			return nil
		}

		const maxWaitMs int32 = types.MaxTimeoutMs
		if selector, ok := request.WaitFor.AsString(); ok {
			// Simple string selector - wait for element existence only
			err := w.waitForElement(req, selector, maxWaitMs, false, false)
			if err != nil {
				return nil
			}
		} else if timeout, ok := request.WaitFor.AsTimeout(); ok {
			// Simple timeout delay
			select {
			case <-time.After(time.Duration(timeout) * time.Millisecond):
			case <-req.ctx.Done():
				req.tryRespondError(types.NewPDFError(types.ErrClientDropped, "", req.ctx.Err()))
				return nil
			}
		} else if opts, ok := request.WaitFor.AsOptions(); ok {
			// Full options with selector, visible, hidden, timeout
			timeoutMs := maxWaitMs // default timeout
			if opts.Timeout != nil {
				timeoutMs = *opts.Timeout
			}
			checkVisible := opts.Visible != nil && *opts.Visible
			checkHidden := opts.Hidden != nil && *opts.Hidden

			err := w.waitForElement(req, opts.Selector, timeoutMs, checkVisible, checkHidden)
			if err != nil {
				return nil
			}
		}
	}

	if req.hasResponded() {
		return nil
	}
	if req.ctx.Err() != nil {
		req.tryRespondError(types.NewPDFError(types.ErrClientDropped, "", req.ctx.Err()))
		return nil
	}

	// Generate PDF with Puppeteer-compatible defaults
	pdfParams := map[string]any{
		"scale":                   1.0,
		"displayHeaderFooter":     false,
		"headerTemplate":          "",
		"footerTemplate":          "",
		"printBackground":         false,
		"landscape":               false,
		"pageRanges":              "",
		"preferCSSPageSize":       false,
		"omitBackground":          false,
		"generateTaggedPDF":       false,
		"generateDocumentOutline": false,
		"paperWidth":              8.5,
		"paperHeight":             11.0,
	}

	// Handle paper format (compatible with Puppeteer)
	if request.Options.Format != "" {
		// Try lowercase first, then try as-is
		formatKey := strings.ToLower(request.Options.Format)
		if dimensions, ok := paperFormats[formatKey]; ok {
			pdfParams["paperWidth"] = dimensions.width
			pdfParams["paperHeight"] = dimensions.height
		} else {
			w.logger.Warn("Unknown paper format, using default", "format", request.Options.Format)
		}
	}

	if request.Options.PrintBackground {
		pdfParams["printBackground"] = true
	}

	if request.Options.DisplayHeaderFooter {
		pdfParams["displayHeaderFooter"] = true
		if request.Options.HeaderTemplate != "" {
			pdfParams["headerTemplate"] = request.Options.HeaderTemplate
		}
		if request.Options.FooterTemplate != "" {
			pdfParams["footerTemplate"] = request.Options.FooterTemplate
		}
	}

	// Set margins if specified
	if request.Options.Margin.Top != "" {
		pdfParams["marginTop"] = convertMargin(request.Options.Margin.Top)
	}
	if request.Options.Margin.Right != "" {
		pdfParams["marginRight"] = convertMargin(request.Options.Margin.Right)
	}
	if request.Options.Margin.Bottom != "" {
		pdfParams["marginBottom"] = convertMargin(request.Options.Margin.Bottom)
	}
	if request.Options.Margin.Left != "" {
		pdfParams["marginLeft"] = convertMargin(request.Options.Margin.Left)
	}

	resp, err := w.conn.SendCommand(req.ctx, "Page.printToPDF", pdfParams)
	if err != nil {
		req.tryRespondError(contextErrorToPDFError(err, types.ErrGenerationFail, ""))
		return nil
	}

	// Extract PDF data
	result, ok := resp.Result.(map[string]any)
	if !ok {
		req.tryRespondError(types.NewPDFError(types.ErrGenerationFail, "", fmt.Errorf("invalid PDF response format")))
		return nil
	}

	dataStr, ok := result["data"].(string)
	if !ok {
		req.tryRespondError(types.NewPDFError(types.ErrGenerationFail, "", fmt.Errorf("no PDF data in response")))
		return nil
	}

	pdfBytes, err := base64.StdEncoding.DecodeString(dataStr)
	if err != nil {
		req.tryRespondError(types.NewPDFError(types.ErrGenerationFail, "", err))
		return nil
	}

	// Respond with PDF data
	req.tryRespondOk(pdfBytes)
	return nil
}

// waitForElement waits for an element to match the given criteria using MutationObserver.
// For simple existence checks, uses MutationObserver only.
// For visibility checks, adds polling to catch CSS rule changes.
func (w *browserSession) waitForElement(req *workerRequest, selector string, timeoutMs int32, checkVisible, checkHidden bool) error {
	if selector == "" {
		return nil
	}

	var expression string
	needsVisibilityCheck := checkVisible || checkHidden

	if needsVisibilityCheck {
		w.assert(
			checkVisible != checkHidden,
			// Is caught during validation
			"Can't check for both hidden and visible at the same time",
		)
		// Complex case: visibility checking with polling fallback
		expression = w.buildVisibilityWaitExpression(selector, timeoutMs, checkVisible, checkHidden)
	} else {
		// Simple case: existence check only (original behavior, no polling)
		expression = w.buildSimpleWaitExpression(selector, timeoutMs)
	}

	resp, err := w.conn.SendCommand(req.ctx, "Runtime.evaluate", map[string]any{
		"expression":    expression,
		"awaitPromise":  true,
		"returnByValue": true,
	})
	if err != nil {
		w.logger.Warn("Failed to wait for element", "selector", selector, "error", err)
		req.tryRespondError(contextErrorToPDFError(err, types.ErrElementNotReady, fmt.Sprintf("element %q", selector)))
		return err
	}

	// Expect a boolean result indicating whether the element was found within timeout
	if result, ok := resp.Result.(map[string]any); ok {
		if resultObj, ok := result["result"].(map[string]any); ok {
			if value, ok := resultObj["value"].(bool); ok {
				if !value {
					w.logger.Warn("Failed to wait for element: timeout", "selector", selector)
					err := fmt.Errorf("timeout")
					req.tryRespondError(types.NewPDFError(types.ErrElementNotReady, fmt.Sprintf("element %q", selector), err))
					return err
				}
			} else {
				w.logger.Warn("Unexpected evaluation result type waiting for element", "selector", selector)
			}
		}
	}

	return nil
}

// buildSimpleWaitExpression generates JavaScript for simple element existence checking.
// Uses MutationObserver only, no polling (original behavior).
func (w *browserSession) buildSimpleWaitExpression(selector string, timeoutMs int32) string {
	if htmlIDSelectorPattern.MatchString(selector) {
		// ID-optimized path
		id := selector[1:]
		return fmt.Sprintf(`(function(){
		  const id = %q; const timeoutMs = %d;
		  return new Promise((resolve) => {
		    const e = document.getElementById(id);
		    if (e) return requestAnimationFrame(() => resolve(true));
		    let obs;
		    const done = (v) => { try { obs && obs.disconnect(); } catch(e){} requestAnimationFrame(() => resolve(v)); };
		    obs = new MutationObserver(recs => {
		      for (const m of recs) {
		        if (m.type === 'attributes' && m.attributeName === 'id' && m.target.id === id) { return done(true); }
		        if (m.type === 'childList') for (const n of m.addedNodes) {
		          if (n.nodeType === 1) {
		            if (n.id === id) return done(true);
		            const hit = n.querySelector && n.querySelector('#' + CSS.escape(id));
		            if (hit) return done(true);
		          }
		        }
		      }
		    });
		    obs.observe(document, {subtree:true, childList:true, attributes:true, attributeFilter:['id']});
		    setTimeout(() => done(false), timeoutMs);
		  });
		})()`, id, timeoutMs)
	}

	// General selector path
	return fmt.Sprintf(`(function(){
	  const selector = %q; const timeoutMs = %d;
	  return new Promise((resolve) => {
	    if (document.querySelector(selector)) return requestAnimationFrame(() => resolve(true));
	    let obs;
	    const done = (v) => { try { obs && obs.disconnect(); } catch(e){} requestAnimationFrame(() => resolve(v)); };
	    obs = new MutationObserver(() => {
	      if (document.querySelector(selector)) done(true);
	    });
	    obs.observe(document, {subtree:true, childList:true, attributes:true});
	    setTimeout(() => done(false), timeoutMs);
	  });
	})()`, selector, timeoutMs)
}

// buildVisibilityWaitExpression generates JavaScript for visibility checking with polling fallback.
// Uses MutationObserver for attribute changes + polling for CSS rule changes.
func (w *browserSession) buildVisibilityWaitExpression(selector string, timeoutMs int32, checkVisible, checkHidden bool) string {
	// Visibility helper function
	visibilityHelper := `
	  // Check if element is visible using computed styles
	  const isVisible = (el) => {
	    if (!el) return false;
	    const style = window.getComputedStyle(el);
	    if (style.display === 'none') return false;
	    if (style.visibility === 'hidden' || style.visibility === 'collapse') return false;
	    if (style.opacity === '0') return false;
	    const rect = el.getBoundingClientRect();
	    if (rect.width === 0 || rect.height === 0) return false;
	    return true;
	  };`

	var checkElementDef string
	if checkVisible {
		checkElementDef = `const checkElement = (el) => el && isVisible(el);`
	} else if checkHidden {
		checkElementDef = `const checkElement = (el) => !el || !isVisible(el);`
	}

	if htmlIDSelectorPattern.MatchString(selector) {
		// ID-optimized path with visibility checking
		id := selector[1:]
		return fmt.Sprintf(`(function(){
		  const id = %q; const timeoutMs = %d;
		  %s
		  %s
		  return new Promise((resolve) => {
		    const e = document.getElementById(id);
		    if (checkElement(e)) return requestAnimationFrame(() => resolve(true));
		    let obs, pollInterval;
		    const done = (v) => {
		      try { obs && obs.disconnect(); } catch(e){}
		      if (pollInterval) clearInterval(pollInterval);
		      requestAnimationFrame(() => resolve(v));
		    };
		    const check = () => {
		      const el = document.getElementById(id);
		      if (checkElement(el)) done(true);
		    };
		    obs = new MutationObserver(recs => {
		      for (const m of recs) {
		        if (m.type === 'attributes' && m.attributeName === 'id' && m.target.id === id) { check(); return; }
		        if (m.type === 'childList') for (const n of m.addedNodes) {
		          if (n.nodeType === 1) {
		            if (n.id === id) { check(); return; }
		            const hit = n.querySelector && n.querySelector('#' + CSS.escape(id));
		            if (hit) { check(); return; }
		          }
		        }
		      }
		      check();
		    });
		    obs.observe(document, {subtree:true, childList:true, attributes:true, attributeFilter:['id', 'style', 'class']});
		    // Fallback polling for visibility changes via CSS rules (media queries, animations, etc.)
		    pollInterval = setInterval(check, 100);
		    setTimeout(() => done(false), timeoutMs);
		  });
		})()`, id, timeoutMs, visibilityHelper, checkElementDef)
	}

	// General selector path with visibility checking
	return fmt.Sprintf(`(function(){
	  const selector = %q; const timeoutMs = %d;
	  %s
	  %s
	  return new Promise((resolve) => {
	    const e = document.querySelector(selector);
	    if (checkElement(e)) return requestAnimationFrame(() => resolve(true));
	    let obs, pollInterval;
	    const done = (v) => {
	      try { obs && obs.disconnect(); } catch(e){}
	      if (pollInterval) clearInterval(pollInterval);
	      requestAnimationFrame(() => resolve(v));
	    };
	    const check = () => {
	      const el = document.querySelector(selector);
	      if (checkElement(el)) done(true);
	    };
	    obs = new MutationObserver(() => {
	      check();
	    });
	    obs.observe(document, {subtree:true, childList:true, attributes:true, attributeFilter:['style', 'class']});
	    // Fallback polling for visibility changes via CSS rules (media queries, animations, etc.)
	    pollInterval = setInterval(check, 100);
	    setTimeout(() => done(false), timeoutMs);
	  });
	})()`, selector, timeoutMs, visibilityHelper, checkElementDef)
}

func (w *browserSession) getCookies() ([]map[string]any, error) {
	w.assert(runtime.IsTestInternalsMode, "Should only run as part of testing")

	resp, err := w.conn.SendCommand(w.ctx, "Storage.getCookies", map[string]any{})
	if err != nil {
		return nil, err
	}

	result, ok := resp.Result.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("invalid cookie response format")
	}

	cookies, ok := result["cookies"].([]any)
	if !ok {
		return []map[string]any{}, nil // No cookies
	}

	cookieList := make([]map[string]any, 0, len(cookies))
	for _, c := range cookies {
		if cookie, ok := c.(map[string]any); ok {
			cookieList = append(cookieList, cookie)
		}
	}

	return cookieList, nil
}

func (w *browserSession) getBrowserState(state string) testing.BrowserState {
	w.assert(runtime.IsTestInternalsMode, "Should only run as part of testing")

	cookies, err := w.getCookies()
	if err != nil {
		return testing.BrowserState{
			State:            state,
			Cookies:          []testing.CookieInfo{},
			ConsoleErrorLogs: int(w.consoleErrors.Load()),
			BrowserErrors:    int(w.browserErrors.Load()),
		}
	}

	cookieInfos := make([]testing.CookieInfo, 0, len(cookies))
	for _, cookie := range cookies {
		name, hasName := cookie["name"].(string)
		domain, _ := cookie["domain"].(string)
		if hasName {
			cookieInfos = append(cookieInfos, testing.CookieInfo{
				Name:   name,
				Domain: domain,
			})
		}
	}

	// Sort for deterministic ordering (prevents snapshot flakiness)
	sort.SliceStable(cookieInfos, func(i, j int) bool {
		if cookieInfos[i].Name != cookieInfos[j].Name {
			return cookieInfos[i].Name < cookieInfos[j].Name
		}
		return cookieInfos[i].Domain < cookieInfos[j].Domain
	})

	return testing.BrowserState{
		State:            state,
		Cookies:          cookieInfos,
		ConsoleErrorLogs: int(w.consoleErrors.Load()),
		BrowserErrors:    int(w.browserErrors.Load()),
	}
}

// tryUpdateTestModeOutput captures a browser state snapshot and updates the test output if in test mode.
// If markComplete is true, it also marks the output as complete (should be true for the final snapshot).
func (w *browserSession) tryUpdateTestModeOutput(req *workerRequest, state string, markComplete bool) {
	testInput := req.tryGetTestModeInput()
	if testInput == nil {
		return
	}

	w.assert(runtime.IsTestInternalsMode, "Should only run as part of testing")
	browserState := w.getBrowserState(state)
	testing.UpdateTestOutput(testInput.ID, func(output *testing.PdfInternalsTestOutput) {
		output.BrowserStates = append(output.BrowserStates, browserState)
		if markComplete {
			output.MarkComplete()
		}
	})
}

func (w *browserSession) cleanupBrowser(req *workerRequest) {
	if req.cleanedUp {
		return
	}

	u, err := url.ParseRequestURI(req.request.URL)
	w.assert(err == nil, "URL should be validated at API layer")

	now := time.Now()
	w.logger.Info("Sending cleanup batch command")
	// Not using request context here, the client might have dropped out already and we should always complete cleanup
	responses := w.conn.SendCommandBatch(w.ctx, []cdp.Command{
		{Method: "Storage.clearDataForOrigin", Params: map[string]any{
			"origin":       fmt.Sprintf("%s://%s", u.Scheme, u.Host),
			"storageTypes": "all",
		}},
		{Method: "Storage.clearCookies", Params: nil},
		{Method: "Network.clearBrowserCache", Params: nil},
		{Method: "Page.resetNavigationHistory", Params: nil},
	})
	w.logger.Info("Cleanup batch command completed", "duration", time.Since(now))

	var errors strings.Builder
	for _, response := range responses {
		if response.Err != nil {
			errors.WriteString(response.Err.Error())
			errors.WriteByte('\n')
		}
		if response.Resp.Error != nil {
			json, _ := json.Marshal(response.Resp.Error)
			errors.WriteString(string(json))
			errors.WriteByte('\n')
		}
	}

	if errors.Len() != 0 {
		w.assertA(false, "Errors from browser cleanup", "error", errors.String())
	}

	req.cleanedUp = true
}

func (w *browserSession) assert(condition bool, message string) {
	if w.currentRequest != nil {
		assert.AssertWithMessage(condition, message, "id", w.id, "url", w.currentRequest.request.URL)
	} else {
		assert.AssertWithMessage(condition, message, "id", w.id)
	}
}

func (w *browserSession) assertA(condition bool, message string, userArgs ...any) {
	if w.currentRequest != nil {
		args := make([]any, 0, 2+2+len(userArgs))
		args = append(args, "id", w.id)
		args = append(args, "url", w.currentRequest.request.URL)
		args = append(args, userArgs...)
		assert.AssertWithMessage(condition, message, args...)
	} else {
		args := make([]any, 0, 2+len(userArgs))
		args = append(args, "id", w.id)
		args = append(args, userArgs...)
		assert.AssertWithMessage(condition, message, args...)
	}
}

func (w *browserSession) close() {
	w.logger.Info("Closing worker")

	if w.cancel != nil {
		w.cancel()
	}
	if w.queue != nil {
		close(w.queue)
	}

	if w.conn != nil {
		if err := w.conn.Close(); err != nil {
			w.logger.Error("Failed to close connection", "error", err)
		}
	}

	if w.browser != nil {
		if err := w.browser.Close(); err != nil {
			w.logger.Error("Failed to close browser", "error", err)
		}
	}

	w.logger.Info("Worker closed")
}

// paperFormats defines standard paper sizes in inches (compatible with Puppeteer)
// See source: https://github.com/puppeteer/puppeteer/blob/f5d922c19e61acb4205a86780967360f3531faef/packages/puppeteer-core/src/common/PDFOptions.ts#L30-L70
var paperFormats = map[string]struct{ width, height float64 }{
	"letter":  {8.5, 11},
	"legal":   {8.5, 14},
	"tabloid": {11, 17},
	"ledger":  {17, 11},
	"a0":      {33.1, 46.8},
	"a1":      {23.4, 33.1},
	"a2":      {16.54, 23.4},
	"a3":      {11.7, 16.54},
	"a4":      {8.27, 11.7},
	"a5":      {5.83, 8.27},
	"a6":      {4.13, 5.83},
}

var unitToPixels = map[string]float64{
	"px": 1,
	"in": 96,
	"cm": 37.8,
	"mm": 3.78,
}

// convertMargin converts margin strings to inches (compatible with Puppeteer)
// Supports: px, in, cm, mm
// Numbers without units are treated as pixels
func convertMargin(margin string) float64 {
	margin = strings.TrimSpace(margin)
	if margin == "" {
		return 0.0
	}

	var pixels float64
	var unit string
	var valueStr string

	// Check if margin has a unit suffix
	if len(margin) >= 2 {
		possibleUnit := strings.ToLower(margin[len(margin)-2:])
		if _, ok := unitToPixels[possibleUnit]; ok {
			unit = possibleUnit
			valueStr = margin[:len(margin)-2]
		}
	}

	// If no recognized unit, treat as pixels
	if unit == "" {
		unit = "px"
		valueStr = margin
	}

	// Parse the numeric value
	value, err := strconv.ParseFloat(strings.TrimSpace(valueStr), 64)
	if err != nil {
		return 0.0
	}

	// Convert to pixels
	pixels = value * unitToPixels[unit]

	// Convert pixels to inches (96 pixels = 1 inch)
	return pixels / 96.0
}

// htmlIDSelectorPattern matches pure ID selectors like #myId, #my-id, #my_id
// but rejects complex selectors like #id.class, #id[attr], #id > child, etc.
// Allows any HTML5 ID characters except CSS selector metacharacters.
var htmlIDSelectorPattern = regexp.MustCompile(`^#[^\s.:\[\]>+~,()]+$`)

// contextErrorToPDFError checks if an error is context-related and returns the appropriate PDFError.
// If the error is context.Canceled, it returns ErrClientDropped.
// If the error is context.DeadlineExceeded, it returns ErrTimeout.
// Otherwise, it returns a PDFError with the fallback error type.
func contextErrorToPDFError(err error, fallbackType error, detail string) *types.PDFError {
	if err == nil {
		return nil
	}

	// Check if the error is context-related
	if errors.Is(err, context.Canceled) {
		return types.NewPDFError(types.ErrClientDropped, detail, err)
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return types.NewPDFError(types.ErrTimeout, detail, err)
	}

	// Not a context error, use the fallback type
	return types.NewPDFError(fallbackType, detail, err)
}
