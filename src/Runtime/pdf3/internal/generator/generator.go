package generator

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/browser"
	"altinn.studio/pdf3/internal/cdp"
	"altinn.studio/pdf3/internal/log"
	"altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/internal/types"
)

type Custom struct {
	logger         *slog.Logger
	browserVersion types.BrowserVersion

	session *browserSession
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
	}

	go func() {
		defer func() {
			r := recover()
			assert.AssertWithMessage(r == nil, "Generator initialization panicked", "error", r)
		}()

		logger.Info("Initializing Custom CDP")

		// Get and set browser version
		version, err := getBrowserVersion(logger)
		assert.AssertWithMessage(err == nil, "Failed to get browser version", "error", err)

		generator.browserVersion = version
		logger.Info("Chrome version",
			"product", version.Product,
			"revision", version.Revision,
			"protocol", version.ProtocolVersion,
		)

		init := func(id int) *browserSession {
			logger.Info("Starting browser worker", "id", id)

			session, err := newBrowserSession(logger, id)
			assert.AssertWithMessage(err == nil, "Failed to create worker", "id", id, "error", err)

			return session
		}

		generator.session = init(1)
	}()

	return generator, nil
}

func (g *Custom) IsReady() bool {
	return g.session != nil
}

func (g *Custom) Generate(ctx context.Context, request types.PdfRequest) (*types.PdfResult, *types.PDFError) {
	assert.AssertWithMessage(g.session != nil, "The worker should not call the generator unless it is ready", "url", request.URL)
	assert.AssertWithMessage(request.Validate() == nil, "Invalid request passed through to worker", "url", request.URL)

	responder := make(chan workerResponse, 1)
	req := workerRequest{
		request:   request,
		responder: responder,
		ctx:       ctx,
		cleanedUp: false,
		logger:    g.logger.With("url", request.URL),
	}

	if g.session.tryEnqueue(req) {
		// Successfully enqueued to browserA
	} else {
		g.logger.Warn("Request queue full, rejecting request", "url", request.URL)
		return nil, types.NewPDFError(types.ErrQueueFull, "", nil)
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
	case <-time.After(types.RequestTimeout()):
		assert.AssertWithMessage(false, "generator failed to respond to request, something must be stuck", "url", request.URL)
		return nil, types.NewPDFError(types.ErrGenerationFail, "internal request timeout", nil)
	}
}

func (g *Custom) Close() error {
	g.logger.Info("Closing PDF generator")
	if g.session != nil {
		g.session.close()
	}
	return nil
}

type workerRequest struct {
	request   types.PdfRequest
	responder chan workerResponse
	ctx       context.Context
	cleanedUp bool
	logger    *slog.Logger
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
	assert.AssertWithMessage(ok, "Invalid type for test internals mode input on context")
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
