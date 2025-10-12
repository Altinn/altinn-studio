package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"sync/atomic"
	"time"
	"unicode/utf8"

	"altinn.studio/pdf3/internal/assert"
	ilog "altinn.studio/pdf3/internal/log"
	"altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/types"
)

var debugMode bool

func main() {
	ilog.Setup()

	debugMode = os.Getenv("DEBUG_MODE") == "true"
	if debugMode {
		log.Println("Running in DEBUG_MODE")
	}

	host := runtime.NewHost(
		5*time.Second,
		20*time.Second,
		3*time.Second,
	)
	defer host.Stop()

	// Setup HTTP client for worker communication
	workerHTTPAddr := os.Getenv("WORKER_HTTP_ADDR")
	if workerHTTPAddr == "" {
		workerHTTPAddr = "http://localhost:5031"
	}

	httpClient := &http.Client{
		Timeout: 35 * time.Second, // Slightly longer than worker's 30s timeout
	}

	connectivity := NewConnectivityChecker(httpClient, workerHTTPAddr)

	// Setup HTTP server
	http.HandleFunc("/health/startup", func(w http.ResponseWriter, r *http.Request) {
		if host.IsShuttingDown() {
			w.WriteHeader(http.StatusServiceUnavailable)
			if _, err := w.Write([]byte("Shutting down")); err != nil {
				log.Printf("Failed to write health check response: %v\n", err)
			}
		} else if connectivity.GetState() != WorkerConnectivityStateHealthy {
			w.WriteHeader(http.StatusServiceUnavailable)
			if _, err := w.Write([]byte("No connectivity")); err != nil {
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
		} else if connectivity.GetState() != WorkerConnectivityStateHealthy {
			w.WriteHeader(http.StatusServiceUnavailable)
			if _, err := w.Write([]byte("No connectivity")); err != nil {
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

	http.HandleFunc("/pdf", generatePdf(httpClient, workerHTTPAddr))

	server := &http.Server{
		Addr: ":5030",
		BaseContext: func(_ net.Listener) context.Context {
			return host.ServerContext()
		},
	}

	go func() {
		log.Printf("Starting proxy HTTP server on %s, connecting to worker at %s\n", server.Addr, workerHTTPAddr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server crashed: %v", err)
		}
	}()

	host.WaitForShutdownSignal()
	host.WaitForReadinessDrain()

	log.Println("Shutting down HTTP server..")
	err := server.Shutdown(host.ServerContext())
	if err != nil {
		log.Println("Failed to wait for ongoing requests to finish, waiting for forced cancellation.")
		host.WaitForHardShutdown()
	} else {
		log.Println("Gracefully shut down HTTP server")
	}

	log.Println("Server shut down gracefully")
}

func generatePdf(client *http.Client, workerAddr string) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		if r.Method != http.MethodPost {
			writeProblemDetails(w, http.StatusMethodNotAllowed, ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.5",
				Title:  "Method Not Allowed",
				Status: http.StatusMethodNotAllowed,
				Detail: "Only POST method is allowed",
			})
			return
		}
		if r.Header.Get("Content-Type") != "application/json" {
			writeProblemDetails(w, http.StatusUnsupportedMediaType, ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.13",
				Title:  "Unsupported Media Type",
				Status: http.StatusUnsupportedMediaType,
				Detail: "Content-Type must be application/json",
			})
			return
		}

		var req types.PdfRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeProblemDetails(w, http.StatusBadRequest, ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.1",
				Title:  "Bad Request",
				Status: http.StatusBadRequest,
				Detail: fmt.Sprintf("Invalid JSON payload: %v", err),
			})
			return
		}

		// Start generating the PDF with some (rather dumb) retry logic
		// Retry logic:
		//   Max 50 retry attempts on 429 (queue full) errors,
		//   while waiting 100ms in between attempts
		const maxRetries = 50
		duration := time.Since(start)
		log.Printf("[%s, %d/%d, %05dms] generating PDF..\n", req.URL, 0, maxRetries, duration.Milliseconds())

		// Prepare request body
		reqBody, err := json.Marshal(req)
		if err != nil {
			writeProblemDetails(w, http.StatusInternalServerError, ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.6.1",
				Title:  "Internal Server Error",
				Status: http.StatusInternalServerError,
				Detail: fmt.Sprintf("Failed to marshal request: %v", err),
			})
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer cancel()

		workerEndpoint := workerAddr + "/generate"

		attempt := 1
		for {
			assert.Assert(attempt <= maxRetries)

			ret := callWorker(
				ctx,
				client,
				workerEndpoint,
				w,
				start,
				req,
				attempt,
				maxRetries,
				reqBody,
			)
			if ret {
				return
			}

			attempt++
		}
	}
}

func callWorker(
	ctx context.Context,
	client *http.Client,
	workerEndpoint string,
	w http.ResponseWriter,
	start time.Time,
	req types.PdfRequest,
	attempt int,
	maxRetries int,
	reqBody []byte,
) bool {
	// Call worker via HTTP
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, workerEndpoint, bytes.NewReader(reqBody))
	if err != nil {
		writeProblemDetails(w, http.StatusInternalServerError, ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.6.1",
			Title:  "Internal Server Error",
			Status: http.StatusInternalServerError,
			Detail: fmt.Sprintf("Failed to create request: %v", err),
		})
		return true
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(httpReq)
	workerId := resp.Header.Get("X-Worker-Id")
	if err != nil {
		writeProblemDetails(w, http.StatusInternalServerError, ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.6.1",
			Title:  "Internal Server Error",
			Status: http.StatusInternalServerError,
			Detail: fmt.Sprintf("Failed to communicate with PDF worker: %v", err),
		})
		duration := time.Since(start)
		log.Printf(
			"[%s, %d/%d, %05dms] error calling PDF worker: %s: %v\n",
			req.URL,
			attempt,
			maxRetries,
			duration.Milliseconds(),
			workerId,
			err,
		)
		return true
	}
	defer func() { _ = resp.Body.Close() }()

	// Check if generation was successful
	if resp.StatusCode == http.StatusOK {
		// Success - return PDF data
		w.Header().Set("Content-Type", "application/pdf")

		// Forward debug headers if in DEBUG_MODE
		if debugMode {
			if consoleErrors := resp.Header.Get("X-Console-Errors"); consoleErrors != "" {
				w.Header().Set("X-Console-Errors", consoleErrors)
			}
			if logErrors := resp.Header.Get("X-Log-Errors"); logErrors != "" {
				w.Header().Set("X-Log-Errors", logErrors)
			}
		}

		w.WriteHeader(http.StatusOK)
		if _, err := io.Copy(w, resp.Body); err != nil {
			log.Printf("[%s] Failed to write PDF response data: %s, %v\n", req.URL, workerId, err)
		}
		duration := time.Since(start)
		log.Printf(
			"[%s, %d/%d, %05dms] successfully generated PDF: %s\n",
			req.URL,
			attempt,
			maxRetries,
			duration.Milliseconds(),
			workerId,
		)
		return true
	}

	// Check if this is a retryable error (429 - queue full)
	if resp.StatusCode == http.StatusTooManyRequests && attempt < maxRetries {
		duration := time.Since(start)
		log.Printf(
			"[%s, %d/%d, %05dms] worker queue full for %s retrying...\n",
			req.URL,
			attempt,
			maxRetries,
			duration.Milliseconds(),
			workerId,
		)
		time.Sleep(100 * time.Millisecond)
		return false
	}

	// Non-retryable error or max retries reached
	statusCode := resp.StatusCode
	errorDetailBytes, err := io.ReadAll(resp.Body)
	errorDetail := ""
	if err != nil {
		log.Printf("Error reading PDF worker response body: %s, %v\n", workerId, err)
	}
	if !utf8.Valid(errorDetailBytes) {
		log.Printf("Worker didn't return valid response body: %s\n", workerId)
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

	writeProblemDetails(w, statusCode, ProblemDetails{
		Type:   problemType,
		Title:  problemTitle,
		Status: statusCode,
		Detail: string(errorDetail),
	})
	duration := time.Since(start)
	log.Printf(
		"[%s, %d/%d, %05dms] error during generation. Worker: %s, Code: %d, detail: %s\n",
		req.URL,
		attempt,
		maxRetries,
		duration.Milliseconds(),
		workerId,
		statusCode,
		errorDetail,
	)
	return true
}

type WorkerConnectivityState uint32

const (
	WorkerConnectivityStateNone WorkerConnectivityState = iota
	WorkerConnectivityStateHealthy
	WorkerConnectivityStateBroken
)

type workerConnectivity struct {
	state atomic.Uint32
}

func NewConnectivityChecker(client *http.Client, workerAddr string) *workerConnectivity {
	self := &workerConnectivity{
		state: atomic.Uint32{},
	}

	go func() {
		for {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			req, err := http.NewRequestWithContext(ctx, http.MethodGet, workerAddr+"/health/ready", nil)
			if err != nil {
				cancel()
				log.Printf("Failed to create health check request: %v\n", err)
				time.Sleep(5 * time.Second)
				continue
			}

			resp, err := client.Do(req)
			cancel()

			gotValidResponse := err == nil && resp != nil && resp.StatusCode == http.StatusOK
			if resp != nil {
				resp.Body.Close()
			}

			var sleepDuration time.Duration
			if gotValidResponse {
				previousState := WorkerConnectivityState(self.state.Swap(uint32(WorkerConnectivityStateHealthy)))
				switch previousState {
				case WorkerConnectivityStateNone:
					log.Println("Initialized connectivity to worker")
				case WorkerConnectivityStateHealthy:
					break
				case WorkerConnectivityStateBroken:
					log.Println("Regained connectivity to worker")
				}

				sleepDuration = 10 * time.Second
			} else {
				previousState := WorkerConnectivityState(self.state.Swap(uint32(WorkerConnectivityStateBroken)))
				switch previousState {
				case WorkerConnectivityStateNone:
					log.Printf("Could not initialize connection to worker. Error: %v\n", err)
				case WorkerConnectivityStateHealthy:
					log.Printf("Failed first try at regaining connection to worker. Error: %v\n", err)
				case WorkerConnectivityStateBroken:
					log.Printf("Failed retry to gain connection to worker. Error: %v\n", err)
				}

				sleepDuration = 5 * time.Second
			}

			time.Sleep(sleepDuration)
		}
	}()

	return self
}

func (w *workerConnectivity) GetState() WorkerConnectivityState {
	state := w.state.Load()
	return WorkerConnectivityState(state)
}

type ProblemDetails struct {
	Type       string                 `json:"type,omitempty"`
	Title      string                 `json:"title,omitempty"`
	Status     int                    `json:"status,omitempty"`
	Detail     string                 `json:"detail,omitempty"`
	Instance   string                 `json:"instance,omitempty"`
	Extensions map[string]interface{} `json:"extensions,omitempty"`
}

func writeProblemDetails(w http.ResponseWriter, statusCode int, problem ProblemDetails) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(problem); err != nil {
		log.Printf("Warning: failed to encode error response: %v\n", err)
	}
}
