package generator

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
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
	browser  *browser.Process
	conn     cdp.Connection
	targetID string

	queue chan workerRequest
	state atomic.Uint32

	// Current request
	currentUrl string

	// Error tracking for current request
	consoleErrors atomic.Int32
	browserErrors atomic.Int32

	// Shutdown coordination
	ctx    context.Context
	cancel context.CancelFunc
}

func newBrowserSession(id int) (*browserSession, error) {
	ctx, cancel := context.WithCancel(context.Background())
	w := &browserSession{
		id:     id,
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
			log.Printf("ERROR: Worker %d failed to connect AND failed to close browser: %v - process is lingering!\n", id, closeErr)
		}
		return nil, fmt.Errorf("failed to connect to browser: %w", err)
	}

	// Enable required domains
	_, err = w.sendCommand("Page.enable", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to call Page.enable: %w", err)
	}

	_, err = w.sendCommand("Runtime.enable", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to enable Runtime.enable: %w", err)
	}

	_, err = w.sendCommand("Log.enable", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to enable Log.enable: %w", err)
	}

	go w.handleRequests()

	log.Printf("Browser worker %d initialized successfully\n", id)
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

func (w *browserSession) handleEvent(method string, params interface{}) {
	switch method {
	case "Runtime.consoleAPICalled":
		if p, ok := params.(map[string]interface{}); ok {
			if apiType, ok := p["type"].(string); ok && apiType == "error" {
				w.consoleErrors.Add(1)
				log.Printf("[%d, %s] console error: %v\n", w.id, w.currentUrl, p)
			}
		}
	case "Log.entryAdded":
		if p, ok := params.(map[string]interface{}); ok {
			if entry, ok := p["entry"].(map[string]interface{}); ok {
				if level, ok := entry["level"].(string); ok && level == "error" {
					w.browserErrors.Add(1)
					log.Printf("[%d, %s] log error: %v\n", w.id, w.currentUrl, entry)
				}
			}
		}
	}
}

func (w *browserSession) sendCommand(method string, params interface{}) (*cdp.CDPResponse, error) {
	return w.conn.SendCommand(w.ctx, method, params)
}

func (w *browserSession) handleRequests() {
	defer func() {
		assert.AssertWithMessage(w.ctx.Err() != nil, "Exited worker loop, but process isn't shutting down")
	}()

	for {
		select {
		case <-w.ctx.Done():
			log.Printf("Worker %d: request processing loop shutting down (context cancellation)\n", w.id)
			return
		case req, ok := <-w.queue:
			if !ok {
				assert.AssertWithMessage(w.ctx.Err() != nil, "Queue channel closed, but process is not shutting down")
				return
			}

			// Reset error counters for this request
			w.consoleErrors.Store(0)
			w.browserErrors.Store(0)
			w.tryUpdateTestModeOutput(&req, "Before", false)

			w.currentUrl = req.request.URL
			w.handleRequest(&req)
			w.currentUrl = ""

			if !req.hasResponded() {
				log.Fatalf("[%d, %s] did not respond to request\n", w.id, w.currentUrl)
			}

			w.tryUpdateTestModeOutput(&req, "After", true)
		}
	}
}

func (w *browserSession) handleRequest(req *workerRequest) {
	log.Printf("[%d, %s] processing PDF request\n", w.id, w.currentUrl)
	start := time.Now()

	defer func() {
		if r := recover(); r != nil {
			log.Printf("[%d, %s] recovered from panic: %v\n", w.id, w.currentUrl, r)
			req.tryRespondError(types.NewPDFError(types.ErrGenerationFail, req.request.URL, fmt.Errorf("%v", r)))
		}

		duration := time.Since(start)
		log.Printf("[%d, %s] completed PDF request in %.2f seconds\n", w.id, w.currentUrl, duration.Seconds())
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

	// Ensure cleanup always runs
	defer func() {
		// When we get here we can already accept a request into the queue
		// Cleanup should run fairly fast (low ms range)

		// Capture browser state before cleanup (for test internals mode)
		w.tryUpdateTestModeOutput(req, "BeforeCleanup", false)

		// Navigate back to default
		start := time.Now()
		_, err := w.sendCommand("Page.navigate", map[string]interface{}{
			"url": "about:blank",
		})
		if err != nil {
			log.Printf("[%d, %s] failed to navigate out of url: %v\n", w.id, w.currentUrl, err)
		}

		if testInput := req.tryGetTestModeInput(); testInput != nil && testInput.CleanupDelaySeconds > 0 {
			log.Printf("[%d, %s] waiting for %d seconds\n", w.id, w.currentUrl, testInput.CleanupDelaySeconds)
			time.Sleep(time.Duration(testInput.CleanupDelaySeconds) * time.Second)
		}

		// Cleanup browser storage
		w.cleanupBrowser(req)

		// Retry cleanup if it failed
		if !req.cleanedUp {
			log.Printf("[%d, %s] failed to cleanup storage, retrying...\n", w.id, w.currentUrl)
			for range 3 {
				w.cleanupBrowser(req)
				if req.cleanedUp {
					break
				}
			}

			if !req.cleanedUp {
				log.Fatalf("[%d, %s] failed to cleanup storage, we're in an unsafe state and can't proceed", w.id, w.currentUrl)
			}
		}

		duration := time.Since(start)
		log.Printf("[%d, %s] cleanup completed in %.2f seconds\n", w.id, w.currentUrl, duration.Seconds())
	}()

	// Set cookies
	if len(request.Cookies) > 0 {
		if req.ctx.Err() != nil {
			return types.NewPDFError(types.ErrClientDropped, "", req.ctx.Err())
		}

		// Build cookies array for Network.setCookies
		cookies := make([]map[string]interface{}, 0, len(request.Cookies))
		for _, cookie := range request.Cookies {
			sameSite := "Lax"
			switch cookie.SameSite {
			case "Strict":
				sameSite = "Strict"
			case "None":
				sameSite = "None"
			}

			cookies = append(cookies, map[string]interface{}{
				"name":     cookie.Name,
				"value":    cookie.Value,
				"domain":   cookie.Domain,
				"path":     "/",
				"secure":   false,
				"httpOnly": false,
				"sameSite": sameSite,
			})
		}

		// Set all cookies in a single batch call
		_, err := w.sendCommand("Network.setCookies", map[string]interface{}{
			"cookies": cookies,
		})
		if err != nil {
			req.tryRespondError(types.NewPDFError(types.ErrSetCookieFail, "", err))
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

	_, err := w.sendCommand("Page.navigate", map[string]interface{}{
		"url": request.URL,
	})
	if err != nil {
		req.tryRespondError(types.NewPDFError(types.ErrGenerationFail, "", err))
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

		var waitSelector string
		var timeoutMs int32 = 25000 // default timeout

		if selector, ok := request.WaitFor.AsString(); ok {
			waitSelector = selector
		} else if timeout, ok := request.WaitFor.AsTimeout(); ok {
			time.Sleep(time.Duration(timeout) * time.Millisecond)
		} else if opts, ok := request.WaitFor.AsOptions(); ok {
			// Full options with selector, visible, hidden, timeout
			waitSelector = opts.Selector
			if opts.Timeout != nil {
				timeoutMs = *opts.Timeout
			}
			// TODO: Implement visible/hidden support if needed
		}

		// If we have a selector to wait for, use MutationObserver
		if waitSelector != "" {
			// Wait for element using MutationObserver via a single Runtime.evaluate with awaitPromise
			// Match gorod's behavior: if selector is an id ("#id"), use an optimized observer; otherwise use a generic selector observer.
			var expression string
			if waitSelector[0] == '#' {
				id := waitSelector[1:]
				expression = fmt.Sprintf(`(function(){
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
			} else {
				selector := waitSelector
				expression = fmt.Sprintf(`(function(){
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

			resp, err := w.sendCommand("Runtime.evaluate", map[string]interface{}{
				"expression":    expression,
				"awaitPromise":  true,
				"returnByValue": true,
			})
			if err != nil {
				log.Printf("[%d, %s] failed to wait for element %q: %v\n", w.id, w.currentUrl, waitSelector, err)
				req.tryRespondError(types.NewPDFError(types.ErrElementNotReady, fmt.Sprintf("element %q", waitSelector), err))
				return nil
			}

			// Expect a boolean result indicating whether the element was found within timeout
			if result, ok := resp.Result.(map[string]interface{}); ok {
				if resultObj, ok := result["result"].(map[string]interface{}); ok {
					if value, ok := resultObj["value"].(bool); ok {
						if !value {
							log.Printf("[%d, %s] failed to wait for element %q: timeout\n", w.id, w.currentUrl, waitSelector)
							req.tryRespondError(types.NewPDFError(types.ErrElementNotReady, fmt.Sprintf("element %q", waitSelector), fmt.Errorf("timeout")))
							return nil
						}
					} else {
						log.Printf("[%d, %s] unexpected evaluation result type waiting for %q\n", w.id, w.currentUrl, waitSelector)
					}
				}
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
	pdfParams := map[string]interface{}{
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
			log.Printf("[%d, %s] unknown paper format %q, using default\n", w.id, w.currentUrl, request.Options.Format)
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

	resp, err := w.sendCommand("Page.printToPDF", pdfParams)
	if err != nil {
		req.tryRespondError(types.NewPDFError(types.ErrGenerationFail, "", err))
		return nil
	}

	// Extract PDF data
	result, ok := resp.Result.(map[string]interface{})
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

func (w *browserSession) getCookies() ([]map[string]interface{}, error) {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")

	resp, err := w.sendCommand("Network.getCookies", map[string]interface{}{})
	if err != nil {
		return nil, err
	}

	result, ok := resp.Result.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid cookie response format")
	}

	cookies, ok := result["cookies"].([]interface{})
	if !ok {
		return []map[string]interface{}{}, nil // No cookies
	}

	cookieList := make([]map[string]interface{}, 0, len(cookies))
	for _, c := range cookies {
		if cookie, ok := c.(map[string]interface{}); ok {
			cookieList = append(cookieList, cookie)
		}
	}

	return cookieList, nil
}

func (w *browserSession) getBrowserState(state string) testing.BrowserState {
	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")

	cookies, err := w.getCookies()
	if err != nil {
		return testing.BrowserState{
			State:            state,
			Cookies:          []string{},
			ConsoleErrorLogs: int(w.consoleErrors.Load()),
			BrowserErrors:    int(w.browserErrors.Load()),
		}
	}

	cookieNames := make([]string, 0, len(cookies))
	for _, cookie := range cookies {
		if name, ok := cookie["name"].(string); ok {
			cookieNames = append(cookieNames, name)
		}
	}

	return testing.BrowserState{
		State:            state,
		Cookies:          cookieNames,
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

	assert.AssertWithMessage(runtime.IsTestInternalsMode, "Should only run as part of testing")
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

	// Clear storage data for the origin using CDP command
	_, err := w.sendCommand("Storage.clearDataForOrigin", map[string]interface{}{
		"origin":       req.request.URL,
		"storageTypes": "all",
	})

	req.cleanedUp = err == nil
}

func (w *browserSession) close() {
	log.Printf("Worker %d closing...\n", w.id)

	if w.cancel != nil {
		w.cancel()
	}
	if w.queue != nil {
		close(w.queue)
	}

	if w.conn != nil {
		if err := w.conn.Close(); err != nil {
			log.Printf("Worker %d: Failed to close connection: %v\n", w.id, err)
		}
	}

	if w.browser != nil {
		if err := w.browser.Close(); err != nil {
			log.Printf("ERROR: Worker %d failed to close browser: %v\n", w.id, err)
		}
	}

	log.Printf("Worker %d closed\n", w.id)
}
