package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"runtime"
	"strings"
	"time"
	"unicode/utf8"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/config"
	ihttp "altinn.studio/pdf3/internal/http"
	"altinn.studio/pdf3/internal/log"
	iruntime "altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/telemetry"
	"altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/internal/types"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
)

func main() {
	logger := log.NewComponent("proxy")

	logger.Info("Starting", "GOMAXPROCS", runtime.GOMAXPROCS(0), "NumCPU", runtime.NumCPU())

	otelShutdown, err := telemetry.ConfigureOTel(context.Background())
	if err != nil {
		logger.Error("Failed to initialize telemetry", "error", err)
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

	// Setup HTTP client for worker communication
	workerHTTPAddr := os.Getenv("PDF3_WORKER_HTTP_ADDR")
	if workerHTTPAddr == "" {
		workerHTTPAddr = "http://localhost:5031"
	}

	httpClient := &http.Client{
		Timeout:   types.RequestTimeout(),
		Transport: http.DefaultTransport,
	}

	// Setup HTTP server
	http.HandleFunc("/health/startup", func(w http.ResponseWriter, r *http.Request) {
		if host.IsShuttingDown() {
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
		if host.IsShuttingDown() {
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

	http.Handle("/pdf", telemetry.WrapHandler("POST /pdf", generatePdf(logger, httpClient, workerHTTPAddr)))

	// Only register test output endpoint in test internals mode
	if iruntime.IsTestInternalsMode {
		http.HandleFunc("/testoutput/", forwardTestOutputRequest(logger, httpClient))
	}

	server := &http.Server{
		Addr: ":5030",
		BaseContext: func(_ net.Listener) context.Context {
			return host.ServerContext()
		},
	}

	go func() {
		logger.Info("Starting proxy HTTP server", "addr", server.Addr, "worker_addr", workerHTTPAddr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("HTTP server crashed", "error", err)
			os.Exit(1)
		}
	}()

	host.WaitForShutdownSignal()
	host.WaitForReadinessDrain()

	logger.Info("Shutting down HTTP server")
	err = server.Shutdown(host.ServerContext())
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

func generatePdf(logger *slog.Logger, client *http.Client, workerAddr string) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		if r.Method != http.MethodPost {
			ihttp.WriteProblemDetails(logger, w, r, http.StatusMethodNotAllowed, ihttp.ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.5",
				Title:  "Method Not Allowed",
				Status: http.StatusMethodNotAllowed,
				Detail: "Only POST method is allowed",
			})
			return
		}
		ct := strings.ToLower(r.Header.Get("Content-Type"))
		if !strings.HasPrefix(ct, "application/json") {
			ihttp.WriteProblemDetails(logger, w, r, http.StatusUnsupportedMediaType, ihttp.ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.13",
				Title:  "Unsupported Media Type",
				Status: http.StatusUnsupportedMediaType,
				Detail: "Content-Type must be application/json",
			})
			return
		}
		const maxBodySize = 1024 * 64 // 64K should be plenty for the JSON request
		if r.ContentLength > maxBodySize {
			ihttp.WriteProblemDetails(logger, w, r, http.StatusRequestEntityTooLarge, ihttp.ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.11",
				Title:  "Request Entity Too Large",
				Status: http.StatusRequestEntityTooLarge,
				Detail: fmt.Sprintf("Request body too large (max %d bytes)", maxBodySize),
			})
			return
		}
		if !iruntime.IsTestInternalsMode && r.Header.Get(testing.TestInputHeaderName) != "" {
			ihttp.WriteProblemDetails(logger, w, r, http.StatusBadRequest, ihttp.ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.1",
				Title:  "Bad Request",
				Status: http.StatusBadRequest,
				Detail: "Illegal test internals mode header",
			})
			return
		}

		r.Body = http.MaxBytesReader(w, r.Body, maxBodySize)
		defer func() { _ = r.Body.Close() }()

		var req types.PdfRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			ihttp.WriteProblemDetails(logger, w, r, http.StatusBadRequest, ihttp.ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.1",
				Title:  "Bad Request",
				Status: http.StatusBadRequest,
				Detail: fmt.Sprintf("Invalid JSON payload: %v", err),
			})
			return
		}

		// Validate request
		if err := req.Validate(); err != nil {
			ihttp.WriteProblemDetails(logger, w, r, http.StatusBadRequest, ihttp.ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.1",
				Title:  "Bad Request",
				Status: http.StatusBadRequest,
				Detail: fmt.Sprintf("Validation error: %v", err),
			})
			return
		}

		// Start generating the PDF with some (rather dumb) retry logic
		// Retry logic:
		//   Max 40 retry attempts on 429 (queue full) errors,
		//   while waiting 250ms in between attempts
		//   means we might try to allocate a worker for 10 seconds before giving up.
		//   If the cluster has available capacity a pod can boot in 2-10 seconds
		const maxRetries = 40
		reqLogger := logger.With("url", req.URL, "max_retries", maxRetries)
		reqLogger.Info("Generating PDF", "attempt", 0, "elapsed", time.Since(start))

		// Prepare request body
		reqBody, err := json.Marshal(req)
		if err != nil {
			ihttp.WriteProblemDetails(reqLogger, w, r, http.StatusInternalServerError, ihttp.ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.6.1",
				Title:  "Internal Server Error",
				Status: http.StatusInternalServerError,
				Detail: fmt.Sprintf("Failed to marshal request: %v", err),
			})
			return
		}

		workerEndpoint := workerAddr + "/generate"

		attempt := 1
		for {
			assert.That(attempt <= maxRetries, "Overflowed retry attempts")

			ret := callWorker(
				reqLogger,
				r.Context(),
				client,
				workerEndpoint,
				r,
				w,
				start,
				attempt,
				maxRetries,
				reqBody,
			)
			if ret {
				return
			}

			// Check if context is cancelled before retrying
			if r.Context().Err() != nil {
				return
			}

			attempt++
		}
	}
}

func callWorker(
	logger *slog.Logger,
	ctx context.Context,
	client *http.Client,
	workerEndpoint string,
	r *http.Request,
	w http.ResponseWriter,
	start time.Time,
	attempt int,
	maxRetries int,
	reqBody []byte,
) bool {
	// Call worker via HTTP
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, workerEndpoint, bytes.NewReader(reqBody))
	if err != nil {
		ihttp.WriteProblemDetails(logger, w, r, http.StatusInternalServerError, ihttp.ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.6.1",
			Title:  "Internal Server Error",
			Status: http.StatusInternalServerError,
			Detail: fmt.Sprintf("Failed to create worker request: %v", err),
		})
		return true
	}
	httpReq.Header.Set("Content-Type", "application/json")
	// Propagate trace context so the worker spans link to the proxy's parent span.
	// Done manually because we don't use otelhttp.NewTransport (it would mark each
	// retried 429 response as a span error, creating false error noise).
	otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(httpReq.Header))
	if iruntime.IsTestInternalsMode && testing.HasTestHeader(r.Header) {
		testing.CopyTestInput(httpReq.Header, r.Header)
	}

	resp, err := client.Do(httpReq)
	workerId := ""
	workerIP := ""
	if resp != nil {
		workerId = resp.Header.Get("X-Worker-Id")
		workerIP = resp.Header.Get("X-Worker-IP")
		logger = logger.With(
			"worker_id", workerId,
			"attempt", attempt,
		)
	} else {
		logger = logger.With(
			"attempt", attempt,
		)
	}
	if err != nil {
		if attempt < maxRetries && ctx.Err() == nil {
			// This is an error condition that may hit if the worker
			// crashes or similar. Worthwhile to retry here
			logger.Warn(
				"Worker request failed, will retry",
				"elapsed", time.Since(start),
				"error", err,
			)
			select {
			case <-time.After(250 * time.Millisecond):
			case <-ctx.Done():
			}
			return false
		}
		ihttp.WriteProblemDetails(logger, w, r, http.StatusInternalServerError, ihttp.ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.6.1",
			Title:  "Internal Server Error",
			Status: http.StatusInternalServerError,
			Detail: fmt.Sprintf("Failed to communicate with PDF worker: %v", err),
		})
		logger.Error(
			"Error calling PDF worker",
			"elapsed", time.Since(start),
			"error", err,
		)
		return true
	}
	defer func() { _ = resp.Body.Close() }()

	// Check if generation was successful
	if resp.StatusCode == http.StatusOK {
		// In test internals mode, pass back the worker IP to the client
		// so they can route test output requests to the correct worker pod
		if iruntime.IsTestInternalsMode && testing.HasTestHeader(r.Header) {
			assert.That(workerIP != "", "Worker IP should always be set in test internals mode")
			w.Header().Set("X-Worker-IP", workerIP)
			w.Header().Set("X-Worker-Id", workerId)
			logger.Debug("Returning worker info", "worker_ip", workerIP)
		}

		// Success - return PDF data
		w.Header().Set("Content-Type", "application/pdf")

		w.WriteHeader(http.StatusOK)
		if _, err := io.Copy(w, resp.Body); err != nil {
			logger.Error("Failed to write PDF response data", "error", err)
		}
		logger.Info("Successfully generated PDF",
			"elapsed", time.Since(start),
		)
		return true
	}

	// Check if this is a retryable error (429 - queue full)
	if resp.StatusCode == http.StatusTooManyRequests && attempt < maxRetries {
		logger.Warn(
			"Worker queue full, retrying",
			"elapsed", time.Since(start),
		)
		select {
		case <-time.After(250 * time.Millisecond):
		case <-ctx.Done():
		}
		return false
	}

	// Non-retryable error or max retries reached
	statusCode := resp.StatusCode
	errorDetailBytes, err := io.ReadAll(resp.Body)
	errorDetail := ""
	if err != nil {
		logger.Error("Error reading PDF worker response body", "error", err)
	}
	if !utf8.Valid(errorDetailBytes) {
		logger.Warn("Worker didn't return valid response body")
	} else {
		errorDetail = string(errorDetailBytes)
	}

	problemType := "https://tools.ietf.org/html/rfc7231#section-6.6.1"
	problemTitle := "Internal Server Error"
	if statusCode == http.StatusTooManyRequests {
		problemType = "https://tools.ietf.org/html/rfc6585#section-4"
		problemTitle = "Too Many Requests"
	} else if statusCode >= 400 && statusCode < 500 {
		problemType = "https://tools.ietf.org/html/rfc7231#section-6.5.1"
		problemTitle = "Bad Request"
	}

	// In test internals mode, pass back the worker IP even on errors
	// so tests can still fetch test output from the correct worker
	if iruntime.IsTestInternalsMode && testing.HasTestHeader(r.Header) {
		assert.That(workerIP != "", "Worker IP should always be set in test internals mode")
		w.Header().Set("X-Worker-IP", workerIP)
		w.Header().Set("X-Worker-Id", workerId)
	}

	ihttp.WriteProblemDetails(logger, w, r, statusCode, ihttp.ProblemDetails{
		Type:   problemType,
		Title:  problemTitle,
		Status: statusCode,
		Detail: string(errorDetail),
	})
	logger.Error(
		"Error during generation",
		"elapsed", time.Since(start),
		"status_code", statusCode,
		"detail", errorDetail,
	)
	return true
}

func forwardTestOutputRequest(logger *slog.Logger, client *http.Client) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		assert.That(iruntime.IsTestInternalsMode, "Test output endpoint should only be registered in test internals mode")

		// Extract test ID from URL path: /testoutput/{id}
		testID := strings.TrimPrefix(r.URL.Path, "/testoutput/")

		// Client should provide the worker IP via header to ensure we hit the right pod
		targetWorkerIP := r.Header.Get("X-Target-Worker-IP")
		assert.That(targetWorkerIP != "", "X-Target-Worker-IP header is required in test internals mode")

		// Route directly to the specified worker pod IP
		workerEndpoint := fmt.Sprintf("http://%s:5031%s", targetWorkerIP, r.URL.Path)
		logger.Debug("Routing test output request", "test_id", testID, "worker_ip", targetWorkerIP)

		httpReq, err := http.NewRequestWithContext(r.Context(), r.Method, workerEndpoint, nil)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			if _, err := w.Write([]byte("Failed to create worker request")); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}

		resp, err := client.Do(httpReq)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			if _, err := fmt.Fprintf(w, "Failed to communicate with worker: %v", err); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}
		defer func() { _ = resp.Body.Close() }()

		// Copy response headers and status
		for key, values := range resp.Header {
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}
		w.WriteHeader(resp.StatusCode)

		// Copy response body
		if _, err := io.Copy(w, resp.Body); err != nil {
			logger.Error("Failed to write test output response", "error", err)
		}
	}
}
