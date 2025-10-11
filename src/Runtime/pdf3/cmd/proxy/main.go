package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"sync/atomic"
	"time"

	ilog "altinn.studio/pdf3/internal/log"
	pb "altinn.studio/pdf3/internal/proto"
	"altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/types"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	ilog.Setup()

	host := runtime.NewHost(
		5*time.Second,
		20*time.Second,
		3*time.Second,
	)
	defer host.Stop()

	// Setup the grpc client to the worker(s)
	// including a connectivity checker
	workerGRPCAddr := os.Getenv("WORKER_GRPC_ADDR")
	if workerGRPCAddr == "" {
		workerGRPCAddr = "localhost:5032"
	}
	// Insecure is fine as we always run this in an internal network with no
	// other access to the worker APIs other than proxy -> worker traffic
	// See network policy in infra/
	conn, err := grpc.NewClient(workerGRPCAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to connect to worker: %v", err)
	}
	defer conn.Close()
	client := pb.NewPdfWorkerClient(conn)
	connectivity := NewConnectivityChecker(client)

	// Setup HTTP server
	http.HandleFunc("/health/startup", func(w http.ResponseWriter, r *http.Request) {
		if host.IsShuttingDown() {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("Shutting down"))
		} else if connectivity.GetState() != WorkerConnectivityStateHealthy {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("No connectivity"))
		} else {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK"))
		}
	})
	http.HandleFunc("/health/ready", func(w http.ResponseWriter, r *http.Request) {
		if host.IsShuttingDown() {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("Shutting down"))
		} else if connectivity.GetState() != WorkerConnectivityStateHealthy {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("No connectivity"))
		} else {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK"))
		}
	})
	http.HandleFunc("/health/live", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	http.HandleFunc("/pdf", generatePdf(client))

	server := &http.Server{
		Addr: ":5030",
		BaseContext: func(_ net.Listener) context.Context {
			return host.ServerContext()
		},
	}

	go func() {
		log.Printf("Starting proxy HTTP server on %s, connecting to worker at %s\n", server.Addr, workerGRPCAddr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server crashed: %v", err)
		}
	}()

	host.WaitForShutdownSignal()
	host.WaitForReadinessDrain()

	log.Println("Shutting down HTTP server..")
	err = server.Shutdown(host.ServerContext())
	if err != nil {
		log.Println("Failed to wait for ongoing requests to finish, waiting for forced cancellation.")
		host.WaitForHardShutdown()
	} else {
		log.Println("Gracefully shut down HTTP server")
	}

	log.Println("Server shut down gracefully")
}

func generatePdf(client pb.PdfWorkerClient) func(http.ResponseWriter, *http.Request) {
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
		//   Max 20 retry attempts on 429 (queue full) errors,
		//   while waiting 100ms in between attempts
		const maxRetries = 20
		duration := time.Since(start)
		log.Printf("[%s, %d/%d, %05dms] generating PDF..\n", req.URL, 0, maxRetries, duration.Milliseconds())
		protoReq := internalToProtoRequest(req)
		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer cancel()
		var protoResp *pb.PdfResponse
		var err error
		attempt := 1
		for ; attempt <= maxRetries; attempt++ {
			// Call worker via gRPC
			protoResp, err = client.Generate(ctx, protoReq)
			if err != nil {
				writeProblemDetails(w, http.StatusInternalServerError, ProblemDetails{
					Type:   "https://tools.ietf.org/html/rfc7231#section-6.6.1",
					Title:  "Internal Server Error",
					Status: http.StatusInternalServerError,
					Detail: fmt.Sprintf("Failed to communicate with PDF worker: %v", err),
				})
				duration := time.Since(start)
				log.Printf("[%s, %d/%d, %05dms] error calling PDF worker: %v\n", req.URL, attempt, maxRetries, duration.Milliseconds(), err)
				return
			}

			// Check if generation was successful
			if protoResp.GetSuccess() {
				// Success - return PDF data
				w.Header().Set("Content-Type", "application/pdf")
				w.WriteHeader(http.StatusOK)
				w.Write(protoResp.GetData())
				duration := time.Since(start)
				log.Printf("[%s, %d/%d, %05dms] successfully generated PDF\n", req.URL, attempt, maxRetries, duration.Milliseconds())
				return
			}

			// Check if this is a retryable error (429 - queue full)
			errorCode := protoResp.GetErrorCode()
			if errorCode == http.StatusTooManyRequests && attempt < maxRetries {
				duration := time.Since(start)
				log.Printf("[%s, %d/%d, %05dms] worker queue full retrying...", req.URL, attempt, maxRetries, duration.Milliseconds())
				time.Sleep(100 * time.Millisecond)
				continue
			}

			// Non-retryable error or max retries reached
			break
		}

		// All retries exhausted or non-retryable error
		statusCode := int(protoResp.GetErrorCode())
		if statusCode == 0 {
			statusCode = http.StatusInternalServerError
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
			Detail: protoResp.GetError(),
		})
		duration = time.Since(start)
		log.Printf(
			"[%s, %d/%d, %05dms] error during generation. Code: %d, detail: %s",
			req.URL,
			attempt,
			maxRetries,
			duration.Milliseconds(),
			statusCode,
			protoResp.GetError(),
		)
	}
}

func internalToProtoRequest(req types.PdfRequest) *pb.PdfRequest {
	protoReq := &pb.PdfRequest{
		Url:                  &req.URL,
		SetJavaScriptEnabled: &req.SetJavaScriptEnabled,
	}

	// Convert options
	protoReq.Options = &pb.PdfOptions{
		HeaderTemplate:      &req.Options.HeaderTemplate,
		FooterTemplate:      &req.Options.FooterTemplate,
		DisplayHeaderFooter: &req.Options.DisplayHeaderFooter,
		PrintBackground:     &req.Options.PrintBackground,
		Format:              &req.Options.Format,
		Margin: &pb.PdfMargin{
			Top:    &req.Options.Margin.Top,
			Right:  &req.Options.Margin.Right,
			Bottom: &req.Options.Margin.Bottom,
			Left:   &req.Options.Margin.Left,
		},
	}

	// Convert waitFor
	if req.WaitFor != nil {
		protoReq.WaitFor = &pb.WaitFor{}

		if selector, ok := req.WaitFor.AsString(); ok {
			protoReq.WaitFor.WaitType = &pb.WaitFor_Selector{Selector: selector}
		} else if timeout, ok := req.WaitFor.AsTimeout(); ok {
			protoReq.WaitFor.WaitType = &pb.WaitFor_TimeoutMs{TimeoutMs: timeout}
		} else if opts, ok := req.WaitFor.AsOptions(); ok {
			protoReq.WaitFor.WaitType = &pb.WaitFor_Options{
				Options: &pb.WaitForOptions{
					Selector: &opts.Selector,
					Visible:  opts.Visible,
					Hidden:   opts.Hidden,
					Timeout:  opts.Timeout,
				},
			}
		}
	}

	// Convert cookies
	for _, c := range req.Cookies {
		cookie := &pb.Cookie{
			Name:     &c.Name,
			Value:    &c.Value,
			Domain:   &c.Domain,
			SameSite: &c.SameSite,
		}
		protoReq.Cookies = append(protoReq.Cookies, cookie)
	}

	return protoReq
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

func NewConnectivityChecker(client pb.PdfWorkerClient) *workerConnectivity {
	self := &workerConnectivity{
		state: atomic.Uint32{},
	}

	go func() {
		for {
			ctx, _ := context.WithDeadline(context.Background(), time.Now().Add(3*time.Second))
			response, err := client.Health(ctx, nil)
			gotValidResponse := err == nil && response != nil

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
		log.Printf("Warning: failed to encode error response: %v", err)
	}
}
