package generator

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync/atomic"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/browser"
	"altinn.studio/pdf3/internal/cdp"
	"altinn.studio/pdf3/internal/config"
	"altinn.studio/pdf3/internal/log"
	"altinn.studio/pdf3/internal/pdfa"
	"altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/telemetry"
	"altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/internal/types"
)

type Custom struct {
	tracer           trace.Tracer
	logger           *slog.Logger
	activeSession    atomic.Pointer[browserSession]
	pdfaConverter    *pdfa.Converter
	browserVersion   types.BrowserVersion
	sessionIDCounter atomic.Int32
	convertToPDFA    bool
}

// getBrowserVersion starts a temporary browser and retrieves its version information.
func getBrowserVersion(logger *slog.Logger) (types.BrowserVersion, error) {
	// Start temporary browser instance
	browserProc, err := browser.Start(-1)
	if err != nil {
		return types.BrowserVersion{}, fmt.Errorf("failed to create temporary browser for version info: %w", err)
	}
	defer func() {
		if closeErr := browserProc.Close(); closeErr != nil {
			logger.Error("Failed to close temporary browser", "error", closeErr)
		}
	}()

	// Connect to get version only (no event handler needed)
	conn, _, err := cdp.Connect(context.Background(), -1, browserProc.DebugBaseURL, nil)
	if err != nil {
		return types.BrowserVersion{}, fmt.Errorf("failed to connect to temporary browser: %w", err)
	}
	defer func() {
		// Closing connection during init - will be recreated anyway
		if closeErr := conn.Close(); closeErr != nil {
			logger.Error("Failed to close temporary browser connection", "error", closeErr)
		}
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
	cfg := config.ReadConfig()

	generator := &Custom{
		logger:        logger,
		tracer:        telemetry.Tracer(),
		convertToPDFA: cfg.ShouldConvertToPDFA(),
	}
	if generator.convertToPDFA {
		generator.pdfaConverter = pdfa.NewConverter()
		logger.Info(
			"PDF/A conversion enabled",
			"environment", cfg.Environment,
			"service_owner", cfg.ServiceOwner,
		)
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

	requestSpan := trace.SpanFromContext(ctx)
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
		// Queue-full 429s are expected; proxy retries handle them.
		// Mark as an event, not a span error, to avoid false error noise.
		if span.IsRecording() {
			span.AddEvent("pdf.queue.full")
		}
		return nil, pdfErr
	}

	select {
	case response := <-responder:
		if response.Error != nil {
			recordPDFError(span, response.Error)
			return nil, response.Error
		}
		pdfData, pdfErr := g.prepareResponsePDF(ctx, requestSpan, span, request.URL, response.Data)
		if pdfErr != nil {
			recordPDFError(span, pdfErr)
			return nil, pdfErr
		}
		return &types.PdfResult{
			Data:    pdfData,
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

func (g *Custom) prepareResponsePDF(
	ctx context.Context,
	requestSpan trace.Span,
	generateSpan trace.Span,
	requestURL string,
	data []byte,
) ([]byte, *types.PDFError) {
	if !g.convertToPDFA {
		g.addPDFAEvent(requestSpan, generateSpan, "skipped", false, len(data), 0)
		return data, nil
	}

	if ctx.Err() != nil {
		g.addPDFAEvent(requestSpan, generateSpan, "canceled", false, len(data), 0)
		return nil, types.NewPDFError(types.ErrClientDropped, "", ctx.Err())
	}

	converted, pdfErr := g.postProcessPDF(ctx, data)
	if pdfErr != nil {
		g.addPDFAEvent(requestSpan, generateSpan, "failed", false, len(data), 0)
		g.logger.Warn("PDF/A conversion failed, returning original PDF", "url", requestURL, "error", pdfErr)
		return data, nil
	}

	g.addPDFAEvent(requestSpan, generateSpan, "success", true, len(data), len(converted))
	return converted, nil
}

func (g *Custom) postProcessPDF(ctx context.Context, data []byte) ([]byte, *types.PDFError) {
	assert.That(g.convertToPDFA, "convertToPDFA config must be true for this method")
	assert.That(g.pdfaConverter != nil, "PDF/A converter must be configured when conversion is enabled")
	_, span := g.tracer.Start(ctx, "pdf.convert_to_pdfa", trace.WithSpanKind(trace.SpanKindInternal))
	defer span.End()

	converted, err := g.pdfaConverter.Convert(data)
	if err != nil {
		if span.IsRecording() {
			span.RecordError(err)
			span.SetStatus(codes.Error, "pdfa_conversion_failed")
		}
		return nil, types.NewPDFError(types.ErrGenerationFail, "PDF/A conversion failed", err)
	}
	return converted, nil
}

func (g *Custom) addPDFAEvent(
	requestSpan trace.Span,
	fallbackSpan trace.Span,
	status string,
	applied bool,
	inputSize int,
	outputSize int,
) {
	targetSpan := requestSpan
	if !targetSpan.IsRecording() {
		targetSpan = fallbackSpan
	}
	if !targetSpan.IsRecording() {
		return
	}

	attrs := []attribute.KeyValue{
		attribute.Bool("pdf.convert_to_pdfa.enabled", g.convertToPDFA),
		attribute.Bool("pdf.convert_to_pdfa.applied", applied),
		attribute.String("pdf.convert_to_pdfa.status", status),
		attribute.Int("pdf.convert_to_pdfa.input_size_bytes", inputSize),
	}
	if outputSize > 0 {
		attrs = append(attrs, attribute.Int("pdf.convert_to_pdfa.output_size_bytes", outputSize))
	}

	targetSpan.AddEvent("pdf.convert_to_pdfa", trace.WithAttributes(attrs...))
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
	enqueuedAt time.Time
	//nolint:containedctx // The request context is the ownership boundary for request cancellation and test-mode state.
	ctx       context.Context
	responder chan workerResponse
	logger    *slog.Logger
	request   types.PdfRequest
	cleanedUp bool
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
	Error *types.PDFError
	Data  []byte
}

// mapCustomError wraps raw custom implementation errors while preserving our PDFErrors.
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
