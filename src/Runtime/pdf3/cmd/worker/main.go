package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"runtime"
	"strings"
	"time"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/config"
	"altinn.studio/pdf3/internal/generator"
	ihttp "altinn.studio/pdf3/internal/http"
	"altinn.studio/pdf3/internal/log"
	iruntime "altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/telemetry"
	"altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/internal/types"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

var (
	workerId string
	workerIP string
)

func main() {
	baseLogger := log.NewComponent("worker")

	baseLogger.Info("Starting", "GOMAXPROCS", runtime.GOMAXPROCS(0), "NumCPU", runtime.NumCPU())

	otelShutdown, err := telemetry.ConfigureOTel(context.Background())
	if err != nil {
		baseLogger.Error("Failed to initialize telemetry", "error", err)
		os.Exit(1)
	}

	cfg := config.ReadConfig()
	hostParams := config.ResolveHostParametersForEnvironment(cfg.Environment)

	host := iruntime.NewHost(
		hostParams.ReadinessDrainDelay,
		hostParams.ShutdownPeriod,
		hostParams.ShutdownHardPeriod,
	)
	defer host.Stop()

	hostname, err := os.Hostname()
	assert.That(err == nil, "Could not read hostname", "error", err)

	workerId = hostname

	workerIP, err = discoverLocalIP()
	assert.That(err == nil, "Failed to discover local IP", "error", err)
	assert.That(workerIP != "", "Worker IP should be available", "worker_id", workerId)

	// Create logger with worker context
	logger := baseLogger.With("worker_id", workerId, "worker_ip", workerIP)

	gen, err := generator.New()
	assert.That(err == nil, "Failed to create PDF generator", "error", err)
	defer func() {
		// Closing PDF generator during shutdown
		if err := gen.Close(); err != nil {
			logger.Error("Failed to close PDF generator", "error", err)
		}
	}()

	// Start HTTP server for both PDF generation and probes
	http.HandleFunc("/health/startup", func(w http.ResponseWriter, r *http.Request) {
		if host.IsShuttingDown() || !gen.IsReady() {
			w.WriteHeader(http.StatusServiceUnavailable)
			if _, err := w.Write([]byte("Shutting down")); err != nil {
				logger.Error("Failed to write health check response", "error", err)
			}
		} else {
			w.WriteHeader(http.StatusOK)
			if _, err := w.Write([]byte("OK")); err != nil {
				logger.Error("Failed to write health check response", "error", err)
			}
		}
	})
	http.HandleFunc("/health/ready", func(w http.ResponseWriter, r *http.Request) {
		if host.IsShuttingDown() || !gen.IsReady() {
			w.WriteHeader(http.StatusServiceUnavailable)
			if _, err := w.Write([]byte("Shutting down")); err != nil {
				logger.Error("Failed to write health check response", "error", err)
			}
		} else {
			w.WriteHeader(http.StatusOK)
			if _, err := w.Write([]byte("OK")); err != nil {
				logger.Error("Failed to write health check response", "error", err)
			}
		}
	})
	http.HandleFunc("/health/live", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write([]byte("OK")); err != nil {
			logger.Error("Failed to write health check response", "error", err)
		}
	})

	// The localtest harness will run on all dev machines
	// We can avoid some overhead by just running the single container
	if cfg.Environment == config.EnvironmentLocaltest {
		http.Handle("/pdf", telemetry.WrapHandler("POST /pdf", generateLocalPdfHandler(logger, gen)))
	} else {
		http.Handle("/generate", telemetry.WrapHandler("POST /generate", generatePdfHandler(logger, gen)))
	}
	// Only register test output endpoint in test internals mode
	if iruntime.IsTestInternalsMode {
		http.HandleFunc("/testoutput/", getTestOutputHandler(logger))
	}

	httpServer := &http.Server{
		Addr: ":5031",
		BaseContext: func(_ net.Listener) context.Context {
			return host.ServerContext()
		},
	}

	go func() {
		logger.Info("Starting worker HTTP server", "addr", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("HTTP server crashed", "error", err)
			os.Exit(1)
		}
	}()

	host.WaitForShutdownSignal()
	host.WaitForReadinessDrain()

	logger.Info("Shutting down HTTP server")
	err = httpServer.Shutdown(host.ServerContext())
	if err != nil {
		logger.Warn("Failed to wait for ongoing requests to finish, waiting for forced cancellation")
		host.WaitForHardShutdown()
	} else {
		logger.Info("Gracefully shut down HTTP server")
	}

	logger.Info("Shutting down telemetry")
	telemetryShutdownTimeout := config.ResolveTelemetryShutdownTimeoutForEnvironment(cfg.Environment)
	if telemetryShutdownTimeout == 0 {
		logger.Info("Skipping graceful telemetry flush", "environment", cfg.Environment)
	} else {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), telemetryShutdownTimeout)
		defer cancel()
		if err := otelShutdown(shutdownCtx); err != nil {
			logger.Warn("Failed to gracefully shut down telemetry", "error", err)
		}
	}

	logger.Info("Server shut down gracefully")
}

func generateLocalPdfHandler(logger *slog.Logger, gen types.PdfGenerator) http.HandlerFunc {
	assert.That(!iruntime.IsTestInternalsMode, "Localtest env should not run internals test mode")

	return func(w http.ResponseWriter, r *http.Request) {
		data := telemetry.NewRequestEventData()
		r = r.WithContext(telemetry.WithRequestEventData(r.Context(), data))
		span := trace.SpanFromContext(r.Context())
		setWorkerSpanAttrs(span)
		defer telemetry.EmitRequestSummary(span, data)

		if r.Method != http.MethodPost {
			ihttp.WriteProblemDetails(logger, w, r, http.StatusMethodNotAllowed, ihttp.ProblemDetails{
				Type:                 "https://tools.ietf.org/html/rfc7231#section-6.5.5",
				Title:                "Method Not Allowed",
				Status:               http.StatusMethodNotAllowed,
				Detail:               "Only POST method is allowed",
				TraceRejectionReason: "method_not_allowed",
			})
			return
		}

		ct := strings.ToLower(r.Header.Get("Content-Type"))
		if !strings.HasPrefix(ct, "application/json") {
			ihttp.WriteProblemDetails(logger, w, r, http.StatusUnsupportedMediaType, ihttp.ProblemDetails{
				Type:                 "https://tools.ietf.org/html/rfc7231#section-6.5.13",
				Title:                "Unsupported Media Type",
				Status:               http.StatusUnsupportedMediaType,
				Detail:               "Content-Type must be application/json",
				TraceRejectionReason: "unsupported_media_type",
			})
			return
		}
		const maxBodySize = 1024 * 64 // 64K should be plenty for the JSON request
		if r.ContentLength > maxBodySize {
			ihttp.WriteProblemDetails(logger, w, r, http.StatusRequestEntityTooLarge, ihttp.ProblemDetails{
				Type:                 "https://tools.ietf.org/html/rfc7231#section-6.5.11",
				Title:                "Request Entity Too Large",
				Status:               http.StatusRequestEntityTooLarge,
				Detail:               fmt.Sprintf("Request body too large (max %d bytes)", maxBodySize),
				TraceRejectionReason: "request_entity_too_large",
			})
			return
		}

		r.Body = http.MaxBytesReader(w, r.Body, maxBodySize)
		defer func() { _ = r.Body.Close() }()

		var req types.PdfRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			ihttp.WriteProblemDetails(logger, w, r, http.StatusBadRequest, ihttp.ProblemDetails{
				Type:                 "https://tools.ietf.org/html/rfc7231#section-6.5.1",
				Title:                "Bad Request",
				Status:               http.StatusBadRequest,
				Detail:               fmt.Sprintf("Invalid JSON payload: %v", err),
				TraceRejectionReason: "invalid_json",
				TraceRejectionError:  err,
			})
			return
		}

		logger = logger.With("url", req.URL)
		data.SetPdfRequest(req)

		if err := req.Validate(); err != nil {
			ihttp.WriteProblemDetails(logger, w, r, http.StatusBadRequest, ihttp.ProblemDetails{
				Type:                 "https://tools.ietf.org/html/rfc7231#section-6.5.1",
				Title:                "Bad Request",
				Status:               http.StatusBadRequest,
				Detail:               fmt.Sprintf("Validation error: %v", err),
				TraceRejectionReason: "validation_error",
				TraceRejectionError:  err,
			})
			return
		}

		requestContext := r.Context()
		result, pdfErr := gen.Generate(requestContext, req)

		if pdfErr != nil {
			recordPDFError(span, pdfErr)
			errStr := pdfErr.Error()
			errorCode := http.StatusInternalServerError

			problemType := "https://tools.ietf.org/html/rfc7231#section-6.6.1"
			problemTitle := "Internal Server Error"
			if pdfErr.Is(types.ErrQueueFull) {
				problemType = "https://tools.ietf.org/html/rfc6585#section-4"
				problemTitle = "Too Many Requests"
				errorCode = http.StatusTooManyRequests
			}

			data.SetPDFError(pdfErr)
			data.SetResponseStatus(errorCode)
			ihttp.WriteProblemDetails(logger, w, r, errorCode, ihttp.ProblemDetails{
				Type:   problemType,
				Title:  problemTitle,
				Status: errorCode,
				Detail: errStr,
			})
			logger.Error(
				"Error during generation",
				"status_code", errorCode,
				"detail", errStr,
			)
			return
		}

		// Success - return PDF bytes
		data.SetResponseStatus(http.StatusOK)
		data.SetResponseSize(len(result.Data))
		w.Header().Set("Content-Type", "application/pdf")

		w.WriteHeader(http.StatusOK)
		if _, err := w.Write(result.Data); err != nil {
			logger.Error("Failed to write PDF response", "error", err)
		}
	}
}

func generatePdfHandler(logger *slog.Logger, gen types.PdfGenerator) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Worker-Id", workerId)
		w.Header().Set("X-Worker-IP", workerIP)

		data := telemetry.NewRequestEventData()
		r = r.WithContext(telemetry.WithRequestEventData(r.Context(), data))
		span := trace.SpanFromContext(r.Context())
		setWorkerSpanAttrs(span)
		defer telemetry.EmitRequestSummary(span, data)

		if r.Method != http.MethodPost {
			data.SetRejection("method_not_allowed", nil)
			data.SetErrorMessageIfEmpty("Only POST method is allowed")
			data.SetResponseStatus(http.StatusMethodNotAllowed)
			w.WriteHeader(http.StatusMethodNotAllowed)
			if _, err := w.Write([]byte("Only POST method is allowed")); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}

		ct := strings.ToLower(r.Header.Get("Content-Type"))
		if !strings.HasPrefix(ct, "application/json") {
			data.SetRejection("unsupported_media_type", nil)
			data.SetErrorMessageIfEmpty("Content-Type must be application/json")
			data.SetResponseStatus(http.StatusUnsupportedMediaType)
			w.WriteHeader(http.StatusUnsupportedMediaType)
			if _, err := w.Write([]byte("Content-Type must be application/json")); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}
		if !iruntime.IsTestInternalsMode && r.Header.Get(testing.TestInputHeaderName) != "" {
			data.SetRejection("illegal_test_header", nil)
			data.SetErrorMessageIfEmpty("Illegal internals test mode header")
			data.SetResponseStatus(http.StatusBadRequest)
			w.WriteHeader(http.StatusBadRequest)
			if _, err := w.Write([]byte("Illegal internals test mode header")); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}

		defer func() { _ = r.Body.Close() }()

		var req types.PdfRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			data.SetRejection("invalid_json", err)
			data.SetErrorMessageIfEmpty(fmt.Sprintf("Invalid JSON payload: %v", err))
			data.SetResponseStatus(http.StatusBadRequest)
			w.WriteHeader(http.StatusBadRequest)
			if _, err := fmt.Fprintf(w, "Invalid JSON payload: %v", err); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}

		logger = logger.With("url", req.URL)
		data.SetPdfRequest(req)

		requestContext := r.Context()
		if iruntime.IsTestInternalsMode && testing.HasTestHeader(r.Header) {
			testInput := &testing.PdfInternalsTestInput{}
			testInput.Deserialize(r.Header)
			testOutput := testing.NewTestOutput(testInput)
			requestContext = context.WithValue(requestContext, testing.TestInputContextKey(), testInput)
			testing.StoreTestOutput(testOutput)
		}
		result, pdfErr := gen.Generate(requestContext, req)

		if pdfErr != nil {
			recordPDFError(span, pdfErr)
			errStr := pdfErr.Error()
			errorCode := http.StatusInternalServerError

			// Map specific errors to HTTP status codes
			if pdfErr.Is(types.ErrQueueFull) {
				errorCode = http.StatusTooManyRequests
			}

			data.SetPDFError(pdfErr)
			data.SetResponseStatus(errorCode)
			w.WriteHeader(errorCode)
			if _, err := w.Write([]byte(errStr)); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}

		// Success - return PDF bytes
		data.SetResponseStatus(http.StatusOK)
		data.SetResponseSize(len(result.Data))
		w.Header().Set("Content-Type", "application/pdf")

		w.WriteHeader(http.StatusOK)
		if _, err := w.Write(result.Data); err != nil {
			logger.Error("Failed to write PDF response", "error", err)
		}
	}
}

// discoverLocalIP finds the first non-loopback IPv4 address on this host.
// This works in both Kubernetes and regular containers.
func discoverLocalIP() (string, error) {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "", err
	}

	for _, addr := range addrs {
		if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
			if ipNet.IP.To4() != nil {
				return ipNet.IP.String(), nil
			}
		}
	}

	return "", fmt.Errorf("no non-loopback IPv4 address found")
}

func getTestOutputHandler(logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		assert.That(iruntime.IsTestInternalsMode, "Test output handler should only be registered in test internals mode")

		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			if _, err := w.Write([]byte("Only GET method is allowed")); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}

		// Extract ID from URL path: /testoutput/{id}
		path := strings.TrimPrefix(r.URL.Path, "/testoutput/")
		if path == "" || path == r.URL.Path {
			w.WriteHeader(http.StatusBadRequest)
			if _, err := w.Write([]byte("Missing test output ID")); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}

		// Get test output from store
		output, found := testing.GetTestOutput(path)
		if !found {
			w.WriteHeader(http.StatusNotFound)
			if _, err := w.Write([]byte("Test output not found")); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}

		// Wait for all snapshots to be collected
		if !output.WaitForComplete(30 * time.Second) {
			w.WriteHeader(http.StatusRequestTimeout)
			if _, err := w.Write([]byte("Timeout waiting for test output to complete")); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}

		// Return test output as JSON
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		jsonData, err := json.Marshal(output)
		if err != nil {
			logger.Error("Failed to marshal test output", "error", err)
			w.WriteHeader(http.StatusInternalServerError)
			if _, err := w.Write([]byte("Failed to serialize test output")); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}

		if _, err := w.Write(jsonData); err != nil {
			logger.Error("Failed to write test output response", "error", err)
		}
	}
}

func setWorkerSpanAttrs(span trace.Span) {
	if !span.IsRecording() {
		return
	}
	span.SetAttributes(
		attribute.String("worker.id", workerId),
		attribute.String("worker.ip", workerIP),
	)
}

func recordPDFError(span trace.Span, pdfErr *types.PDFError) {
	if pdfErr == nil || !span.IsRecording() {
		return
	}
	// Queue-full 429s are expected; proxy retries handle them.
	// Record as an event, not an error, to avoid false error noise.
	if pdfErr.Is(types.ErrQueueFull) {
		span.AddEvent("pdf.queue.full")
		return
	}
	span.RecordError(pdfErr)
}
