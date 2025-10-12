package generator

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os/exec"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"altinn.studio/pdf3/internal/cdp"
	"altinn.studio/pdf3/internal/concurrent"
	"altinn.studio/pdf3/internal/types"
	"github.com/gorilla/websocket"
)

// paperFormats defines standard paper sizes in inches (compatible with Puppeteer)
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

type Custom struct {
	wg             sync.WaitGroup
	browserVersion types.BrowserVersion

	// Browser instances
	// We keep two sessions but only execute 1 PDF generation request at a time
	// The reason we have 2 browsers open is because we can process a new request on session B
	// as soon we start cleanup on session A
	browserA *browserSession
	browserB *browserSession

	mu sync.Mutex
}

type SessionState uint32

const (
	SessionStateReady SessionState = iota
	SessionStateGenerating
	SessionStateCleaningUp
)

type browserSession struct {
	id           int
	cmd          *exec.Cmd
	wsConn       *websocket.Conn
	debugPort    string
	debugBaseURL string
	targetID     string
	queue        chan workerRequest
	state        atomic.Uint32

	// Current request
	currentUrl string

	// Command ID management
	nextCommandID int64
	pendingCmds   *concurrent.Map[int64, chan cdp.CDPResponse]
}

func New() (*Custom, error) {
	log.Printf("Starting Custom CDP with %d browser workers\n", 2)

	generator := &Custom{}

	go func() {
		log.Printf("Initializing Custom CDP\n")

		// Get browser version using a temporary browser instance
		cmd, _, debugBaseURL, err := createBrowserProcess(-1)
		if err != nil {
			log.Fatalf("Failed to create temporary browser for version info: %v", err)
		}
		defer func() {
			if cmd != nil && cmd.Process != nil {
				if err := cmd.Process.Kill(); err != nil {
					log.Printf("WARNING: Failed to kill temporary browser process (PID %d): %v - process may be lingering", cmd.Process.Pid, err)
				}
				// Wait() error is expected (killed processes return error), so we can ignore it
				_ = cmd.Wait()
			}
		}()

		// Connect to get version only
		_, conn, err := cdp.ConnectToPageTarget(-1, debugBaseURL)
		if err != nil {
			log.Fatalf("Failed to connect to temporary browser: %v", err)
		}
		defer func() {
			if conn != nil {
				// Closing WebSocket during init - connection will be recreated anyway
				_ = conn.Close()
			}
		}()

		// Get browser version using direct CDP command
		version, err := getBrowserVersionFromConnection(conn)
		if err != nil {
			log.Fatalf("Failed to get browser version: %v", err)
		}

		generator.browserVersion = *version
		log.Printf("Chrome version: %s (revision: %s, protocol: %s)\n",
			version.Product, version.Revision, version.ProtocolVersion)

		init := func(i int, res chan<- *browserSession) {
			defer generator.wg.Done()
			log.Printf("Starting browser worker %d\n", i)

			session, err := newBrowserSession(i)
			if err != nil {
				log.Fatalf("Failed to create worker %d: %v", i, err)
			}

			res <- session
			log.Printf("Browser worker %d started successfully\n", i)
			session.run()
			log.Printf("Browser worker %d terminated\n", i)
		}

		sessions := make(chan *browserSession, 2)

		generator.wg.Add(1)
		go init(1, sessions)
		generator.wg.Add(1)
		go init(2, sessions)

		generator.browserA = <-sessions
		generator.browserB = <-sessions
	}()

	return generator, nil
}

func (g *Custom) IsReady() bool {
	return g.browserA != nil && g.browserB != nil
}

func (g *Custom) Generate(ctx context.Context, request types.PdfRequest) (*types.PdfResult, *types.PDFError) {
	responder := make(chan workerResponse, 1)
	req := workerRequest{
		request:   request,
		responder: responder,
		ctx:       ctx,
		cleanedUp: false,
	}

	var returnErr *types.PDFError = nil
	g.mu.Lock()
	stateA := g.browserA.state.Load()
	stateB := g.browserB.state.Load()
	// If either of the workers are currently generating a PDF, we can't process the request
	if stateA == uint32(SessionStateGenerating) || stateB == uint32(SessionStateGenerating) {
		log.Printf("Request queue full, rejecting request for URL: %s\n", request.URL)
		returnErr = types.NewPDFError(types.ErrQueueFull, "", nil)
	} else {
		// If none of the sessions are generating,
		// let's pick the one that is "the most" ready.
		// If none of them are ready, we pick one that is currently cleaning up.
		// The cleanup procedure is fairly low latency.
		if stateA == uint32(SessionStateReady) {
			g.browserA.queue <- req
		} else if stateB == uint32(SessionStateReady) {
			g.browserB.queue <- req
		} else if stateA == uint32(SessionStateCleaningUp) {
			g.browserA.queue <- req
		} else if stateB == uint32(SessionStateCleaningUp) {
			g.browserB.queue <- req
		} else {
			log.Printf("Request queue full, rejecting request for URL: %s\n", request.URL)
			returnErr = types.NewPDFError(types.ErrQueueFull, "", nil)
		}
	}
	g.mu.Unlock()
	if returnErr != nil {
		return nil, returnErr
	}

	select {
	case response := <-responder:
		if response.Error != nil {
			return nil, response.Error
		}
		return &types.PdfResult{
			Data:    response.Data,
			Browser: g.browserVersion,
		}, nil
	case <-ctx.Done():
		return nil, types.NewPDFError(types.ErrClientDropped, "", ctx.Err())
	case <-time.After(30 * time.Second):
		log.Printf("Client timeout waiting for PDF generation (30s) for URL: %s - abandoning request\n", request.URL)
		return nil, types.NewPDFError(types.ErrTimeout, "", nil)
	}
}

func (g *Custom) Close() error {
	// close(g.queue)
	g.wg.Wait()
	return nil
}

type workerRequest struct {
	request   types.PdfRequest
	responder chan workerResponse
	ctx       context.Context
	cleanedUp bool
}

func (r *workerRequest) tryRespondOk(data []byte) {
	if r.responder != nil {
		response := workerResponse{
			Data:  data,
			Error: nil,
		}
		select {
		case r.responder <- response:
			log.Printf("Worker: responded successfully for URL: %s, data size: %d bytes\n", r.request.URL, len(data))
			break
		default:
			log.Printf("Worker: client abandoned request (likely timed out), dropping response for URL: %s\n", r.request.URL)
		}
		r.responder = nil
	}
}

func (r *workerRequest) tryRespondError(err *types.PDFError) {
	if r.responder != nil {
		response := workerResponse{
			Data:  nil,
			Error: err,
		}
		select {
		case r.responder <- response:
			log.Printf("Worker: responded with error for URL: %s\n", r.request.URL)
			break
		default:
			log.Printf("Worker: client abandoned request (likely timed out), dropping response for URL: %s\n", r.request.URL)
		}
		r.responder = nil
	}
}

func (r *workerRequest) hasResponded() bool {
	return r.responder == nil
}

type workerResponse struct {
	Data  []byte
	Error *types.PDFError
}

// createBrowserProcess starts a new Chrome/Chromium process with the specified arguments
func createBrowserProcess(id int) (*exec.Cmd, string, string, error) {
	args := createBrowserArgs()

	// Override user data directory for this worker and set specific port
	debugPort := 5050 + id
	if id == -1 {
		debugPort = 5049 // Special case for init worker
	}

	for i, arg := range args {
		if strings.HasPrefix(arg, "--user-data-dir=") {
			if id >= 0 {
				args[i] = fmt.Sprintf("--user-data-dir=/tmp/browser-%d", id)
			} else {
				args[i] = "--user-data-dir=/tmp/browser-init"
			}
		}
		if strings.HasPrefix(arg, "--remote-debugging-port=") {
			args[i] = fmt.Sprintf("--remote-debugging-port=%d", debugPort)
		}
	}

	// Add about:blank argument to create default page target
	args = append(args, "about:blank")

	// Only log args for the init worker (id == -1)
	if id == -1 {
		logArgs(args)
	}

	cmd := exec.Command("/headless-shell/headless-shell", args...)
	debugPortStr := fmt.Sprintf("%d", debugPort)
	debugBaseURL := fmt.Sprintf("http://127.0.0.1:%d", debugPort)

	// Start the browser process
	if err := cmd.Start(); err != nil {
		return nil, "", "", fmt.Errorf("failed to start browser process: %w", err)
	}

	return cmd, debugPortStr, debugBaseURL, nil
}

func newBrowserSession(id int) (*browserSession, error) {
	w := &browserSession{
		id:            id,
		nextCommandID: 1,
		pendingCmds:   concurrent.NewMap[int64, chan cdp.CDPResponse](),
		queue:         make(chan workerRequest, 1),
		state:         atomic.Uint32{},
	}
	w.state.Store(uint32(SessionStateReady))

	// Create browser process
	var err error
	w.cmd, w.debugPort, w.debugBaseURL, err = createBrowserProcess(id)
	if err != nil {
		return nil, err
	}

	// Connect to the existing page target (about:blank)
	var conn *websocket.Conn
	w.targetID, conn, err = cdp.ConnectToPageTarget(id, w.debugBaseURL)
	if err != nil {
		if killErr := w.cmd.Process.Kill(); killErr != nil {
			log.Printf("ERROR: Worker %d failed to connect AND failed to kill browser process (PID %d): %v - process is lingering!", id, w.cmd.Process.Pid, killErr)
		}
		return nil, fmt.Errorf("failed to connect to page target: %w", err)
	}
	w.wsConn = conn

	// Start message handler
	go w.handleWebSocketMessages()

	log.Printf("Browser worker %d initialized successfully\n", id)
	return w, nil
}

func (w *browserSession) handleWebSocketMessages() {
	for {
		_, msgBytes, err := w.wsConn.ReadMessage()
		if err != nil {
			log.Printf("Worker %d: WebSocket read error: %v", w.id, err)
			return
		}

		var msg cdp.CDPMessage
		if err := json.Unmarshal(msgBytes, &msg); err != nil {
			log.Printf("Worker %d: JSON unmarshal error: %v", w.id, err)
			continue
		}

		if msg.ID != nil {
			// This is a response to a command
			if responseCh, ok := w.pendingCmds.GetAndDelete(*msg.ID); ok {
				select {
				case responseCh <- cdp.CDPResponse{
					ID:     msg.ID,
					Result: msg.Result,
					Error:  msg.Error,
				}:
				case <-time.After(1 * time.Second):
					log.Printf("Worker %d: timeout sending response for command %d", w.id, *msg.ID)
				}
			}
		} else if msg.Method != "" {
			// This is an event
			w.handleEvent(msg)
		}
	}
}

func (w *browserSession) handleEvent(msg cdp.CDPMessage) {
	switch msg.Method {
	case "Runtime.consoleAPICalled":
		if params, ok := msg.Params.(map[string]interface{}); ok {
			if apiType, ok := params["type"].(string); ok && apiType == "error" {
				errorJson, err := json.MarshalIndent(params, "", "  ")
				if err != nil {
					log.Printf("[%d, %s] console error: %v\n", w.id, w.currentUrl, params)
				} else {
					log.Printf("[%d, %s] console error: %s\n", w.id, w.currentUrl, string(errorJson))
				}
			}
		}
	case "Log.entryAdded":
		if params, ok := msg.Params.(map[string]interface{}); ok {
			if entry, ok := params["entry"].(map[string]interface{}); ok {
				if level, ok := entry["level"].(string); ok && level == "error" {
					errorJson, err := json.MarshalIndent(entry, "", "  ")
					if err != nil {
						log.Printf("[%d, %s] log error: %v\n", w.id, w.currentUrl, entry)
					} else {
						log.Printf("[%d, %s] log error: %s\n", w.id, w.currentUrl, string(errorJson))
					}
				}
			}
		}
	}
}

func (w *browserSession) sendCommand(method string, params interface{}) (*cdp.CDPResponse, error) {
	cmdID := w.nextCommandID
	w.nextCommandID++

	cmd := cdp.CDPCommand{
		ID:     cmdID,
		Method: method,
		Params: params,
	}

	responseCh := make(chan cdp.CDPResponse, 1)
	w.pendingCmds.Set(cmdID, responseCh)

	// Send command
	err := w.wsConn.WriteJSON(cmd)
	if err != nil {
		w.pendingCmds.GetAndDelete(cmdID)
		return nil, fmt.Errorf("failed to send command: %w", err)
	}

	// Wait for response
	select {
	case response := <-responseCh:
		if response.Error != nil {
			return nil, fmt.Errorf("CDP error: %v", response.Error)
		}
		return &response, nil
	case <-time.After(30 * time.Second):
		w.pendingCmds.GetAndDelete(cmdID)
		return nil, fmt.Errorf("timeout waiting for response to command %s", method)
	}
}

func (w *browserSession) run() {
	defer w.close()

	for req := range w.queue {
		w.state.Store(uint32(SessionStateGenerating))
		w.currentUrl = req.request.URL
		w.handleRequest(&req)
		w.currentUrl = ""

		if !req.hasResponded() {
			log.Fatalf("[%d, %s] did not respond to request\n", w.id, w.currentUrl)
		}
		w.state.Store(uint32(SessionStateReady))
	}
	log.Printf("Worker %d shutting down\n", w.id)
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
		w.state.Store(uint32(SessionStateCleaningUp))

		// Navigate back to default
		start := time.Now()
		_, err := w.sendCommand("Page.navigate", map[string]interface{}{
			"url": "about:blank",
		})
		if err != nil {
			log.Printf("[%d, %s] failed to navigate out of url: %v", w.id, w.currentUrl, err)
		}

		// Cleanup browser storage
		w.cleanupBrowser(req)

		// Retry cleanup if it failed
		if !req.cleanedUp {
			log.Printf("[%d, %s] failed to cleanup storage, retrying...", w.id, w.currentUrl)
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

	// Enable required domains
	// _, err := w.sendCommand("Page.enable", nil)
	// if err != nil {
	// 	req.tryRespondError(types.NewPDFError(types.ErrGenerationFail, "", err))
	// 	return nil
	// }

	// _, err = w.sendCommand("Runtime.enable", nil)
	// if err != nil {
	// 	req.tryRespondError(types.NewPDFError(types.ErrGenerationFail, "", err))
	// 	return nil
	// }

	// _, err = w.sendCommand("Log.enable", nil)
	// if err != nil {
	// 	req.tryRespondError(types.NewPDFError(types.ErrGenerationFail, "", err))
	// 	return nil
	// }

	// Set cookies
	for _, cookie := range request.Cookies {
		if req.ctx.Err() != nil {
			return types.NewPDFError(types.ErrClientDropped, "", req.ctx.Err())
		}

		sameSite := "Lax"
		switch cookie.SameSite {
		case "Strict":
			sameSite = "Strict"
		case "None":
			sameSite = "None"
		}

		_, err := w.sendCommand("Network.setCookie", map[string]interface{}{
			"name":     cookie.Name,
			"value":    cookie.Value,
			"domain":   cookie.Domain,
			"path":     "/",
			"secure":   false,
			"httpOnly": false,
			"sameSite": sameSite,
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
				log.Printf("[%d, %s] failed to wait for element %q: %v", w.id, w.currentUrl, waitSelector, err)
				req.tryRespondError(types.NewPDFError(types.ErrElementNotReady, fmt.Sprintf("element %q", waitSelector), err))
				return nil
			}

			// Expect a boolean result indicating whether the element was found within timeout
			if result, ok := resp.Result.(map[string]interface{}); ok {
				if resultObj, ok := result["result"].(map[string]interface{}); ok {
					if value, ok := resultObj["value"].(bool); ok {
						if !value {
							log.Printf("[%d, %s] failed to wait for element %q: timeout", w.id, w.currentUrl, waitSelector)
							req.tryRespondError(types.NewPDFError(types.ErrElementNotReady, fmt.Sprintf("element %q", waitSelector), fmt.Errorf("timeout")))
							return nil
						}
					} else {
						log.Printf("[%d, %s] unexpected evaluation result type waiting for %q", w.id, w.currentUrl, waitSelector)
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
		// Default paper size: letter (8.5" x 11")
		"paperWidth":  8.5,
		"paperHeight": 11.0,
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
	if w.wsConn != nil {
		if err := w.wsConn.Close(); err != nil {
			log.Printf("Worker %d: Failed to close WebSocket: %v", w.id, err)
		}
	}

	if w.cmd != nil && w.cmd.Process != nil {
		if err := w.cmd.Process.Kill(); err != nil {
			log.Printf("ERROR: Worker %d failed to kill browser process (PID %d): %v - PROCESS MAY BE LINGERING!", w.id, w.cmd.Process.Pid, err)
		}
		// Wait() error is expected (killed processes return error), so we can ignore it
		_ = w.cmd.Wait()
	}
}

// createBrowserArgs returns the Chrome/Chromium arguments for headless PDF generation
func createBrowserArgs() []string {
	return []string{
		"--disable-background-networking",
		"--disable-background-timer-throttling",
		"--disable-backgrounding-occluded-windows",
		"--disable-breakpad",
		"--disable-client-side-phishing-detection",
		"--disable-default-apps",
		"--disable-dev-shm-usage",
		"--disable-extensions",
		"--disable-features=site-per-process,Translate,BlinkGenPropertyTrees",
		"--disable-font-subpixel-positioning",
		"--disable-hang-monitor",
		"--disable-ipc-flooding-protection",
		"--disable-popup-blocking",
		"--disable-prompt-on-repost",
		"--disable-renderer-backgrounding",
		"--disable-sync",
		"--enable-automation",
		"--enable-features=NetworkService,NetworkServiceInProcess",
		"--font-render-hinting=none",
		"--force-color-profile=srgb",
		"--headless",
		"--hide-scrollbars",
		"--metrics-recording-only",
		"--mute-audio",
		"--no-default-browser-check",
		"--no-first-run",
		"--no-sandbox",
		"--password-store=basic",
		"--remote-debugging-port=0",
		"--safebrowsing-disable-auto-update",
		"--use-mock-keychain",
		"--user-data-dir=/tmp/browser-init",
	}
}

// logArgs logs browser arguments in a sorted, JSON format
func logArgs(args []string) {
	sortedArgs := make([]string, len(args))
	copy(sortedArgs, args)
	sort.Strings(sortedArgs)
	argsAsJson, err := json.MarshalIndent(sortedArgs, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal browser args to JSON: %v", err)
	}
	log.Printf("Browser args: %v", string(argsAsJson))
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

	// Unit to pixels conversion (matching Puppeteer)

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
		log.Printf("Failed to parse margin value %q: %v, using 0\n", margin, err)
		return 0.0
	}

	// Convert to pixels
	pixels = value * unitToPixels[unit]

	// Convert pixels to inches (96 pixels = 1 inch)
	return pixels / 96.0
}

// mapCustomError wraps raw custom implementation errors while preserving our PDFErrors
func mapCustomError(err error) *types.PDFError {
	if err == nil {
		return nil
	}

	// Check if it's already our custom error type
	var pdfErr *types.PDFError
	if errors.As(err, &pdfErr) {
		return pdfErr
	}

	// Wrap other errors
	return types.NewPDFError(types.ErrUnhandledBrowserError, "", err)
}

// getBrowserVersionFromConnection gets browser version using a direct WebSocket connection
func getBrowserVersionFromConnection(conn *websocket.Conn) (*types.BrowserVersion, error) {
	cmd := cdp.CDPCommand{
		ID:     1,
		Method: "Browser.getVersion",
		Params: nil,
	}

	// Send command
	err := conn.WriteJSON(cmd)
	if err != nil {
		return nil, fmt.Errorf("failed to send Browser.getVersion command: %w", err)
	}

	// Wait for response
	_, msgBytes, err := conn.ReadMessage()
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var msg cdp.CDPMessage
	if err := json.Unmarshal(msgBytes, &msg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if msg.Error != nil {
		return nil, fmt.Errorf("CDP error: %v", msg.Error)
	}

	result, ok := msg.Result.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid response format")
	}

	return &types.BrowserVersion{
		Product:         cdp.GetStringFromMap(result, "product"),
		ProtocolVersion: cdp.GetStringFromMap(result, "protocolVersion"),
		Revision:        cdp.GetStringFromMap(result, "revision"),
		UserAgent:       cdp.GetStringFromMap(result, "userAgent"),
		JSVersion:       cdp.GetStringFromMap(result, "jsVersion"),
	}, nil
}
