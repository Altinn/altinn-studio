package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"time"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/generator"
	ilog "altinn.studio/pdf3/internal/log"
	"altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/types"
)

var (
	workerId string
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
		if types.HasTestInternalsModeHeader(r.Header) && !runtime.IsTestInternalsMode {
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
		var testOutput *types.PdfInternalsTestOutput
		if runtime.IsTestInternalsMode {
			testInput := &types.PdfInternalsTestInput{}
			testInput.Deserialize(r.Header)
			testOutput = &types.PdfInternalsTestOutput{}
			requestContext = context.WithValue(requestContext, types.TestInputHeaderName, testInput)
			requestContext = context.WithValue(requestContext, types.TestOutputHeaderName, testOutput)
		}
		result, pdfErr := gen.Generate(requestContext, req)
		if runtime.IsTestInternalsMode {
			assert.AssertWithMessage(testOutput != nil, "Output should be initialized above")
			testOutput.Serialize(w.Header())
		}

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
