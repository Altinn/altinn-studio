package generator

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/browser"
	"altinn.studio/pdf3/internal/cdp"
	"altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/internal/types"
)

type Custom struct {
	browserVersion types.BrowserVersion

	session *browserSession
}

// getBrowserVersion starts a temporary browser and retrieves its version information.
func getBrowserVersion() (types.BrowserVersion, error) {
	// Start temporary browser instance
	browserProc, err := browser.Start(-1)
	if err != nil {
		return types.BrowserVersion{}, fmt.Errorf("failed to create temporary browser for version info: %w", err)
	}
	defer func() {
		if err := browserProc.Close(); err != nil {
			log.Printf("WARNING: Failed to close temporary browser: %v - process may be lingering\n", err)
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
	const workerCount int = 1
	log.Printf("Starting Custom CDP with %d browser workers\n", workerCount)

	generator := &Custom{}

	go func() {
		log.Printf("Initializing Custom CDP\n")

		// Get and set browser version
		version, err := getBrowserVersion()
		if err != nil {
			log.Fatalf("Failed to get browser version: %v", err)
		}

		generator.browserVersion = version
		log.Printf(
			"Chrome version: %s (revision: %s, protocol: %s)\n",
			version.Product,
			version.Revision,
			version.ProtocolVersion,
		)

		init := func(i int, sessions chan<- *browserSession) {
			log.Printf("Starting browser worker %d\n", i)

			session, err := newBrowserSession(i)
			if err != nil {
				log.Fatalf("Failed to create worker %d: %v", i, err)
			}

			sessions <- session
		}

		sessions := make(chan *browserSession, workerCount)

		go init(workerCount, sessions)

		generator.session = <-sessions
	}()

	return generator, nil
}

func (g *Custom) IsReady() bool {
	return g.session != nil
}

func (g *Custom) Generate(ctx context.Context, request types.PdfRequest) (*types.PdfResult, *types.PDFError) {
	assert.AssertWithMessage(g.session != nil, "The worker should not call the generator unless it is ready")
	assert.AssertWithMessage(request.Validate() == nil, "Invalid request passed through to worker")

	responder := make(chan workerResponse, 1)
	req := workerRequest{
		request:   request,
		responder: responder,
		ctx:       ctx,
		cleanedUp: false,
	}

	if g.session.tryEnqueue(req) {
		// Successfully enqueued to browserA
	} else {
		log.Printf("Request queue full, rejecting request for URL: %s\n", request.URL)
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
	case <-time.After(30 * time.Second):
		log.Printf("Client timeout waiting for PDF generation (30s) for URL: %s - abandoning request\n", request.URL)
		return nil, types.NewPDFError(types.ErrTimeout, "", nil)
	}
}

func (g *Custom) Close() error {
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
			log.Printf("Worker: responded successfully for URL: %s, data size: %d bytes\n", r.request.URL, len(data))
			break
		default:
			log.Printf(
				"Worker: client abandoned request (likely timed out), dropping response for URL: %s\n",
				r.request.URL,
			)
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
			log.Printf(
				"Worker: client abandoned request (likely timed out), dropping response for URL: %s\n",
				r.request.URL,
			)
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
