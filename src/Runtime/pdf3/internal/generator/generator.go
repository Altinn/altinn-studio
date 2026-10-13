package generator

import (
	"context"
	"errors"
	"log/slog"
	"sync/atomic"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/cdp"
	"altinn.studio/pdf3/internal/config"
	"altinn.studio/pdf3/internal/log"
	"altinn.studio/pdf3/internal/pdfa"
	"altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/telemetry"
	"altinn.studio/pdf3/internal/telemetry/attr"
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
			attr.DeploymentEnvironmentName, cfg.Environment,
			attr.ServiceOwner, cfg.ServiceOwner,
		)
	}

	go func() {
		_, span := generator.tracer.Start(context.Background(), "pdf.generator.init")
		defer span.End()
		defer func() {
			r := recover()
			assert.That(r == nil, "Generator initialization panicked", attr.Panic, r)
		}()

		logger.Info("Initializing Custom CDP")

		init := func(id int) *browserSession {
			logger.Info("Starting browser worker", attr.SessionID, id)

			session, err := newBrowserSession(logger, id)
			assert.That(err == nil, "Failed to create worker", attr.SessionID, id, attr.Error, err)

			return session
		}

		generator.sessionIDCounter.Store(1)
		firstSession := init(1)

		// Every session runs the same browser binary, so the first one's version holds for all
		version, err := cdp.GetBrowserVersion(firstSession.conn)
		if err != nil {
			telemetry.SetError(span, "get_browser_version_failed", err)
			assert.That(err == nil, "Failed to get browser version", attr.Error, err)
		}

		generator.browserVersion = *version
		if span.IsRecording() {
			span.SetAttributes(
				attribute.String(attr.BrowserVersionProduct, version.Product),
				attribute.String(attr.BrowserVersionRevision, version.Revision),
				attribute.String(attr.BrowserVersionProtocol, version.ProtocolVersion),
			)
		}
		logger.Info("Chrome version",
			attr.BrowserVersionProduct, version.Product,
			attr.BrowserVersionRevision, version.Revision,
			attr.BrowserVersionProtocol, version.ProtocolVersion,
		)

		generator.activeSession.Store(firstSession)
		if span.IsRecording() {
			span.SetAttributes(attribute.Int(attr.SessionID, firstSession.id))
		}

		go generator.periodicRestart()
	}()

	return generator, nil
}

func (g *Custom) IsReady() bool {
	return g.activeSession.Load() != nil
}

func (g *Custom) Generate(ctx context.Context, request types.PdfRequest) (*types.PdfResult, *types.PDFError) {
	// The URL as logs show it: without query or fragment.
	requestURL := telemetry.RedactURL(request.URL)
	session := g.activeSession.Load()
	assert.That(
		session != nil,
		"The worker should not call the generator unless it is ready",
		attr.RequestURL,
		requestURL,
	)
	assert.That(request.Validate() == nil, "Invalid request passed through to worker", attr.RequestURL, requestURL)

	ctx, span := g.tracer.Start(ctx, "pdf.generate", trace.WithSpanKind(trace.SpanKindInternal))
	defer span.End()

	responder := make(chan workerResponse, 1)
	req := workerRequest{
		request:    request,
		responder:  responder,
		ctx:        ctx,
		enqueuedAt: time.Now(),
		logger:     g.logger.With(attr.RequestURL, requestURL),
	}

	if !session.tryEnqueue(req) {
		// Queue-full 429s are expected; proxy retries handle them, so no span error or warning.
		g.logger.InfoContext(ctx, "Request queue full, rejecting request", attr.RequestURL, requestURL)
		return nil, types.NewPDFError(types.ErrQueueFull, "", nil)
	}

	select {
	case response := <-responder:
		if response.Error != nil {
			recordPDFError(span, response.Error)
			return nil, response.Error
		}
		pdfData, pdfErr := g.prepareResponsePDF(ctx, requestURL, response.Data)
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
		assert.That(
			false,
			"generator failed to respond to request, something must be stuck",
			attr.RequestURL,
			requestURL,
		)
		pdfErr := types.NewPDFError(types.ErrGenerationFail, "internal request timeout", nil)
		recordPDFError(span, pdfErr)
		return nil, pdfErr
	}
}

func (g *Custom) prepareResponsePDF(ctx context.Context, requestURL string, data []byte) ([]byte, *types.PDFError) {
	requestAttributes := telemetry.RequestAttributesFromContext(ctx)
	if !g.convertToPDFA {
		requestAttributes.SetPDFAConversion(g.convertToPDFA, "skipped", len(data), 0)
		return data, nil
	}

	if ctx.Err() != nil {
		requestAttributes.SetPDFAConversion(g.convertToPDFA, "canceled", len(data), 0)
		return nil, types.NewPDFError(types.ErrClientDropped, "", ctx.Err())
	}

	converted, pdfErr := g.postProcessPDF(ctx, data)
	if pdfErr != nil {
		requestAttributes.SetPDFAConversion(g.convertToPDFA, "failed", len(data), 0)
		g.logger.WarnContext(
			ctx,
			"PDF/A conversion failed, returning original PDF",
			attr.RequestURL,
			requestURL,
			attr.Error,
			pdfErr,
		)
		return data, nil
	}

	requestAttributes.SetPDFAConversion(g.convertToPDFA, "success", len(data), len(converted))
	return converted, nil
}

func (g *Custom) postProcessPDF(ctx context.Context, data []byte) ([]byte, *types.PDFError) {
	assert.That(g.convertToPDFA, "convertToPDFA config must be true for this method")
	assert.That(g.pdfaConverter != nil, "PDF/A converter must be configured when conversion is enabled")
	_, span := g.tracer.Start(ctx, "pdf.convert_to_pdfa", trace.WithSpanKind(trace.SpanKindInternal))
	defer span.End()

	converted, err := g.pdfaConverter.Convert(data)
	if err != nil {
		telemetry.SetError(span, "pdfa_conversion_failed", err)
		return nil, types.NewPDFError(types.ErrGenerationFail, "PDF/A conversion failed", err)
	}
	return converted, nil
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
			g.logger.Info(
				"Periodic browser restart is disabled, will recheck",
				attr.RestartRecheckInMs,
				recheckInterval.Milliseconds(),
			)
			time.Sleep(recheckInterval)
			continue
		}

		g.logger.Info("Periodic browser restart enabled", attr.RestartIntervalMs, interval.Milliseconds())
		ticker := time.NewTicker(interval)

		// Wait for first tick
		<-ticker.C
		ticker.Stop()

		// Perform restart
		g.logger.Info("Starting periodic browser restart")
		_, restartSpan := g.tracer.Start(context.Background(), "pdf.generator.restart")
		if restartSpan.IsRecording() {
			restartSpan.SetAttributes(attribute.Int64(attr.RestartIntervalMs, interval.Milliseconds()))
		}

		nextID := int(g.sessionIDCounter.Add(1))

		g.logger.Info("Creating new browser session for restart", attr.SessionID, nextID)
		newSession, err := newBrowserSession(g.logger, nextID)
		if err != nil {
			g.logger.Error(
				"Failed to create new browser session, keeping old session",
				attr.SessionID,
				nextID,
				attr.Error,
				err,
			)
			telemetry.SetError(restartSpan, "new_session_failed", err)
			restartSpan.End()
			// Wait a bit before retrying to avoid tight loop on persistent errors
			time.Sleep(1 * time.Minute)
			continue
		}

		oldSession := g.activeSession.Swap(newSession)
		g.logger.Info("Swapped to new browser session", attr.SessionOldID, oldSession.id, attr.SessionNewID, nextID)
		if restartSpan.IsRecording() {
			restartSpan.SetAttributes(
				attribute.Int(attr.SessionOldID, oldSession.id),
				attribute.Int(attr.SessionNewID, nextID),
			)
		}

		drained := oldSession.waitForDrain(types.SessionDrainTimeout)
		if restartSpan.IsRecording() {
			restartSpan.SetAttributes(
				attribute.Bool(attr.SessionDrained, drained),
				attribute.Int64(attr.SessionDrainTimeoutMs, types.SessionDrainTimeout.Milliseconds()),
			)
		}

		oldSession.close()
		g.logger.Info("Browser restart complete", attr.SessionOldID, oldSession.id, attr.SessionNewID, nextID)
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
	// browserContextID is the context that holds all browser state of the request
	browserContextID string
	request          types.PdfRequest
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
			r.logger.Info("Responded successfully", attr.ResponseSizeBytes, len(data))
			break
		default:
			// INFO: the abandoned request already logs its own error.
			r.logger.InfoContext(r.ctx, "Client abandoned request (likely timed out), dropping response")
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
			r.logger.Info("Responded with error", attr.Error, err)
			break
		default:
			// INFO: the abandoned request already logs its own error.
			r.logger.InfoContext(r.ctx, "Client abandoned request (likely timed out), dropping response")
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
	if pdfErr == nil {
		return
	}
	telemetry.SetError(span, pdfErr.ErrorType(), pdfErr)
}
