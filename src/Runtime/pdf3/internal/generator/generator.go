package generator

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync/atomic"
	"time"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/browser"
	"altinn.studio/pdf3/internal/cdp"
	"altinn.studio/pdf3/internal/config"
	"altinn.studio/pdf3/internal/log"
	"altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/telemetry"
	"altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/internal/types"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

type Custom struct {
	logger         *slog.Logger
	browserVersion types.BrowserVersion
	tracer         trace.Tracer

	activeSession    atomic.Pointer[browserSession]
	sessionIDCounter atomic.Int32
}

// getBrowserVersion starts a temporary browser and retrieves its version information
func getBrowserVersion(logger *slog.Logger) (types.BrowserVersion, error) {
	// Start temporary browser instance
	browserProc, err := browser.Start(-1)
	if err != nil {
		return types.BrowserVersion{}, fmt.Errorf("failed to create temporary browser for version info: %w", err)
	}
	defer func() {
		if err := browserProc.Close(); err != nil {
			logger.Error("Failed to close temporary browser", "error", err)
		}
	}()

	// Connect to get version only (no event handler needed)
	conn, _, err := cdp.Connect(context.Background(), -1, browserProc.DebugBaseURL, nil)
	if err != nil {
		return types.BrowserVersion{}, fmt.Errorf("failed to connect to temporary browser: %w", err)
	}
	defer func() {
		// Closing connection during init - will be recreated anyway
		_ = conn.Close()
	}()

	// Get browser version using CDP command
	version, err := cdp.GetBrowserVersion(conn)
	if err != nil {
		return types.BrowserVersion{}, fmt.Errorf("failed to get browser version: %w", err)
	}

	return *version, nil
}

func New() (*Custom, error) {
	logger := log.NewComponent("generator")
	logger.Info("Starting PDF generator")

	generator := &Custom{
		logger: logger,
		tracer: telemetry.Tracer(),
	}

	go func() {
		_, span := generator.tracer.Start(context.Background(), "pdf.generator.init")
		defer span.End()
		defer func() {
			r := recover()
			assert.That(r == nil, "Generator initialization panicked", "error", r)
		}()

		logger.Info("Initializing Custom CDP")

		// Get and set browser version
		version, err := getBrowserVersion(logger)
		if err != nil {
			if span.IsRecording() {
				span.RecordError(err)
				span.SetStatus(codes.Error, "get_browser_version_failed")
			}
			assert.That(err == nil, "Failed to get browser version", "error", err)
		}

		generator.browserVersion = version
		if span.IsRecording() {
			span.SetAttributes(
				attribute.String("browser.version.product", version.Product),
				attribute.String("browser.version.revision", version.Revision),
				attribute.String("browser.version.protocol", version.ProtocolVersion),
			)
		}
		logger.Info("Chrome version",
			"product", version.Product,
			"revision", version.Revision,
			"protocol", version.ProtocolVersion,
		)

		init := func(id int) *browserSession {
			logger.Info("Starting browser worker", "id", id)

			session, err := newBrowserSession(logger, id)
			assert.That(err == nil, "Failed to create worker", "id", id, "error", err)

			return session
		}

		generator.sessionIDCounter.Store(1)
		firstSession := init(1)
		generator.activeSession.Store(firstSession)
		if span.IsRecording() {
			span.SetAttributes(attribute.Int("pdf.session.id", firstSession.id))
		}

		go generator.periodicRestart()
	}()

	return generator, nil
}

func (g *Custom) IsReady() bool {
	return g.activeSession.Load() != nil
}

func (g *Custom) Generate(ctx context.Context, request types.PdfRequest) (*types.PdfResult, *types.PDFError) {
	session := g.activeSession.Load()
	assert.That(session != nil, "The worker should not call the generator unless it is ready", "url", request.URL)
	assert.That(request.Validate() == nil, "Invalid request passed through to worker", "url", request.URL)

	ctx, span := g.tracer.Start(ctx, "pdf.generate", trace.WithSpanKind(trace.SpanKindInternal))
	defer span.End()

	responder := make(chan workerResponse, 1)
	req := workerRequest{
		request:    request,
		responder:  responder,
		ctx:        ctx,
		enqueuedAt: time.Now(),
		cleanedUp:  false,
		logger:     g.logger.With("url", request.URL),
	}

	if session.tryEnqueue(req) {
		// Successfully enqueued
	} else {
		g.logger.Warn("Request queue full, rejecting request", "url", request.URL)
		pdfErr := types.NewPDFError(types.ErrQueueFull, "", nil)
		recordPDFError(span, pdfErr)
		return nil, pdfErr
	}

	select {
	case response := <-responder:
		if response.Error != nil {
			recordPDFError(span, response.Error)
			return nil, response.Error
		}
		return &types.PdfResult{
			Data:    response.Data,
			Browser: g.browserVersion,
		}, nil
	case <-ctx.Done():
		pdfErr := types.NewPDFError(types.ErrClientDropped, "", ctx.Err())
		recordPDFError(span, pdfErr)
		return nil, pdfErr
	case <-time.After(types.RequestTimeout()):
		assert.That(false, "generator failed to respond to request, something must be stuck", "url", request.URL)
		pdfErr := types.NewPDFError(types.ErrGenerationFail, "internal request timeout", nil)
		recordPDFError(span, pdfErr)
		return nil, pdfErr
	}
}

func (g *Custom) Close() error {
	g.logger.Info("Closing PDF generator")
	session := g.activeSession.Load()
	if session != nil {
		session.close()
	}
	return nil
}

func (g *Custom) periodicRestart() {
	const recheckInterval = 1 * time.Minute // How often to recheck if restart is disabled

	for {
		interval := config.ReadConfig().BrowserRestartInterval

		// If interval is 0 or negative, periodic restart is disabled
		if interval <= 0 {
			g.logger.Info("Periodic browser restart is disabled, will recheck", "recheck_in", recheckInterval)
			time.Sleep(recheckInterval)
			continue
		}

		g.logger.Info("Periodic browser restart enabled", "interval", interval)
		ticker := time.NewTicker(interval)

		// Wait for first tick
		<-ticker.C
		ticker.Stop()

		// Perform restart
		g.logger.Info("Starting periodic browser restart")
		_, restartSpan := g.tracer.Start(context.Background(), "pdf.generator.restart")
		if restartSpan.IsRecording() {
			restartSpan.SetAttributes(attribute.Int64("pdf.restart.interval_ms", interval.Milliseconds()))
		}

		nextID := int(g.sessionIDCounter.Add(1))

		g.logger.Info("Creating new browser session for restart", "id", nextID)
		newSession, err := newBrowserSession(g.logger, nextID)
		if err != nil {
			g.logger.Error("Failed to create new browser session, keeping old session", "id", nextID, "error", err)
			if restartSpan.IsRecording() {
				restartSpan.RecordError(err)
				restartSpan.SetStatus(codes.Error, "new_session_failed")
			}
			restartSpan.End()
			// Wait a bit before retrying to avoid tight loop on persistent errors
			time.Sleep(1 * time.Minute)
			continue
		}

		oldSession := g.activeSession.Swap(newSession)
		g.logger.Info("Swapped to new browser session", "old_id", oldSession.id, "new_id", nextID)
		if restartSpan.IsRecording() {
			restartSpan.SetAttributes(
				attribute.Int("pdf.session.old_id", oldSession.id),
				attribute.Int("pdf.session.new_id", nextID),
			)
		}

		drained := oldSession.waitForDrain(types.SessionDrainTimeout)
		if restartSpan.IsRecording() {
			restartSpan.SetAttributes(
				attribute.Bool("pdf.session.drained", drained),
				attribute.Int64("pdf.session.drain_timeout_ms", types.SessionDrainTimeout.Milliseconds()),
			)
		}

		oldSession.close()
		g.logger.Info("Browser restart complete", "old_id", oldSession.id, "new_id", nextID)
		restartSpan.End()

		// Loop back to recheck interval (allows dynamic config changes)
	}
}

type workerRequest struct {
	request    types.PdfRequest
	responder  chan workerResponse
	ctx        context.Context
	enqueuedAt time.Time
	cleanedUp  bool
	logger     *slog.Logger
}

func (r *workerRequest) tryGetTestModeInput() *testing.PdfInternalsTestInput {
	if !runtime.IsTestInternalsMode {
		return nil
	}

	obj := r.ctx.Value(testing.TestInputContextKey())
	if obj == nil {
		return nil
	}

	value, ok := obj.(*testing.PdfInternalsTestInput)
	assert.That(ok, "Invalid type for test internals mode input on context")
	return value
}

func (r *workerRequest) tryRespondOk(data []byte) {
	if r.responder != nil {
		response := workerResponse{
			Data:  data,
			Error: nil,
		}
		select {
		case r.responder <- response:
			r.logger.Info("Responded successfully", "data_size", len(data))
			break
		default:
			r.logger.Warn("Client abandoned request (likely timed out), dropping response")
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
			r.logger.Info("Responded with error", "error", err)
			break
		default:
			r.logger.Warn("Client abandoned request (likely timed out), dropping response")
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

func recordPDFError(span trace.Span, pdfErr *types.PDFError) {
	if pdfErr == nil || !span.IsRecording() {
		return
	}
	span.RecordError(pdfErr)
	span.SetStatus(codes.Error, pdfErr.Type.Error())
}
