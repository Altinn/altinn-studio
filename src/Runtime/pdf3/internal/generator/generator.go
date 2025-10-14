package generator

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	"altinn.studio/pdf3/internal/browser"
	"altinn.studio/pdf3/internal/cdp"
	"altinn.studio/pdf3/internal/types"
)

type Custom struct {
	browserVersion types.BrowserVersion

	// Browser instances
	// We keep two sessions but only execute 1 PDF generation request at a time
	// The reason we have 2 browsers open is because we can process a new request on session B
	// as soon we start cleanup on session A
	browserA *browserSession
	browserB *browserSession

	mu sync.Mutex
}

// getBrowserVersion starts a temporary browser and retrieves its version information
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
	log.Printf("Starting Custom CDP with %d browser workers\n", 2)

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

		sessions := make(chan *browserSession, 2)

		go init(1, sessions)
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
	// If either of the workers are currently generating a PDF, we can't process the request
	if g.browserA.isGenerating() || g.browserB.isGenerating() {
		log.Printf("Request queue full, rejecting request for URL: %s\n", request.URL)
		returnErr = types.NewPDFError(types.ErrQueueFull, "", nil)
	} else {
		// If none of the sessions are generating,
		// let's pick the one that is ready to accept a request.
		// tryEnqueue will check if the session is ready and enqueue if so.

		if g.browserA.tryEnqueue(req) {
			// Successfully enqueued to browserA
		} else if g.browserB.tryEnqueue(req) {
			// Successfully enqueued to browserB
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
			Data:          response.Data,
			Browser:       g.browserVersion,
			ConsoleErrors: response.ConsoleErrors,
			LogErrors:     response.LogErrors,
		}, nil
	case <-ctx.Done():
		return nil, types.NewPDFError(types.ErrClientDropped, "", ctx.Err())
	case <-time.After(30 * time.Second):
		log.Printf("Client timeout waiting for PDF generation (30s) for URL: %s - abandoning request\n", request.URL)
		return nil, types.NewPDFError(types.ErrTimeout, "", nil)
	}
}

func (g *Custom) Close() error {
	// Cancel contexts to signal shutdown to both goroutines
	if g.browserA != nil {
		g.browserA.close()
	}
	if g.browserB != nil {
		g.browserB.close()
	}
	return nil
}

type workerRequest struct {
	request       types.PdfRequest
	responder     chan workerResponse
	ctx           context.Context
	cleanedUp     bool
	consoleErrors int
	logErrors     int
}

func (r *workerRequest) tryRespondOk(data []byte) {
	if r.responder != nil {
		response := workerResponse{
			Data:          data,
			Error:         nil,
			ConsoleErrors: r.consoleErrors,
			LogErrors:     r.logErrors,
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
	Data          []byte
	Error         *types.PDFError
	ConsoleErrors int
	LogErrors     int
}

var unitToPixels = map[string]float64{
	"px": 1,
	"in": 96,
	"cm": 37.8,
	"mm": 3.78,
}

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
