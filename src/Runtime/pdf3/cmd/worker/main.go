package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"time"

	"altinn.studio/pdf3/internal/generator"
	ilog "altinn.studio/pdf3/internal/log"
	pb "altinn.studio/pdf3/internal/proto"
	"altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/types"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/emptypb"
)

var workerId string

func main() {
	ilog.Setup()

	host := runtime.NewHost(
		5*time.Second,
		20*time.Second,
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
	defer gen.Close()

	// Start gRPC server
	grpcServer := grpc.NewServer()
	grpcReady := make(chan struct{})
	go func() {
		lis, err := net.Listen("tcp", ":5032")
		if err != nil {
			log.Fatalf("Failed to listen on :5032: %v", err)
		}

		pb.RegisterPdfWorkerServer(grpcServer, &pdfWorkerServer{gen: gen})

		fmt.Println("gRPC server listening on :5032")
		close(grpcReady)

		if err := grpcServer.Serve(lis); err != nil && err != grpc.ErrServerStopped {
			log.Fatalf("gRPC server crashed: %v", err)
		}
	}()

	// Wait for gRPC server to be ready
	<-grpcReady
	fmt.Println("gRPC server started successfully")

	// Start HTTP server for probes
	http.HandleFunc("/health/startup", func(w http.ResponseWriter, r *http.Request) {
		if host.IsShuttingDown() {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("Shutting down"))
		} else {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK"))
		}
	})
	http.HandleFunc("/health/ready", func(w http.ResponseWriter, r *http.Request) {
		if host.IsShuttingDown() {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("Shutting down"))
		} else {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK"))
		}
	})
	http.HandleFunc("/health/live", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

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

	grpcStopped := make(chan struct{})
	httpStopped := make(chan error)
	go func() {
		log.Println("Shutting down gRPC server..")
		// GracefulStop blocks while trying to gracefully shut down
		// It doesn't support a timeout or context input unfortunately
		grpcServer.GracefulStop()
		log.Println("Gracefully shut down gRPC server")
		close(grpcStopped)
	}()
	go func() {
		log.Println("Shutting down HTTP server..")
		err := httpServer.Shutdown(host.ServerContext())
		if err == nil {
			log.Println("Gracefully shut down HTTP server")
		}
		httpStopped <- err
	}()
	// As the HTTP stack has better support for context/timeout inputs to its' graceful shutdown
	// we wait for the http server first
	httpServerError := <-httpStopped
	if httpServerError != nil {
		log.Println("Failed to wait for ongoing requests to finish, waiting for forced cancellation.")
		host.WaitForHardShutdown()
	}
	// Wait for either
	// * grpcServer to gracefully shut down
	// * shutdownPeriod to expire (ServerContext expires after shutdownPeriod)
	select {
	case <-grpcStopped:
		break
	case <-host.ServerContext().Done():
		// Forcefully close if timeout expired
		grpcServer.Stop()
		break
	}

	log.Println("Server shut down gracefully")
}

type pdfWorkerServer struct {
	pb.UnimplementedPdfWorkerServer
	gen types.PdfGenerator
}

func (s *pdfWorkerServer) Health(context.Context, *emptypb.Empty) (*pb.HealthResponse, error) {
	message := "OK"
	return &pb.HealthResponse{
		Message: &message,
	}, nil
}

func (s *pdfWorkerServer) Generate(ctx context.Context, req *pb.PdfRequest) (*pb.PdfResponse, error) {
	// Convert protobuf request to internal types
	internalReq := protoToInternalRequest(req)

	result, pdfErr := s.gen.Generate(ctx, internalReq)
	success := false
	if pdfErr != nil {
		errStr := pdfErr.Error()
		errorCode := int32(http.StatusInternalServerError)

		// Map specific errors to HTTP status codes
		if pdfErr.Is(types.ErrQueueFull) {
			errorCode = int32(http.StatusTooManyRequests)
		}

		return &pb.PdfResponse{
			Success:   &success,
			Error:     &errStr,
			ErrorCode: &errorCode,
			WorkerId:  &workerId,
		}, nil
	}

	success = true
	return &pb.PdfResponse{
		Success:  &success,
		Data:     result.Data,
		WorkerId: &workerId,
	}, nil
}

func protoToInternalRequest(req *pb.PdfRequest) types.PdfRequest {
	internal := types.PdfRequest{
		URL:                  req.GetUrl(),
		SetJavaScriptEnabled: req.GetSetJavaScriptEnabled(),
	}

	// Convert options
	if opts := req.GetOptions(); opts != nil {
		internal.Options = types.PdfOptions{
			HeaderTemplate:      opts.GetHeaderTemplate(),
			FooterTemplate:      opts.GetFooterTemplate(),
			DisplayHeaderFooter: opts.GetDisplayHeaderFooter(),
			PrintBackground:     opts.GetPrintBackground(),
			Format:              opts.GetFormat(),
		}
		if margin := opts.GetMargin(); margin != nil {
			internal.Options.Margin = types.PdfMargin{
				Top:    margin.GetTop(),
				Right:  margin.GetRight(),
				Bottom: margin.GetBottom(),
				Left:   margin.GetLeft(),
			}
		}
	}

	// Convert waitFor
	if waitFor := req.GetWaitFor(); waitFor != nil {
		switch wt := waitFor.GetWaitType().(type) {
		case *pb.WaitFor_Selector:
			internal.WaitFor = types.NewWaitForString(wt.Selector)
		case *pb.WaitFor_TimeoutMs:
			internal.WaitFor = types.NewWaitForTimeout(wt.TimeoutMs)
		case *pb.WaitFor_Options:
			if opts := wt.Options; opts != nil {
				waitForOpts := types.WaitForOptions{
					Selector: opts.GetSelector(),
				}
				if opts.Visible != nil {
					visible := opts.GetVisible()
					waitForOpts.Visible = &visible
				}
				if opts.Hidden != nil {
					hidden := opts.GetHidden()
					waitForOpts.Hidden = &hidden
				}
				if opts.Timeout != nil {
					timeout := opts.GetTimeout()
					waitForOpts.Timeout = &timeout
				}
				internal.WaitFor = types.NewWaitForOptions(waitForOpts)
			}
		}
	}

	// Convert cookies
	for _, c := range req.GetCookies() {
		internal.Cookies = append(internal.Cookies, types.Cookie{
			Name:     c.GetName(),
			Value:    c.GetValue(),
			Domain:   c.GetDomain(),
			SameSite: c.GetSameSite(),
		})
	}

	return internal
}
