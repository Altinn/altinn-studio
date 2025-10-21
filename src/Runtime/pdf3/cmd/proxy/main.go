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
	"strings"
	"sync/atomic"
	"time"
	"unicode/utf8"

	"altinn.studio/pdf3/internal/assert"
	ilog "altinn.studio/pdf3/internal/log"
	"altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/internal/types"
)

func main() {
	ilog.Setup()

	host := runtime.NewHost(
		5*time.Second,
		50*time.Second,
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

	// Only register test output endpoint in test internals mode
	if runtime.IsTestInternalsMode {
		http.HandleFunc("/testoutput/", forwardTestOutputRequest(httpClient))
	}

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
		ct := strings.ToLower(r.Header.Get("Content-Type"))
		if !strings.HasPrefix(ct, "application/json") {
			writeProblemDetails(w, http.StatusUnsupportedMediaType, ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.13",
				Title:  "Unsupported Media Type",
				Status: http.StatusUnsupportedMediaType,
				Detail: "Content-Type must be application/json",
			})
			return
		}
		const maxBodySize = 1024 * 64 // 64K should be plenty for the JSON request
		if r.ContentLength > maxBodySize {
			writeProblemDetails(w, http.StatusRequestEntityTooLarge, ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.11",
				Title:  "Request Entity Too Large",
				Status: http.StatusRequestEntityTooLarge,
				Detail: fmt.Sprintf("Request body too large (max %d bytes)", maxBodySize),
			})
			return
		}
		if !runtime.IsTestInternalsMode && r.Header.Get(testing.TestInputHeaderName) != "" {
			writeProblemDetails(w, http.StatusBadRequest, ProblemDetails{
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
			writeProblemDetails(w, http.StatusBadRequest, ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.1",
				Title:  "Bad Request",
				Status: http.StatusBadRequest,
				Detail: fmt.Sprintf("Invalid JSON payload: %v", err),
			})
			return
		}

		// Validate request
		if err := req.Validate(); err != nil {
			writeProblemDetails(w, http.StatusBadRequest, ProblemDetails{
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
		log.Printf("[%s, %d/%d, %s] generating PDF..\n", req.URL, 0, maxRetries, time.Since(start))

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
			assert.AssertWithMessage(attempt <= maxRetries, "Overflowed retry attempts")

			ret := callWorker(
				ctx,
				client,
				workerEndpoint,
				r,
				w,
				start,
				&req,
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
	r *http.Request,
	w http.ResponseWriter,
	start time.Time,
	req *types.PdfRequest,
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
			Detail: fmt.Sprintf("Failed to create worker request: %v", err),
		})
		return true
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if runtime.IsTestInternalsMode && testing.HasTestHeader(r.Header) {
		testing.CopyTestInput(httpReq.Header, r.Header)
	}

	resp, err := client.Do(httpReq)
	workerId := ""
	workerIP := ""
	if resp != nil {
		workerId = resp.Header.Get("X-Worker-Id")
		workerIP = resp.Header.Get("X-Worker-IP")
	}
	if err != nil {
		if attempt < maxRetries && ctx.Err() == nil {
			// This is an error condition that may hit if the worker
			// crashes or similar. Worthwhile to retry here
			log.Printf(
				"[%s, %d/%d, %s] worker request failed, will retry: %v\n",
				req.URL,
				attempt,
				maxRetries,
				time.Since(start),
				err,
			)
			time.Sleep(250 * time.Millisecond)
			return false
		}
		writeProblemDetails(w, http.StatusInternalServerError, ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.6.1",
			Title:  "Internal Server Error",
			Status: http.StatusInternalServerError,
			Detail: fmt.Sprintf("Failed to communicate with PDF worker: %v", err),
		})
		log.Printf(
			"[%s, %d/%d, %s] error calling PDF worker: %s: %v\n",
			req.URL,
			attempt,
			maxRetries,
			time.Since(start),
			workerId,
			err,
		)
		return true
	}
	defer func() { _ = resp.Body.Close() }()

	// Check if generation was successful
	if resp.StatusCode == http.StatusOK {
		// In test internals mode, pass back the worker IP to the client
		// so they can route test output requests to the correct worker pod
		if runtime.IsTestInternalsMode && testing.HasTestHeader(r.Header) {
			assert.AssertWithMessage(workerIP != "", "Worker IP should always be set in test internals mode")
			w.Header().Set("X-Worker-IP", workerIP)
			w.Header().Set("X-Worker-Id", workerId)
			log.Printf("[TEST] Returning worker info: IP %s, ID %s\n", workerIP, workerId)
		}

		// Success - return PDF data
		w.Header().Set("Content-Type", "application/pdf")

		w.WriteHeader(http.StatusOK)
		if _, err := io.Copy(w, resp.Body); err != nil {
			log.Printf("[%s] Failed to write PDF response data: %s, %v\n", req.URL, workerId, err)
		}
		log.Printf(
			"[%s, %d/%d, %s] successfully generated PDF: %s\n",
			req.URL,
			attempt,
			maxRetries,
			time.Since(start),
			workerId,
		)
		return true
	}

	// Check if this is a retryable error (429 - queue full)
	if resp.StatusCode == http.StatusTooManyRequests && attempt < maxRetries {
		log.Printf(
			"[%s, %d/%d, %s] worker queue full for %s retrying...\n",
			req.URL,
			attempt,
			maxRetries,
			time.Since(start),
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

	// In test internals mode, pass back the worker IP even on errors
	// so tests can still fetch test output from the correct worker
	if runtime.IsTestInternalsMode && testing.HasTestHeader(r.Header) {
		assert.Assert(workerIP != "")
		w.Header().Set("X-Worker-IP", workerIP)
		w.Header().Set("X-Worker-Id", workerId)
	}

	writeProblemDetails(w, statusCode, ProblemDetails{
		Type:   problemType,
		Title:  problemTitle,
		Status: statusCode,
		Detail: string(errorDetail),
	})
	log.Printf(
		"[%s, %d/%d, %s] error during generation. Worker: %s, Code: %d, detail: %s\n",
		req.URL,
		attempt,
		maxRetries,
		time.Since(start),
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
				_ = resp.Body.Close()
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
	Type       string         `json:"type,omitempty"`
	Title      string         `json:"title,omitempty"`
	Status     int            `json:"status,omitempty"`
	Detail     string         `json:"detail,omitempty"`
	Instance   string         `json:"instance,omitempty"`
	Extensions map[string]any `json:"extensions,omitempty"`
}

func writeProblemDetails(w http.ResponseWriter, statusCode int, problem ProblemDetails) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false) // Don't escape <, >, & for cleaner error messages
	if err := encoder.Encode(problem); err != nil {
		log.Printf("Warning: failed to encode error response: %v\n", err)
	}
}

func forwardTestOutputRequest(client *http.Client) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		assert.AssertWithMessage(runtime.IsTestInternalsMode, "Test output endpoint should only be registered in test internals mode")

		// Extract test ID from URL path: /testoutput/{id}
		testID := strings.TrimPrefix(r.URL.Path, "/testoutput/")

		// Client should provide the worker IP via header to ensure we hit the right pod
		targetWorkerIP := r.Header.Get("X-Target-Worker-IP")
		assert.AssertWithMessage(targetWorkerIP != "", "X-Target-Worker-IP header is required in test internals mode")

		// Route directly to the specified worker pod IP
		workerEndpoint := fmt.Sprintf("http://%s:5031%s", targetWorkerIP, r.URL.Path)
		log.Printf("[TEST] Routing test output request for %s to worker IP %s\n", testID, targetWorkerIP)

		httpReq, err := http.NewRequestWithContext(r.Context(), r.Method, workerEndpoint, nil)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			if _, err := w.Write([]byte("Failed to create worker request")); err != nil {
				log.Printf("Failed to write error response: %v\n", err)
			}
			return
		}

		resp, err := client.Do(httpReq)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			if _, err := fmt.Fprintf(w, "Failed to communicate with worker: %v", err); err != nil {
				log.Printf("Failed to write error response: %v\n", err)
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
			log.Printf("Failed to write test output response: %v\n", err)
		}
	}
}
