package generator

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/browser"
	"altinn.studio/pdf3/internal/cdp"
	"altinn.studio/pdf3/internal/config"
	"altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/telemetry"
	"altinn.studio/pdf3/internal/telemetry/attr"
	"altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/internal/types"
)

//nolint:containedctx // The session owns a shared cancellation context for its long-lived browser connection.
type browserSession struct {
	conn              cdp.Connection
	tracer            trace.Tracer
	ctx               context.Context
	currentRequest    atomic.Pointer[workerRequest]
	currentPageErrors atomic.Pointer[pageErrors]
	// pageSessionID is the CDP session of the current request's page, events from other sessions are ignored
	pageSessionID atomic.Pointer[string]
	// stopPage ends the current request's render, set while its page is open
	stopPage atomic.Pointer[context.CancelCauseFunc]
	// logger carries the current request's attributes and is only used from the request goroutine.
	logger *slog.Logger
	// sessionLogger is logger without a request's attributes. It never changes, so other
	// goroutines can use it while handleRequests swaps logger per request.
	sessionLogger *slog.Logger
	browser       *browser.Process
	cancel        context.CancelFunc
	queue         chan workerRequest
	id            int
	consoleErrors atomic.Int32
	browserErrors atomic.Int32
	jsExceptions  atomic.Int32
	// dialogs counts the JavaScript dialogs the current request's page opened
	dialogs atomic.Int32
}

const (
	maxBrowserMessageLength = 1024
	// maxLoggedPageErrors is how many warnings one request's page errors log. A broken page can
	// report hundreds of errors.
	maxLoggedPageErrors = 10
)

var (
	errRecoveredPanic              = errors.New("recovered panic")
	errWaitTimedOut                = errors.New("timeout")
	errWaitConditionError          = errors.New("wait condition failed")
	errBrowserCleanupFailed        = errors.New("browser cleanup failed")
	errCommandBatchFailed          = errors.New("command batch failed")
	errInvalidEvaluateResult       = errors.New("invalid runtime evaluate response format")
	errEvaluateException           = errors.New("javascript exception during runtime evaluate")
	errInvalidEvaluateResultObject = errors.New("missing or invalid runtime evaluate result object")
	errEvaluateResultNotBoolean    = errors.New("runtime evaluate result value is not boolean")
)

func newBrowserSession(logger *slog.Logger, id int) (*browserSession, error) {
	ctx, cancel := context.WithCancel(context.Background())
	sessionLogger := logger.With(attr.SessionID, id)
	cfg := config.ReadConfig()
	sessionLogger.Info("Starting browser session", attr.QueueCapacity, cfg.QueueSize)
	var queue chan workerRequest
	if cfg.QueueSize > 0 {
		queue = make(chan workerRequest, cfg.QueueSize)
	} else {
		queue = make(chan workerRequest)
	}
	w := &browserSession{
		id:            id,
		logger:        sessionLogger,
		sessionLogger: sessionLogger,
		queue:         queue,
		ctx:           ctx,
		cancel:        cancel,
		tracer:        telemetry.Tracer(),
	}

	// Start browser process
	var err error
	w.browser, err = browser.Start(id)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("start browser: %w", err)
	}

	// Connect to the browser with event handler
	w.conn, err = cdp.ConnectPipe(ctx, id, w.browser.Reader, w.browser.Writer, w.handleEvent)
	if err != nil {
		cancel()
		if closeErr := w.browser.Close(); closeErr != nil {
			w.logger.Error("Failed to connect AND failed to close browser", attr.Error, closeErr)
		}
		return nil, fmt.Errorf("failed to connect to browser: %w", err)
	}

	go w.watchConnection()
	go w.handleRequests()

	w.logger.Info("Browser worker initialized successfully")
	return w, nil
}

// watchConnection crashes the worker if the browser exits or the connection to it breaks while
// the session is running, so that the pod restarts instead of failing every request.
func (w *browserSession) watchConnection() {
	<-w.conn.Done()
	w.assert(w.ctx.Err() != nil, "Browser connection closed while the session is running")
}

// tryEnqueue attempts to enqueue a request if the session is ready
// Returns true if the request was enqueued, false otherwise.
func (w *browserSession) tryEnqueue(req workerRequest) bool {
	select {
	case w.queue <- req:
		return true
	default:
		return false
	}
}

// isPageEvent reports whether an event from the given session comes from the current request's page.
func (w *browserSession) isPageEvent(sessionID string) bool {
	pageSessionID := w.pageSessionID.Load()
	return pageSessionID != nil && sessionID == *pageSessionID
}

// logPageEvent logs, from the CDP reader goroutine, at INFO, what the current request's page did,
// with the request's logger and in its trace, like its page errors. logger is swapped per request
// by handleRequests, so the reader can't use it. Once cleanup has started, the record has no
// request.
func (w *browserSession) logPageEvent(message string, args ...any) {
	if requestErrors := w.currentPageErrors.Load(); requestErrors != nil {
		requestErrors.logger.InfoContext(requestErrors.ctx, message, args...)
		return
	}
	w.sessionLogger.Info(message, args...)
}

// handleEvent runs on the CDP reader goroutine, which also delivers command replies, in the order
// the browser sent them. So an event from a request's page is always handled before the reply to
// the dispose of its context, after which the next request can start: an event can't be counted
// against, or logged with, the wrong request.
func (w *browserSession) handleEvent(sessionID, method string, params any) {
	if !w.isPageEvent(sessionID) {
		return
	}

	switch method {
	case "Inspector.targetCrashed":
		// The crashed page will never reply, so end the render now instead of at its deadline.
		// Sending it more commands can take down the whole browser.
		// INFO: the failed request logs its one error with what this answers it with.
		w.logPageEvent("Page crashed")
		w.abortRender(errPageCrashed)
	case "Page.javascriptDialogOpening":
		w.dismissDialog(sessionID, params)
	case "Runtime.consoleAPICalled":
		if p, ok := params.(map[string]any); ok {
			if apiType, ok := p["type"].(string); ok && apiType == "error" {
				w.consoleErrors.Add(1)
				w.recordPageError(pageErrorKindConsole, "Page logged a console error", consoleMessage(p), "")
			}
		}
	case "Log.entryAdded":
		if p, ok := params.(map[string]any); ok {
			if entry, ok := p["entry"].(map[string]any); ok {
				if level, ok := entry["level"].(string); ok && level == "error" {
					w.browserErrors.Add(1)
					w.recordPageError(
						pageErrorKindBrowser,
						"Browser reported a page error",
						stringField(entry, "text"),
						stringField(entry, "url"),
						attr.PageErrorLogSource, stringField(entry, "source"),
					)
				}
			}
		}
	case "Runtime.exceptionThrown":
		if p, ok := params.(map[string]any); ok {
			w.jsExceptions.Add(1)
			w.recordPageError(pageErrorKindException, "Page threw an uncaught exception", exceptionMessage(p), "")
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

			w.recordQueueWait(&req)
			// The previous request's page is gone: cleanup clears this only after disposing its
			// context, and a failed dispose crashes the worker. Never render on top of a dirty browser.
			w.assert(w.pageSessionID.Load() == nil, "Previous request's browser context was not disposed")

			// Reset error counters for this request
			w.consoleErrors.Store(0)
			w.browserErrors.Store(0)
			w.jsExceptions.Store(0)
			w.tryUpdateTestModeOutput(&req, "Before", false)

			// The request logger already has the URL, add the session so every log line of the request has both
			req.logger = req.logger.With(attr.SessionID, w.id)
			stopRender := w.startRender(&req)
			w.currentRequest.Store(&req)
			w.logger = req.logger
			requestPageErrors := &pageErrors{
				ctx:        req.ctx,
				logger:     w.logger,
				attributes: telemetry.RequestAttributesFromContext(req.ctx),
			}
			w.currentPageErrors.Store(requestPageErrors)
			w.handleRequest(&req)
			stopRender()
			w.currentRequest.Store(nil)
			// Cleanup has already stopped recording the page's errors, unless the request never
			// got that far.
			w.currentPageErrors.Store(nil)
			requestPageErrors.logNotLogged()
			w.logger = w.sessionLogger

			w.assertA(
				req.hasResponded(),
				"Did not respond to request", attr.RequestURL, telemetry.RedactURL(req.request.URL),
			)

			w.tryUpdateTestModeOutput(&req, "After", true)
		}
	}
}

func (w *browserSession) recordQueueWait(req *workerRequest) {
	if req == nil {
		return
	}
	ctx := req.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	start := req.enqueuedAt
	now := time.Now()
	if start.IsZero() || start.After(now) {
		start = now
	}
	_, span := w.tracer.Start(ctx, "pdf.queue.wait", trace.WithTimestamp(start))
	if data := telemetry.RequestAttributesFromContext(ctx); data != nil {
		data.SetSessionID(w.id)
		data.SetQueueStats(len(w.queue), cap(w.queue))
	}
	span.End()
}

func (w *browserSession) handleRequest(req *workerRequest) {
	ctx := req.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	ctx, span := w.tracer.Start(ctx, "pdf.session.process", trace.WithSpanKind(trace.SpanKindInternal))
	req.ctx = ctx

	if span.IsRecording() {
		span.SetAttributes(attribute.Int(attr.SessionID, w.id))
	}

	w.logger.Info("Processing PDF request")
	start := time.Now()

	defer func() {
		if r := recover(); r != nil {
			err := fmt.Errorf("%w: %v", errRecoveredPanic, r)
			w.logger.ErrorContext(ctx, "Recovered from panic", attr.Error, err)
			pdfErr := types.NewPDFError(types.ErrGenerationFail, "", err)
			telemetry.SetError(span, pdfErr.ErrorType(), err)
			req.tryRespondError(pdfErr)
		}

		duration := time.Since(start)
		span.End()
		w.logger.Info("Completed PDF request", attr.DurationMs, duration.Milliseconds())
	}()

	if respondIfStopped(req) {
		// When we return here, we never get to the cleanup state in the defer block of `generatePdf` below.
		// Since we haven't actually used any of the user data the cleanup phase is completely safe to ignore.
		// So let's manually swap into it cleanup state so that outer loop can swap out of this

		// Capture browser state after cleanup (for test internals mode)
		w.tryUpdateTestModeOutput(req, "ClientDropped", false)
		return
	}

	err := w.generatePdf(req)
	if err != nil {
		pdfErr := mapCustomError(err)
		telemetry.SetError(span, pdfErr.ErrorType(), err)
		req.tryRespondError(pdfErr)
	}
}

// The kinds of error a page reports, as altinn.pdf.page.error.kind.
const (
	pageErrorKindConsole   = "console"
	pageErrorKindBrowser   = "browser"
	pageErrorKindException = "exception"
)

// pageErrors is where the errors a request's page reports go: a warning each, with the request's
// context, so it links to the request's trace, and the counts on the request's attributes. Set
// before the request starts, so the CDP event goroutine never reads the request, or the session's
// logger, which handleRequests swaps per request.
//
//nolint:containedctx // The request's context is what links each warning to the request's trace.
type pageErrors struct {
	ctx        context.Context
	logger     *slog.Logger
	attributes *telemetry.RequestAttributes
	reported   atomic.Int32
}

// recordPageError logs an error the page reported, from the CDP event goroutine, as a warning:
// whether it stopped the page from rendering can't be told. The record has the error's message,
// truncated, and the URL it came from, with every URL in them without user information, query or
// fragment, not the event's payload, which can carry page data. After maxLoggedPageErrors, the
// request's errors are only counted.
//
// The counts go on the request's attributes as the errors arrive, while its entry span is still
// open: the entry span ends with the response, before the request's cleanup.
func (w *browserSession) recordPageError(kind, logMessage, message, url string, args ...any) {
	requestErrors := w.currentPageErrors.Load()
	if requestErrors == nil {
		return
	}
	requestErrors.attributes.SetConsoleErrors(int(w.consoleErrors.Load()))
	requestErrors.attributes.SetBrowserErrors(int(w.browserErrors.Load()))
	requestErrors.attributes.SetJSExceptions(int(w.jsExceptions.Load()))

	if requestErrors.reported.Add(1) > maxLoggedPageErrors {
		return
	}
	args = append(
		args,
		attr.PageErrorKind,
		kind,
		attr.PageErrorMessage,
		truncate(telemetry.RedactURLsInText(message), maxBrowserMessageLength),
	)
	if redactedURL := telemetry.RedactURL(url); redactedURL != "" {
		args = append(args, attr.PageErrorURL, redactedURL)
	}
	requestErrors.logger.WarnContext(requestErrors.ctx, logMessage, args...)
}

// logNotLogged logs how many of the request's page errors were only counted, if any were.
func (e *pageErrors) logNotLogged() {
	if notLogged := e.reported.Load() - maxLoggedPageErrors; notLogged > 0 {
		e.logger.WarnContext(e.ctx, "Page reported more errors than were logged", attr.PageErrorsNotLogged, notLogged)
	}
}

// consoleMessage is the text of a Runtime.consoleAPICalled event's arguments.
func consoleMessage(params map[string]any) string {
	args, ok := params["args"].([]any)
	if !ok {
		return ""
	}
	parts := make([]string, 0, len(args))
	for _, arg := range args {
		remoteObject, ok := arg.(map[string]any)
		if !ok {
			continue
		}
		if value, ok := remoteObject["value"]; ok {
			parts = append(parts, fmt.Sprint(value))
		} else if description := stringField(remoteObject, "description"); description != "" {
			parts = append(parts, description)
		}
	}
	return strings.Join(parts, " ")
}

// exceptionMessage is the description, with the stack, of a Runtime.exceptionThrown event's
// exception, or its text.
func exceptionMessage(params map[string]any) string {
	details, ok := params["exceptionDetails"].(map[string]any)
	if !ok {
		return ""
	}
	if exception, ok := details["exception"].(map[string]any); ok {
		if description := stringField(exception, "description"); description != "" {
			return description
		}
	}
	return stringField(details, "text")
}

// stringField is object's string field key, or "".
func stringField(object map[string]any, key string) string {
	if value, ok := object[key].(string); ok {
		return value
	}
	return ""
}

func truncate(text string, maxLength int) string {
	if len(text) <= maxLength {
		return text
	}
	return strings.ToValidUTF8(text[:maxLength], "") + "...(truncated)"
}

func (w *browserSession) generatePdf(req *workerRequest) error {
	defer w.cleanupAfterRequest(req)

	if respondIfStopped(req) {
		return nil
	}

	page, ok := w.openPage(req)
	if !ok {
		return nil
	}
	if respondIfStopped(req) {
		return nil
	}

	if len(req.request.Cookies) > 0 {
		if err := w.setCookies(req); err != nil {
			return err
		}
	}

	if req.hasResponded() || respondIfStopped(req) {
		return nil
	}

	if err := w.navigateToPage(req, page); err != nil {
		return err
	}

	if testInput := req.tryGetTestModeInput(); testInput != nil && testInput.CrashPage {
		w.crashPageForTest(page)
	}

	if req.hasResponded() || respondIfStopped(req) {
		return nil
	}

	if err := w.waitForRequest(req, page); err != nil {
		return err
	}

	if req.hasResponded() || respondIfStopped(req) {
		return nil
	}

	return w.printPDF(req, page)
}

// openPage creates a new browser context with a single page for the request. Everything the page
// leaves behind on any origin (cookies, web storage, IndexedDB, cache, window.name, history, popups,
// ...) lives in that context, and cleanupAfterRequest disposes it. If the page can't be opened,
// openPage responds to the request with an error and returns false.
//
//nolint:ireturn // The page is a CDP session, which the cdp package exposes as an interface.
func (w *browserSession) openPage(req *workerRequest) (cdp.Commander, bool) {
	openCtx, openSpan := w.tracer.Start(req.ctx, "pdf.session.open_page", trace.WithSpanKind(trace.SpanKindInternal))
	defer openSpan.End()
	start := time.Now()

	// Not cancelled with the request: if the client drops while the browser creates the
	// context, we still need its ID so that cleanup can dispose it.
	ctx := context.WithoutCancel(openCtx)
	var page cdp.Commander
	err := func() error {
		resp, err := w.conn.SendCommand(ctx, "Target.createBrowserContext", map[string]any{
			// If the worker loses its connection, the browser disposes the context by itself
			"disposeOnDetach": true,
		})
		if err != nil {
			return fmt.Errorf("create browser context: %w", err)
		}
		req.browserContextID = w.resultString(resp, "browserContextId")

		resp, err = w.conn.SendCommand(ctx, "Target.createTarget", map[string]any{
			"url":              "about:blank",
			"browserContextId": req.browserContextID,
		})
		if err != nil {
			return fmt.Errorf("create page: %w", err)
		}
		targetID := w.resultString(resp, "targetId")

		resp, err = w.conn.SendCommand(ctx, "Target.attachToTarget", map[string]any{
			"targetId": targetID,
			"flatten":  true,
		})
		if err != nil {
			return fmt.Errorf("attach to page: %w", err)
		}
		sessionID := w.resultString(resp, "sessionId")
		w.pageSessionID.Store(&sessionID)
		page = w.conn.Session(sessionID)

		commands := []cdp.Command{
			{Method: "Page.enable"}, {Method: "Runtime.enable"}, {Method: "Log.enable"},
			// Reports Inspector.targetCrashed when the page's renderer crashes
			{Method: "Inspector.enable"},
		}
		if err := commandBatchError(commands, page.SendCommandBatch(ctx, commands)); err != nil {
			return fmt.Errorf("enable page domains: %w", err)
		}
		return nil
	}()
	if err != nil {
		pdfErr := types.NewPDFError(types.ErrGenerationFail, "open page", err)
		telemetry.SetError(openSpan, pdfErr.ErrorType(), err)
		req.tryRespondError(pdfErr)
		return nil, false
	}

	w.logger.Info("Opened page in new browser context", attr.DurationMs, time.Since(start).Milliseconds())
	return page, true
}

// resultString returns a string field of a successful Target domain response.
func (w *browserSession) resultString(resp *cdp.CDPMessage, key string) string {
	result, ok := resp.Result.(map[string]any)
	w.assert(ok, "Target domain response has no result object")
	value, ok := result[key].(string)
	w.assertA(ok && value != "", "Target domain response is missing a field", attr.CDPResultField, key)
	return value
}

// commandBatchError joins the errors of a command batch, or returns nil if all commands succeeded.
func commandBatchError(commands []cdp.Command, responses []*cdp.CommandResponse) error {
	var batchErrors strings.Builder
	for i, response := range responses {
		method := commands[i].Method
		if response.Err != nil {
			batchErrors.WriteString(method)
			batchErrors.WriteString(": ")
			batchErrors.WriteString(response.Err.Error())
			batchErrors.WriteByte('\n')
		}
		if response.Resp != nil && response.Resp.Error != nil {
			batchErrors.WriteString(method)
			batchErrors.WriteString(": ")
			if responseErrJSON, marshalErr := json.Marshal(response.Resp.Error); marshalErr == nil {
				batchErrors.Write(responseErrJSON)
			} else {
				batchErrors.WriteString(marshalErr.Error())
			}
			batchErrors.WriteByte('\n')
		}
	}
	if batchErrors.Len() == 0 {
		return nil
	}
	return fmt.Errorf("%w: %s", errCommandBatchFailed, batchErrors.String())
}

func (w *browserSession) cleanupAfterRequest(req *workerRequest) {
	cleanupCtx := req.ctx
	if cleanupCtx == nil {
		cleanupCtx = context.Background()
	}
	cleanupCtx, cleanupSpan := w.tracer.Start(
		cleanupCtx,
		"pdf.session.cleanup",
		trace.WithSpanKind(trace.SpanKindInternal),
	)
	cleanupStart := time.Now()
	defer cleanupSpan.End()

	// Errors the page reports from here on, as cleanup disposes of its context, are not the page's
	// own.
	w.currentPageErrors.Store(nil)

	// The queue slot is already free by the time cleanup runs, so this path must stay
	// fast enough that we do not accumulate dirty browser state under load.
	w.tryUpdateTestModeOutput(req, "BeforeCleanup", false)

	if req.browserContextID == "" {
		w.logger.Info("No browser context was created, skipping cleanup")
		// No page ever held user-controlled state, so there is nothing to dispose.
		setCleanupSkipped(cleanupSpan, true)
		return
	}

	if testInput := req.tryGetTestModeInput(); testInput != nil && testInput.CleanupDelaySeconds > 0 {
		w.logger.Info("Waiting for cleanup delay", attr.CleanupDelaySeconds, testInput.CleanupDelaySeconds)
		time.Sleep(time.Duration(testInput.CleanupDelaySeconds) * time.Second)
	}

	err := w.cleanupBrowser(context.WithoutCancel(cleanupCtx), req)
	setCleanupSkipped(cleanupSpan, false)
	if err != nil {
		telemetry.SetError(cleanupSpan, "cleanup_failed", err)
	}
	// Disposing a context either succeeds or leaves the browser in a state we can't trust,
	// a retry would only fail with "context not found". Crash and let the pod restart instead.
	w.assertA(
		err == nil,
		"Failed to dispose browser context, we're in an unsafe state and can't proceed",
		attr.Error,
		err,
	)

	w.logger.Info("Cleanup completed", attr.DurationMs, time.Since(cleanupStart).Milliseconds())
}

// setCleanupSkipped records on the cleanup span whether cleanup was skipped because the request
// never opened a page. A failed cleanup crashes the worker, so there is no other outcome to record.
// Cleanup runs after the response, when the request's entry span has ended.
func setCleanupSkipped(span trace.Span, skipped bool) {
	span.SetAttributes(attribute.Bool(attr.CleanupSkipped, skipped))
}

func parseEvaluateBooleanResult(resp *cdp.CDPMessage) (bool, any, error) {
	result, ok := resp.Result.(map[string]any)
	if !ok {
		return false, resp.Result, errInvalidEvaluateResult
	}

	if errorObj, hasExceptionDetails := result["exceptionDetails"]; hasExceptionDetails {
		return false, errorObj, fmt.Errorf("%w: %v", errEvaluateException, errorObj)
	}

	resultObj, ok := result["result"].(map[string]any)
	if !ok {
		return false, result, errInvalidEvaluateResultObject
	}

	value, ok := resultObj["value"].(bool)
	if !ok {
		return false, resultObj, errEvaluateResultNotBoolean
	}

	return value, nil, nil
}

// respondIfStopped responds with why the request's context ended, if it has: the client left, the
// render deadline passed, or the page crashed.
func respondIfStopped(req *workerRequest) bool {
	if req.ctx.Err() == nil {
		return false
	}
	req.tryRespondError(stoppedError(req))
	return true
}

// stoppedError is the error for a request whose context has ended.
func stoppedError(req *workerRequest) *types.PDFError {
	return contextErrorToPDFError(context.Cause(req.ctx), types.ErrClientDropped, "")
}

// renderTimeoutMargin is how long before types.RequestTimeout a render ends.
const renderTimeoutMargin = 2 * time.Second

var errPageCrashed = errors.New("page crashed")

// startRender gives the request its render context and returns the function that ends it. A render
// that never finishes (an infinite loop, say) ends at the deadline, counted from when the request
// arrived, so that it ends before the generator's and the proxy's timers at types.RequestTimeout,
// which would crash the worker or retry the request elsewhere. A crashed page, or one stuck opening
// dialogs, ends it at once. It is set up before the request becomes current, so the CDP reader
// never sees the request's context change.
func (w *browserSession) startRender(req *workerRequest) func() {
	parent := req.ctx
	if parent == nil {
		parent = context.Background()
	}
	arrived := req.enqueuedAt
	if arrived.IsZero() {
		arrived = time.Now()
	}
	//nolint:gosec // The returned function calls cancelDeadline.
	ctx, cancelDeadline := context.WithDeadline(parent, arrived.Add(types.RequestTimeout()-renderTimeoutMargin))
	ctx, stop := context.WithCancelCause(ctx)
	req.ctx = ctx
	w.dialogs.Store(0)
	w.stopPage.Store(&stop)
	return func() {
		w.stopPage.Store(nil)
		stop(nil)
		cancelDeadline()
		if dialogs := w.dialogs.Load(); dialogs > 1 {
			w.logger.Info("Dismissed JavaScript dialogs", attr.PageDialogs, dialogs)
		}
	}
}

// abortRender ends the current request's render with cause, if one is running.
func (w *browserSession) abortRender(cause error) {
	if stop := w.stopPage.Load(); stop != nil {
		(*stop)(cause)
	}
}

// maxDialogs is how many JavaScript dialogs a render may open. A page that opens more is stuck in a
// loop, which would otherwise run until the deadline.
const maxDialogs = 100

var errTooManyDialogs = fmt.Errorf("page opened more than %d dialogs", maxDialogs)

// dismissDialog dismisses a JavaScript dialog (alert, confirm, prompt), which would otherwise block
// the page until the render times out. Dismissing rather than accepting makes confirm() return false:
// the render runs with the end user's login and must not confirm anything on their behalf. The
// answer is sent from its own goroutine, because the CDP reader that delivered the event also has
// to deliver the reply. Only the first dialog of a render is logged.
func (w *browserSession) dismissDialog(sessionID string, params any) {
	count := w.dialogs.Add(1)
	if count > maxDialogs {
		if count == maxDialogs+1 {
			// INFO: the failed request logs its one error with what this answers it with.
			w.logPageEvent("Page opened too many dialogs, ending the render", attr.PageDialogsLimit, maxDialogs)
			w.abortRender(errTooManyDialogs)
		}
		return
	}
	if count == 1 {
		dialogType := ""
		if p, ok := params.(map[string]any); ok {
			dialogType, _ = p["type"].(string) //nolint:errcheck // A missing type only affects the log.
		}
		w.logPageEvent("Dismissing JavaScript dialog", attr.PageDialogType, dialogType)
	}
	page := w.conn.Session(sessionID)
	go func() {
		ctx, cancel := context.WithTimeout(w.ctx, 5*time.Second)
		defer cancel()
		if _, err := page.SendCommand(ctx, "Page.handleJavaScriptDialog", map[string]any{"accept": false}); err != nil {
			w.sessionLogger.Debug("Failed to dismiss JavaScript dialog", attr.Error, err)
		}
	}()
}

// crashPageForTest crashes the request's page, so that tests can check how a crashed page is
// handled. Page.crash never replies, so it is sent from its own goroutine with a short timeout.
func (w *browserSession) crashPageForTest(page cdp.Commander) {
	w.assert(runtime.IsTestInternalsMode, "Should only run as part of testing")
	go func() {
		ctx, cancel := context.WithTimeout(w.ctx, 2*time.Second)
		defer cancel()
		_, _ = page.SendCommand(ctx, "Page.crash", nil) //nolint:errcheck // It never replies.
	}()
}

func (w *browserSession) setCookies(req *workerRequest) error {
	_, cookiesSpan := w.tracer.Start(req.ctx, "pdf.session.set_cookies", trace.WithSpanKind(trace.SpanKindInternal))
	defer cookiesSpan.End()

	cookies := make([]map[string]any, 0, len(req.request.Cookies))
	for _, cookie := range req.request.Cookies {
		cookieData, ok := w.buildCookieData(req.ctx, cookie)
		if !ok {
			continue
		}
		cookies = append(cookies, cookieData)
	}

	_, err := w.conn.SendCommand(req.ctx, "Storage.setCookies", map[string]any{
		"cookies":          cookies,
		"browserContextId": req.browserContextID,
	})
	if err == nil {
		return nil
	}
	pdfErr := contextErrorToPDFError(err, types.ErrSetCookieFail, "")
	telemetry.SetError(cookiesSpan, pdfErr.ErrorType(), err)
	req.tryRespondError(pdfErr)
	return nil
}

func (w *browserSession) buildCookieData(ctx context.Context, cookie types.Cookie) (map[string]any, bool) {
	sameSite := "Lax"
	switch cookie.SameSite {
	case "Strict":
		sameSite = "Strict"
	case "None":
		sameSite = "None"
	}

	if strings.HasSuffix(cookie.Name, "tracestate") && strings.ContainsRune(cookie.Value, ';') {
		// W3C tracestate values can legitimately contain semicolons, but Chrome rejects
		// them as cookie values. Keep this compatibility shim until all callers encode
		// those values before they reach pdf3.
		w.logger.WarnContext(
			ctx,
			"Cookie value looks like a tracestate and has semicolons skipping",
			attr.RequestCookieName,
			cookie.Name,
		)
		return nil, false
	}

	cookieData := map[string]any{
		"name":     cookie.Name,
		"value":    cookie.Value,
		"sameSite": sameSite,
	}
	if cookie.Domain != "" {
		cookieData["domain"] = cookie.Domain
	}
	if cookie.Path != "" {
		cookieData["path"] = cookie.Path
	}
	if cookie.Secure != nil {
		cookieData["secure"] = *cookie.Secure
	}
	if cookie.HttpOnly != nil {
		cookieData["httpOnly"] = *cookie.HttpOnly
	}
	if cookie.Url != "" {
		cookieData["url"] = cookie.Url
	}
	return cookieData, true
}

func (w *browserSession) navigateToPage(req *workerRequest, page cdp.Commander) error {
	_, navigateSpan := w.tracer.Start(req.ctx, "pdf.session.navigate", trace.WithSpanKind(trace.SpanKindInternal))
	defer navigateSpan.End()

	_, err := page.SendCommand(req.ctx, "Page.navigate", map[string]any{"url": req.request.URL})
	if err == nil {
		return nil
	}
	pdfErr := contextErrorToPDFError(err, types.ErrGenerationFail, "")
	telemetry.SetError(navigateSpan, pdfErr.ErrorType(), err)
	req.tryRespondError(pdfErr)
	return nil
}

func (w *browserSession) waitForRequest(req *workerRequest, page cdp.Commander) error {
	const maxWaitMs int32 = types.MaxTimeoutMs
	waitFor := req.request.WaitFor
	if waitFor == nil {
		// Without an explicit waitFor contract, we still wait for the page load event so
		// PrintToPDF does not race obviously incomplete navigations.
		return w.waitForPageLoad(req, page, maxWaitMs)
	}

	if selector, ok := waitFor.AsString(); ok {
		return w.runWait(req, func() error {
			return w.waitForElement(req, page, selector, maxWaitMs, false, false)
		})
	}
	if timeout, ok := waitFor.AsTimeout(); ok {
		return w.waitForTimeout(req, timeout)
	}
	if opts, ok := waitFor.AsOptions(); ok {
		timeoutMs := maxWaitMs
		if opts.Timeout != nil {
			timeoutMs = *opts.Timeout
		}
		checkVisible := opts.Visible != nil && *opts.Visible
		checkHidden := opts.Hidden != nil && *opts.Hidden
		return w.runWait(req, func() error {
			return w.waitForElement(req, page, opts.Selector, timeoutMs, checkVisible, checkHidden)
		})
	}
	return nil
}

func (w *browserSession) runWait(req *workerRequest, wait func() error) error {
	_, waitSpan := w.tracer.Start(req.ctx, "pdf.session.wait", trace.WithSpanKind(trace.SpanKindInternal))
	defer waitSpan.End()

	waitErr := wait()
	if waitErr == nil {
		return nil
	}
	telemetry.SetError(waitSpan, contextErrorToPDFError(waitErr, types.ErrElementNotReady, "").ErrorType(), waitErr)
	return nil
}

func (w *browserSession) waitForTimeout(req *workerRequest, timeout int32) error {
	_, waitSpan := w.tracer.Start(req.ctx, "pdf.session.wait", trace.WithSpanKind(trace.SpanKindInternal))
	defer waitSpan.End()

	select {
	case <-time.After(time.Duration(timeout) * time.Millisecond):
		return nil
	case <-req.ctx.Done():
		pdfErr := stoppedError(req)
		telemetry.SetError(waitSpan, pdfErr.ErrorType(), context.Cause(req.ctx))
		req.tryRespondError(pdfErr)
		return nil
	}
}

func (w *browserSession) waitForPageLoad(req *workerRequest, page cdp.Commander, timeoutMs int32) error {
	_, waitSpan := w.tracer.Start(req.ctx, "pdf.session.wait", trace.WithSpanKind(trace.SpanKindInternal))
	defer waitSpan.End()

	expression := fmt.Sprintf("(function(timeoutMs){ return %s; })(%d)", loadWaitSnippet(), timeoutMs)
	waitResp, waitErr := page.SendCommand(req.ctx, "Runtime.evaluate", map[string]any{
		"expression":    expression,
		"awaitPromise":  true,
		"returnByValue": true,
	})
	if waitErr != nil {
		// INFO: the failed request logs its one error with what this answers it with.
		w.logger.InfoContext(req.ctx, "Failed to wait for page load event", attr.Error, waitErr)
		pdfErr := contextErrorToPDFError(waitErr, types.ErrGenerationFail, "page load")
		telemetry.SetError(waitSpan, pdfErr.ErrorType(), waitErr)
		req.tryRespondError(pdfErr)
		return nil
	}

	if waitErr = w.processWaitResult(req, waitResp); waitErr != nil {
		// processWaitResult has answered that the element is not ready. Like runWait, return nil:
		// the request has its answer, which pdf.session.process would otherwise record as an
		// unhandled browser error.
		telemetry.SetError(waitSpan, types.NewPDFError(types.ErrElementNotReady, "", nil).ErrorType(), waitErr)
		return nil
	}

	w.logger.Info("Page load event completed")
	return nil
}

func (w *browserSession) printPDF(req *workerRequest, page cdp.Commander) error {
	_, printSpan := w.tracer.Start(req.ctx, "pdf.session.print_to_pdf", trace.WithSpanKind(trace.SpanKindInternal))
	defer printSpan.End()

	resp, err := page.SendCommand(req.ctx, "Page.printToPDF", buildPrintToPDFParams(req.ctx, w.logger, req.request))
	if err != nil {
		pdfErr := contextErrorToPDFError(err, types.ErrGenerationFail, "")
		telemetry.SetError(printSpan, pdfErr.ErrorType(), err)
		req.tryRespondError(pdfErr)
		return nil
	}

	pdfBytes, err := readPDFStream(req.ctx, page, resp, maxPDFSize)
	if err != nil {
		pdfErr := contextErrorToPDFError(err, types.ErrGenerationFail, "")
		telemetry.SetError(printSpan, pdfErr.ErrorType(), err)
		req.tryRespondError(pdfErr)
		return nil
	}

	req.tryRespondOk(pdfBytes)
	return nil
}

func buildPrintToPDFParams(ctx context.Context, logger *slog.Logger, request types.PdfRequest) map[string]any {
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
		"generateTaggedPDF":       true,
		"generateDocumentOutline": false,
		"paperWidth":              8.5,
		"paperHeight":             11.0,
		// See readPDFStream
		"transferMode": "ReturnAsStream",
	}

	if request.Options.Format != "" {
		formatKey := strings.ToLower(request.Options.Format)
		if dimensions, ok := paperFormats[formatKey]; ok {
			pdfParams["paperWidth"] = dimensions.width
			pdfParams["paperHeight"] = dimensions.height
		} else {
			logger.WarnContext(
				ctx,
				"Unknown paper format, using default",
				attr.RequestOptionsFormat,
				request.Options.Format,
			)
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

	setMargin := func(key, value string) {
		if value != "" {
			pdfParams[key] = convertMargin(value)
		}
	}
	setMargin("marginTop", request.Options.Margin.Top)
	setMargin("marginRight", request.Options.Margin.Right)
	setMargin("marginBottom", request.Options.Margin.Bottom)
	setMargin("marginLeft", request.Options.Margin.Left)

	return pdfParams
}

// decodeStreamChunk returns the data of an IO.read response and whether the stream ended.
func decodeStreamChunk(resp *cdp.CDPMessage) ([]byte, bool, error) {
	chunk, ok := resp.Result.(map[string]any)
	if !ok {
		return nil, false, errInvalidPDFResponseFormat
	}
	data, ok := chunk["data"].(string)
	if !ok {
		return nil, false, errInvalidPDFResponseFormat
	}
	eof, ok := chunk["eof"].(bool)
	eof = ok && eof
	if base64Encoded, ok := chunk["base64Encoded"].(bool); !ok || !base64Encoded {
		return []byte(data), eof, nil
	}
	decoded, err := base64.StdEncoding.DecodeString(data)
	if err != nil {
		return nil, false, fmt.Errorf("decode pdf data: %w", err)
	}
	return decoded, eof, nil
}

// pdfStreamChunkSize is how much of the PDF each IO.read returns, about 11 MB once base64 encoded.
const pdfStreamChunkSize = 8 * 1024 * 1024

// maxPDFSize is the largest PDF we return. App PDFs are kilobytes to a few megabytes, so this only
// stops a runaway page from holding hundreds of megabytes in the worker.
const maxPDFSize = 100 * 1024 * 1024

// readPDFStream reads the PDF that Page.printToPDF returned as a stream, up to maxSize bytes.
// Reading it in chunks keeps every CDP message small, however large the PDF. The stream belongs to
// the page's session, so disposing the browser context right after the response releases it. It
// isn't closed here, which would delay the response by another command.
func readPDFStream(
	ctx context.Context,
	page cdp.Commander,
	resp *cdp.CDPMessage,
	maxSize int,
) ([]byte, error) {
	result, ok := resp.Result.(map[string]any)
	if !ok {
		return nil, errInvalidPDFResponseFormat
	}
	handle, ok := result["stream"].(string)
	if !ok || handle == "" {
		return nil, errMissingPDFStream
	}

	var pdf []byte
	for {
		chunkResp, err := page.SendCommand(ctx, "IO.read", map[string]any{"handle": handle, "size": pdfStreamChunkSize})
		if err != nil {
			return nil, fmt.Errorf("read pdf stream: %w", err)
		}
		chunk, eof, err := decodeStreamChunk(chunkResp)
		if err != nil {
			return nil, err
		}
		if len(chunk) == 0 && !eof {
			// A stream that stops advancing would otherwise be read until the client gives up
			return nil, errStalledPDFStream
		}
		if len(pdf)+len(chunk) > maxSize {
			return nil, fmt.Errorf("%w: more than %d bytes", errPDFTooLarge, maxSize)
		}
		pdf = append(pdf, chunk...)
		if eof {
			break
		}
	}

	return pdf, nil
}

// waitForElement waits for an element to match the given criteria using MutationObserver.
// For simple existence checks, uses MutationObserver only.
// For visibility checks, adds polling to catch CSS rule changes.
func (w *browserSession) waitForElement(
	req *workerRequest,
	page cdp.Commander,
	selector string,
	timeoutMs int32,
	checkVisible, checkHidden bool,
) error {
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

	resp, err := page.SendCommand(req.ctx, "Runtime.evaluate", map[string]any{
		"expression":    expression,
		"awaitPromise":  true,
		"returnByValue": true,
	})
	if err != nil {
		// INFO: the failed request logs its one error with what this answers it with.
		w.logger.InfoContext(
			req.ctx,
			"Failed to wait for element",
			attr.RequestWaitForSelector,
			selector,
			attr.Error,
			err,
		)
		req.tryRespondError(contextErrorToPDFError(err, types.ErrElementNotReady, fmt.Sprintf("element %q", selector)))
		return fmt.Errorf("evaluate wait expression: %w", err)
	}

	err = w.processWaitResult(req, resp)
	if err != nil {
		return fmt.Errorf("process wait result: %w", err)
	}

	return nil
}

func (w *browserSession) processWaitResult(req *workerRequest, resp *cdp.CDPMessage) error {
	value, errorData, err := parseEvaluateBooleanResult(resp)
	if err != nil {
		switch {
		case errors.Is(err, errInvalidEvaluateResult):
			return w.handleWaitError(req, "invalid response format", errorData, "malformed CDP response")
		case errors.Is(err, errEvaluateException):
			return w.handleWaitError(req, "JavaScript exception during wait", errorData, "exception in wait expression")
		case errors.Is(err, errInvalidEvaluateResultObject):
			return w.handleWaitError(req, "missing or invalid result object", errorData, "malformed result object")
		case errors.Is(err, errEvaluateResultNotBoolean):
			return w.handleWaitError(req, "result value is not boolean", errorData, "expected boolean result")
		default:
			return w.handleWaitError(req, "unexpected runtime evaluate error", errorData, err.Error())
		}
	}

	if !value {
		waitForData := waitForToJson(req.request.WaitFor)
		// INFO: the failed request logs its one error with what this answers it with.
		w.logger.InfoContext(
			req.ctx,
			"Wait condition not satisfied within timeout",
			attr.RequestWaitForJSON,
			waitForData,
		)
		err := errWaitTimedOut
		req.tryRespondError(types.NewPDFError(types.ErrElementNotReady, "failed waiting for condition", err))
		return err
	}

	return nil
}

// handleWaitError logs and responds with an error for wait failures. The details are logged at
// INFO: the failed request logs its one error with the error this answers it with.
func (w *browserSession) handleWaitError(req *workerRequest, logMsg string, data any, errDetail string) error {
	summary := waitErrorSummary(data)
	args := make([]any, 0, 2+len(summary))
	args = append(args, attr.RequestWaitForJSON, waitForToJson(req.request.WaitFor))
	w.logger.InfoContext(req.ctx, logMsg, append(args, summary...)...)

	err := fmt.Errorf("%w: %s", errWaitConditionError, errDetail)
	req.tryRespondError(types.NewPDFError(types.ErrElementNotReady, "failed waiting for condition", err))
	return err
}

// waitErrorSummary describes what the wait expression's evaluation returned without logging the
// CDP payload: an exception's description, truncated, or otherwise only the payload's size.
func waitErrorSummary(data any) []any {
	if details, ok := data.(map[string]any); ok {
		if message := exceptionMessage(map[string]any{"exceptionDetails": details}); message != "" {
			return []any{attr.WaitException, truncate(message, maxBrowserMessageLength)}
		}
	}
	payload, err := json.Marshal(data)
	if err != nil {
		return nil
	}
	return []any{attr.WaitResultBytes, len(payload)}
}

func waitForToJson(waitFor *types.WaitFor) string {
	waitForData := ""
	if waitFor != nil {
		waitForDataBytes, err := json.Marshal(waitFor)
		if err != nil {
			waitForData = err.Error()
		} else {
			waitForData = string(waitForDataBytes)
		}
	}

	return waitForData
}

// loadWaitSnippet returns JavaScript code that creates a promise which resolves when the page load event fires.
// This can be used in Promise.all() to ensure load event completes along with other conditions.
func loadWaitSnippet() string {
	return `(document.readyState === 'complete' ? Promise.resolve(true) : new Promise(r => {
	let timeoutId;
	let resolveSuccess;
	const resolve = (success) => {
		if (timeoutId !== undefined) clearTimeout(timeoutId);
		window.removeEventListener('load', resolveSuccess);
		r(success);
	};
	resolveSuccess = () => resolve(true);
	window.addEventListener('load', resolveSuccess, { once: true });
	if (document.readyState === 'complete') resolveSuccess();
	timeoutId = setTimeout(() => resolve(false), timeoutMs);
  }))`
}

// buildSimpleWaitExpression generates JavaScript for simple element existence checking.
// Uses MutationObserver only, no polling (original behavior).
// Also waits for the page 'load' event to ensure the page is fully loaded.
func (w *browserSession) buildSimpleWaitExpression(selector string, timeoutMs int32) string {
	if htmlIDSelectorPattern.MatchString(selector) {
		// ID-optimized path
		id := selector[1:]
		return fmt.Sprintf(`(function(){
		  const id = %q; const timeoutMs = %d;
		  const loadWait = %s;
		  const elementWait = new Promise((resolve) => {
		    const e = document.getElementById(id);
		    if (e) return requestAnimationFrame(() => resolve(true));
		    let obs, timeoutId;
		    const done = (v) => { try { obs && obs.disconnect(); } catch(e){} if (timeoutId !== undefined) clearTimeout(timeoutId); requestAnimationFrame(() => resolve(v)); };
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
		    timeoutId = setTimeout(() => done(false), timeoutMs);
		  });
		  return Promise.all([loadWait, elementWait]).then(([loaded, found]) => loaded && found);
		})()`, id, timeoutMs, loadWaitSnippet())
	}

	// General selector path
	return fmt.Sprintf(`(function(){
	  const selector = %q; const timeoutMs = %d;
	  const loadWait = %s;
	  const elementWait = new Promise((resolve) => {
	    if (document.querySelector(selector)) return requestAnimationFrame(() => resolve(true));
	    let obs, timeoutId;
	    const done = (v) => { try { obs && obs.disconnect(); } catch(e){} if (timeoutId !== undefined) clearTimeout(timeoutId); requestAnimationFrame(() => resolve(v)); };
	    obs = new MutationObserver(() => {
	      if (document.querySelector(selector)) done(true);
	    });
	    obs.observe(document, {subtree:true, childList:true, attributes:true});
	    timeoutId = setTimeout(() => done(false), timeoutMs);
	  });
	  return Promise.all([loadWait, elementWait]).then(([loaded, found]) => loaded && found);
	})()`, selector, timeoutMs, loadWaitSnippet())
}

// buildVisibilityWaitExpression generates JavaScript for visibility checking with polling fallback.
// Uses MutationObserver for attribute changes + polling for CSS rule changes.
// Also waits for the page 'load' event to ensure the page is fully loaded.
//
//nolint:funlen // The generated JS stays readable when kept as one template.
func (w *browserSession) buildVisibilityWaitExpression(
	selector string,
	timeoutMs int32,
	checkVisible, checkHidden bool,
) string {
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
		  const loadWait = %s;
		  const elementWait = new Promise((resolve) => {
		    const e = document.getElementById(id);
		    if (checkElement(e)) return requestAnimationFrame(() => resolve(true));
		    let obs, pollInterval, timeoutId;
		    const done = (v) => {
		      try { obs && obs.disconnect(); } catch(e){}
		      if (pollInterval !== undefined) clearInterval(pollInterval);
		      if (timeoutId !== undefined) clearTimeout(timeoutId);
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
		    timeoutId = setTimeout(() => done(false), timeoutMs);
		  });
		  return Promise.all([loadWait, elementWait]).then(([loaded, found]) => loaded && found);
		})()`, id, timeoutMs, visibilityHelper, checkElementDef, loadWaitSnippet())
	}

	// General selector path with visibility checking
	return fmt.Sprintf(`(function(){
	  const selector = %q; const timeoutMs = %d;
	  %s
	  %s
	  const loadWait = %s;
	  const elementWait = new Promise((resolve) => {
	    const e = document.querySelector(selector);
	    if (checkElement(e)) return requestAnimationFrame(() => resolve(true));
	    let obs, pollInterval, timeoutId;
	    const done = (v) => {
	      try { obs && obs.disconnect(); } catch(e){}
	      if (pollInterval !== undefined) clearInterval(pollInterval);
	      if (timeoutId !== undefined) clearTimeout(timeoutId);
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
	    timeoutId = setTimeout(() => done(false), timeoutMs);
	  });
	  return Promise.all([loadWait, elementWait]).then(([loaded, found]) => loaded && found);
	})()`, selector, timeoutMs, visibilityHelper, checkElementDef, loadWaitSnippet())
}

// getCookies returns the cookies of every browser context, so that test snapshots also show
// state that outlived the request it belongs to.
func (w *browserSession) getCookies() ([]map[string]any, error) {
	w.assert(runtime.IsTestInternalsMode, "Should only run as part of testing")

	resp, err := w.conn.SendCommand(w.ctx, "Target.getBrowserContexts", nil)
	if err != nil {
		return nil, fmt.Errorf("get browser contexts: %w", err)
	}
	result, ok := resp.Result.(map[string]any)
	if !ok {
		return nil, errInvalidCookieResponseFormat
	}
	contextIDs, ok := result["browserContextIds"].([]any)
	if !ok {
		return nil, errInvalidCookieResponseFormat
	}

	// The default context has no ID and is not listed
	params := []map[string]any{{}}
	for _, contextID := range contextIDs {
		params = append(params, map[string]any{"browserContextId": contextID})
	}

	var cookieList []map[string]any
	for _, p := range params {
		resp, err := w.conn.SendCommand(w.ctx, "Storage.getCookies", p)
		if err != nil {
			return nil, fmt.Errorf("get cookies from browser: %w", err)
		}

		result, ok := resp.Result.(map[string]any)
		if !ok {
			return nil, errInvalidCookieResponseFormat
		}

		cookies, ok := result["cookies"].([]any)
		if !ok {
			continue // No cookies
		}

		for _, c := range cookies {
			if cookie, ok := c.(map[string]any); ok {
				cookieList = append(cookieList, cookie)
			}
		}
	}

	return cookieList, nil
}

func (w *browserSession) getBrowserState(state string) testing.BrowserState {
	w.assert(runtime.IsTestInternalsMode, "Should only run as part of testing")

	cookies, err := w.getCookies()
	// An empty cookie list must mean the browser has no cookies, not that reading them failed
	w.assertA(err == nil, "Failed to read cookies for test output", attr.Error, err)

	cookieInfos := make([]testing.CookieInfo, 0, len(cookies))
	for _, cookie := range cookies {
		name, hasName := cookie["name"].(string)
		domain, _ := cookie["domain"].(string) //nolint:errcheck // Missing domain is acceptable for this debug snapshot.
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

func (w *browserSession) cleanupBrowser(ctx context.Context, req *workerRequest) error {
	now := time.Now()
	// Disposing the context closes its pages and drops everything stored in it, on every origin.
	// The context is not cancelled with the request, the client might have dropped out already and
	// we should always complete cleanup.
	_, err := w.conn.SendCommand(ctx, "Target.disposeBrowserContext", map[string]any{
		"browserContextId": req.browserContextID,
	})
	w.logger.Info("Dispose browser context completed", attr.DurationMs, time.Since(now).Milliseconds())
	w.pageSessionID.Store(nil)
	if err != nil {
		return fmt.Errorf("%w: %w", errBrowserCleanupFailed, err)
	}
	return nil
}

func (w *browserSession) assert(condition bool, message string) {
	if req := w.currentRequest.Load(); req != nil {
		assert.That(condition, message, attr.SessionID, w.id, attr.RequestURL, telemetry.RedactURL(req.request.URL))
	} else {
		assert.That(condition, message, attr.SessionID, w.id)
	}
}

func (w *browserSession) assertA(condition bool, message string, userArgs ...any) {
	if req := w.currentRequest.Load(); req != nil {
		args := make([]any, 0, 2+2+len(userArgs))
		args = append(args, attr.SessionID, w.id)
		args = append(args, attr.RequestURL, telemetry.RedactURL(req.request.URL))
		args = append(args, userArgs...)
		assert.That(condition, message, args...)
	} else {
		args := make([]any, 0, 2+len(userArgs))
		args = append(args, attr.SessionID, w.id)
		args = append(args, userArgs...)
		assert.That(condition, message, args...)
	}
}

func (w *browserSession) close() {
	w.sessionLogger.Info("Closing worker")

	if w.cancel != nil {
		w.cancel()
	}
	if w.queue != nil {
		close(w.queue)
	}

	if w.conn != nil {
		if err := w.conn.Close(); err != nil {
			w.sessionLogger.Error("Failed to close connection", attr.Error, err)
		}
	}

	if w.browser != nil {
		if err := w.browser.Close(); err != nil {
			w.sessionLogger.Error("Failed to close browser", attr.Error, err)
		}
	}

	w.sessionLogger.Info("Worker closed")
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
// Numbers without units are treated as pixels.
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

var (
	errInvalidPDFResponseFormat    = errors.New("invalid PDF response format")
	errMissingPDFStream            = errors.New("no PDF stream in response")
	errStalledPDFStream            = errors.New("PDF stream returned no data before its end")
	errPDFTooLarge                 = errors.New("PDF is too large")
	errInvalidCookieResponseFormat = errors.New("invalid cookie response format")
)

// contextErrorToPDFError checks if an error is context-related and returns the appropriate PDFError.
// If the error is context.Canceled, it returns ErrClientDropped.
// If the error is context.DeadlineExceeded, it returns ErrTimeout.
// Otherwise, it returns a PDFError with the fallback error type.
func contextErrorToPDFError(err error, fallbackType error, detail string) *types.PDFError {
	if err == nil {
		return nil
	}

	if errors.Is(err, errPageCrashed) || errors.Is(err, errTooManyDialogs) {
		return types.NewPDFError(types.ErrGenerationFail, "page failed", err)
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
