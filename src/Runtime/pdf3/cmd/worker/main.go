package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/generator"
	"altinn.studio/pdf3/internal/log"
	"altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/internal/types"
)

var (
	workerId string
	workerIP string
)

func main() {
	baseLogger := log.NewComponent("worker")

	host := runtime.NewHost(
		5*time.Second,
		50*time.Second,
		3*time.Second,
	)
	defer host.Stop()

	hostname, err := os.Hostname()
	assert.AssertWithMessage(err == nil, "Could not read hostname", "error", err)

	workerId = hostname

	// Get pod IP from environment variable (set by Kubernetes downward API)
	workerIP = os.Getenv("POD_IP")
	assert.AssertWithMessage(workerIP != "", "Worker IP should always be configured", "worker_id", workerId)

	// Create logger with worker context
	logger := baseLogger.With("worker_id", workerId, "worker_ip", workerIP)

	gen, err := generator.New()
	assert.AssertWithMessage(err == nil, "Failed to create PDF generator", "error", err)
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

	http.HandleFunc("/generate", generatePdfHandler(logger, gen))

	// Only register test output endpoint in test internals mode
	if runtime.IsTestInternalsMode {
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

	logger.Info("Server shut down gracefully")
}

func generatePdfHandler(logger *slog.Logger, gen types.PdfGenerator) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Worker-Id", workerId)
		w.Header().Set("X-Worker-IP", workerIP)

		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			if _, err := w.Write([]byte("Only POST method is allowed")); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}

		ct := strings.ToLower(r.Header.Get("Content-Type"))
		if !strings.HasPrefix(ct, "application/json") {
			w.WriteHeader(http.StatusUnsupportedMediaType)
			if _, err := w.Write([]byte("Content-Type must be application/json")); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}
		if !runtime.IsTestInternalsMode && r.Header.Get(testing.TestInputHeaderName) != "" {
			w.WriteHeader(http.StatusBadRequest)
			if _, err := w.Write([]byte("Illegal internals test mode header")); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}

		defer func() { _ = r.Body.Close() }()

		var req types.PdfRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			if _, err := fmt.Fprintf(w, "Invalid JSON payload: %v", err); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}

		logger = logger.With("url", req.URL)

		requestContext := r.Context()
		if runtime.IsTestInternalsMode && testing.HasTestHeader(r.Header) {
			testInput := &testing.PdfInternalsTestInput{}
			testInput.Deserialize(r.Header)
			testOutput := testing.NewTestOutput(testInput)
			requestContext = context.WithValue(requestContext, testing.TestInputContextKey(), testInput)
			testing.StoreTestOutput(testOutput)
		}
		result, pdfErr := gen.Generate(requestContext, req)

		if pdfErr != nil {
			errStr := pdfErr.Error()
			errorCode := http.StatusInternalServerError

			// Map specific errors to HTTP status codes
			if pdfErr.Is(types.ErrQueueFull) {
				errorCode = http.StatusTooManyRequests
			}

			w.WriteHeader(errorCode)
			if _, err := w.Write([]byte(errStr)); err != nil {
				logger.Error("Failed to write error response", "error", err)
			}
			return
		}

		// Success - return PDF bytes
		w.Header().Set("Content-Type", "application/pdf")

		w.WriteHeader(http.StatusOK)
		if _, err := w.Write(result.Data); err != nil {
			logger.Error("Failed to write PDF response", "error", err)
		}
	}
}

func getTestOutputHandler(logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		assert.AssertWithMessage(runtime.IsTestInternalsMode, "Test output handler should only be registered in test internals mode")

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
