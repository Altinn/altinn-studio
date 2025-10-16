package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/generator"
	ilog "altinn.studio/pdf3/internal/log"
	"altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/internal/types"
)

var (
	workerId string
	workerIP string
)

func main() {
	ilog.Setup()

	host := runtime.NewHost(
		5*time.Second,
		50*time.Second,
		3*time.Second,
	)
	defer host.Stop()

	hostname, err := os.Hostname()
	if err != nil {
		log.Fatalf("Could not read hostname: %v", err)
	}

	workerId = hostname

	// Get pod IP from environment variable (set by Kubernetes downward API)
	workerIP = os.Getenv("POD_IP")
	assert.AssertWithMessage(workerIP != "", "Worker IP should always be configured")

	gen, err := generator.New()
	if err != nil {
		log.Fatalf("Failed to create PDF generator: %v", err)
	}
	defer func() {
		// Closing PDF generator during shutdown
		if err := gen.Close(); err != nil {
			log.Printf("Failed to close PDF generator: %v\n", err)
		}
	}()

	// Start HTTP server for both PDF generation and probes
	http.HandleFunc("/health/startup", func(w http.ResponseWriter, r *http.Request) {
		if host.IsShuttingDown() {
			w.WriteHeader(http.StatusServiceUnavailable)
			if _, err := w.Write([]byte("Shutting down")); err != nil {
				log.Printf("Failed to write health check response: %v\n", err)
			}
		} else {
			w.WriteHeader(http.StatusOK)
			if _, err := w.Write([]byte("OK")); err != nil {
				log.Printf("Failed to write health check response: %v\n", err)
			}
		}
	})
	http.HandleFunc("/health/ready", func(w http.ResponseWriter, r *http.Request) {
		if host.IsShuttingDown() {
			w.WriteHeader(http.StatusServiceUnavailable)
			if _, err := w.Write([]byte("Shutting down")); err != nil {
				log.Printf("Failed to write health check response: %v\n", err)
			}
		} else {
			w.WriteHeader(http.StatusOK)
			if _, err := w.Write([]byte("OK")); err != nil {
				log.Printf("Failed to write health check response: %v\n", err)
			}
		}
	})
	http.HandleFunc("/health/live", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write([]byte("OK")); err != nil {
			log.Printf("Failed to write health check response: %v\n", err)
		}
	})

	http.HandleFunc("/generate", generatePdfHandler(gen))

	// Only register test output endpoint in test internals mode
	if runtime.IsTestInternalsMode {
		http.HandleFunc("/testoutput/", getTestOutputHandler())
	}

	httpServer := &http.Server{
		Addr: ":5031",
		BaseContext: func(_ net.Listener) context.Context {
			return host.ServerContext()
		},
	}

	go func() {
		log.Printf("Starting worker HTTP server on %s\n", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server crashed: %v", err)
		}
	}()

	host.WaitForShutdownSignal()
	host.WaitForReadinessDrain()

	log.Println("Shutting down HTTP server..")
	err = httpServer.Shutdown(host.ServerContext())
	if err != nil {
		log.Println("Failed to wait for ongoing requests to finish, waiting for forced cancellation.")
		host.WaitForHardShutdown()
	} else {
		log.Println("Gracefully shut down HTTP server")
	}

	log.Println("Server shut down gracefully")
}

func generatePdfHandler(gen types.PdfGenerator) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Worker-Id", workerId)
		w.Header().Set("X-Worker-IP", workerIP)

		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			if _, err := w.Write([]byte("Only POST method is allowed")); err != nil {
				log.Printf("Failed to write error response: %v\n", err)
			}
			return
		}

		if r.Header.Get("Content-Type") != "application/json" {
			w.WriteHeader(http.StatusUnsupportedMediaType)
			if _, err := w.Write([]byte("Content-Type must be application/json")); err != nil {
				log.Printf("Failed to write error response: %v\n", err)
			}
			return
		}
		if testing.HasTestHeader(r.Header) && !runtime.IsTestInternalsMode {
			w.WriteHeader(http.StatusBadRequest)
			if _, err := w.Write([]byte("Illeagel internals test mode header")); err != nil {
				log.Printf("Failed to write error response: %v\n", err)
			}
			return
		}

		var req types.PdfRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			if _, err := w.Write([]byte(fmt.Sprintf("Invalid JSON payload: %v", err))); err != nil {
				log.Printf("Failed to write error response: %v\n", err)
			}
			return
		}

		requestContext := r.Context()
		if runtime.IsTestInternalsMode && testing.HasTestHeader(r.Header) {
			testInput := &testing.PdfInternalsTestInput{}
			testInput.Deserialize(r.Header)
			testOutput := testing.NewTestOutput(testInput)
			requestContext = context.WithValue(requestContext, testing.TestInputHeaderName, testInput)
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
				log.Printf("Failed to write error response: %v\n", err)
			}
			return
		}

		// Success - return PDF bytes
		w.Header().Set("Content-Type", "application/pdf")

		w.WriteHeader(http.StatusOK)
		if _, err := w.Write(result.Data); err != nil {
			log.Printf("Failed to write PDF response: %v\n", err)
		}
	}
}

func getTestOutputHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		assert.AssertWithMessage(runtime.IsTestInternalsMode, "Test output handler should only be registered in test internals mode")

		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			if _, err := w.Write([]byte("Only GET method is allowed")); err != nil {
				log.Printf("Failed to write error response: %v\n", err)
			}
			return
		}

		// Extract ID from URL path: /testoutput/{id}
		path := strings.TrimPrefix(r.URL.Path, "/testoutput/")
		if path == "" || path == r.URL.Path {
			w.WriteHeader(http.StatusBadRequest)
			if _, err := w.Write([]byte("Missing test output ID")); err != nil {
				log.Printf("Failed to write error response: %v\n", err)
			}
			return
		}

		// Get test output from store
		output, found := testing.GetTestOutput(path)
		if !found {
			w.WriteHeader(http.StatusNotFound)
			if _, err := w.Write([]byte("Test output not found")); err != nil {
				log.Printf("Failed to write error response: %v\n", err)
			}
			return
		}

		// Wait for all snapshots to be collected (with 5 second timeout)
		if !output.WaitForComplete(30 * time.Second) {
			w.WriteHeader(http.StatusRequestTimeout)
			if _, err := w.Write([]byte("Timeout waiting for test output to complete")); err != nil {
				log.Printf("Failed to write error response: %v\n", err)
			}
			return
		}

		// Return test output as JSON
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		jsonData, err := json.Marshal(output)
		if err != nil {
			log.Printf("Failed to marshal test output: %v\n", err)
			w.WriteHeader(http.StatusInternalServerError)
			if _, err := w.Write([]byte("Failed to serialize test output")); err != nil {
				log.Printf("Failed to write error response: %v\n", err)
			}
			return
		}

		if _, err := w.Write(jsonData); err != nil {
			log.Printf("Failed to write test output response: %v\n", err)
		}
	}
}
