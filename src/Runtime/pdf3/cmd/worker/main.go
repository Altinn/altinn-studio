package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"runtime"
	"strings"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/attribute"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
	"go.opentelemetry.io/otel/trace"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/config"
	"altinn.studio/pdf3/internal/generator"
	ihttp "altinn.studio/pdf3/internal/http"
	"altinn.studio/pdf3/internal/log"
	iruntime "altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/telemetry"
	"altinn.studio/pdf3/internal/telemetry/attr"
	"altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/internal/types"
)

var (
	workerId string
	workerIP string
)

var errNoNonLoopbackIPv4 = errors.New("no non-loopback IPv4 address found")

//nolint:funlen,gocognit,gocyclo,nestif // The worker entrypoint still owns startup, probes, generator wiring, and shutdown.
func main() {
	baseLogger := log.NewComponent("worker")

	baseLogger.Info("Starting", attr.GoMaxProcs, runtime.GOMAXPROCS(0), attr.NumCPU, runtime.NumCPU())

	cfg := config.ReadConfig()
	otelSignals := config.ResolveOTelSignals(cfg.Environment)
	telemetryEnabled := otelSignals.Any()
	otelShutdown := func(context.Context) error { return nil }
	if telemetryEnabled {
		configuredShutdown, err := telemetry.ConfigureOTel(context.Background(), cfg.Environment, otelSignals)
		if err != nil {
			baseLogger.Error("Failed to initialize telemetry", attr.Error, err)
			os.Exit(1)
		}
		otelShutdown = configuredShutdown
	} else {
		baseLogger.Info(
			"Telemetry exporter disabled for localtest",
			attr.DeploymentEnvironmentName, cfg.Environment,
			attr.ConfigEnableWith, "OTEL_EXPORTER_OTLP_ENDPOINT or OTEL_EXPORTER_OTLP_{TRACES,METRICS,LOGS}_ENDPOINT",
		)
	}

	if cfg.Environment == config.EnvironmentLocaltest && cfg.LocaltestPublicBaseURL != "" {
		if _, err := parseCanonicalLocaltestBaseURL(cfg.LocaltestPublicBaseURL); err != nil {
			baseLogger.Error(
				"Invalid localtest public base URL",
				attr.Error, err,
				attr.ConfigEnvVar, config.LocaltestPublicBaseURLEnv,
				attr.ConfigValue, cfg.LocaltestPublicBaseURL,
			)
			os.Exit(1)
		}
	}
	hostParams := config.ResolveHostParametersForEnvironment(cfg.Environment)

	host := iruntime.NewHost(
		hostParams.ReadinessDrainDelay,
		hostParams.ShutdownPeriod,
		hostParams.ShutdownHardPeriod,
	)
	defer host.Stop()

	hostname, err := os.Hostname()
	assert.That(err == nil, "Could not read hostname", attr.Error, err)

	workerId = hostname

	workerIP, err = discoverLocalIP()
	assert.That(err == nil, "Failed to discover local IP", attr.Error, err)
	assert.That(workerIP != "", "Worker IP should be available", attr.WorkerID, workerId)

	// Create logger with worker context
	logger := baseLogger.With(attr.WorkerID, workerId, attr.WorkerIP, workerIP)

	gen, err := generator.New()
	assert.That(err == nil, "Failed to create PDF generator", attr.Error, err)
	defer func() {
		// Closing PDF generator during shutdown
		if closeErr := gen.Close(); closeErr != nil {
			logger.Error("Failed to close PDF generator", attr.Error, closeErr)
		}
	}()

	// Start HTTP server for both PDF generation and probes
	http.HandleFunc("/health/startup", func(w http.ResponseWriter, r *http.Request) {
		ihttp.WriteProbe(r.Context(), logger, w, !host.IsShuttingDown() && gen.IsReady())
	})
	http.HandleFunc("/health/ready", func(w http.ResponseWriter, r *http.Request) {
		ihttp.WriteProbe(r.Context(), logger, w, !host.IsShuttingDown() && gen.IsReady())
	})
	http.HandleFunc("/health/live", func(w http.ResponseWriter, r *http.Request) {
		ihttp.WriteText(r.Context(), logger, w, http.StatusOK, "OK")
	})

	// The localtest harness will run on all dev machines
	// We can avoid some overhead by just running the single container
	if cfg.Environment == config.EnvironmentLocaltest {
		http.Handle(
			"/pdf",
			telemetry.WrapHandler("POST /pdf", generateLocalPdfHandler(logger, gen, cfg.LocaltestPublicBaseURL)),
		)
	} else {
		http.Handle("/generate", telemetry.WrapHandler("POST /generate", generatePdfHandler(logger, gen)))
	}
	// Only register test output endpoint in test internals mode
	if iruntime.IsTestInternalsMode {
		http.HandleFunc("/testoutput/", getTestOutputHandler(logger))
	}

	httpServer := &http.Server{
		Addr:              ":5031",
		ReadHeaderTimeout: 5 * time.Second,
		BaseContext: func(_ net.Listener) context.Context {
			return host.ServerContext()
		},
	}

	go func() {
		logger.Info("Starting worker HTTP server", attr.ListenAddress, httpServer.Addr)
		if listenErr := httpServer.ListenAndServe(); listenErr != nil && !errors.Is(listenErr, http.ErrServerClosed) {
			logger.Error("HTTP server crashed", attr.Error, listenErr)
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

	if telemetryEnabled {
		logger.Info("Shutting down telemetry")
		telemetryShutdownTimeout := config.ResolveTelemetryShutdownTimeoutForEnvironment(cfg.Environment)
		if telemetryShutdownTimeout == 0 {
			logger.Info("Skipping graceful telemetry flush", attr.DeploymentEnvironmentName, cfg.Environment)
		} else {
			shutdownCtx, cancel := context.WithTimeout(context.Background(), telemetryShutdownTimeout)
			defer cancel()
			if err := otelShutdown(shutdownCtx); err != nil {
				logger.Warn("Failed to gracefully shut down telemetry", attr.Error, err)
			}
		}
	}

	logger.Info("Server shut down gracefully")
}

//nolint:funlen,gocognit // Localtest request normalization and response mapping are still easier to follow in one place.
func generateLocalPdfHandler(
	logger *slog.Logger,
	gen types.PdfGenerator,
	localtestPublicBaseURL string,
) http.HandlerFunc {
	assert.That(!iruntime.IsTestInternalsMode, "Localtest env should not run internals test mode")

	return func(w http.ResponseWriter, r *http.Request) {
		data := telemetry.NewRequestAttributes()
		r = r.WithContext(telemetry.WithRequestAttributes(r.Context(), data))
		span := trace.SpanFromContext(r.Context())
		setWorkerSpanAttrs(span)
		defer telemetry.SetOnSpan(span, data)

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
		defer func() {
			if closeErr := r.Body.Close(); closeErr != nil {
				logger.WarnContext(r.Context(), "Failed to close request body", attr.Error, closeErr)
			}
		}()

		var req types.PdfRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			ihttp.WriteProblemDetails(logger, w, r, http.StatusBadRequest, ihttp.ProblemDetails{
				Type:                 "https://tools.ietf.org/html/rfc7231#section-6.5.1",
				Title:                "Bad Request",
				Status:               http.StatusBadRequest,
				Detail:               fmt.Sprintf("Invalid JSON payload: %v", err),
				TraceRejectionReason: "invalid_json",
			})
			return
		}

		normalizedURL, rewriteReason, normalizeErr := normalizeLocaltestURL(req.URL, localtestPublicBaseURL)
		if normalizeErr != nil {
			logger.WarnContext(
				r.Context(),
				"Failed to normalize localtest request URL",
				attr.Error, normalizeErr,
				attr.RequestURL, telemetry.RedactURL(req.URL),
				attr.ConfigEnvVar, config.LocaltestPublicBaseURLEnv,
			)
		} else if rewriteReason != "" {
			logger.Info(
				"Rewrote localtest request URL",
				attr.LocaltestURLRewriteReason, rewriteReason,
				attr.LocaltestURLRewriteFrom, req.URL,
				attr.LocaltestURLRewriteTo, normalizedURL,
			)
			req.URL = normalizedURL
		}

		reqLogger := logger.With(attr.RequestURL, telemetry.RedactURL(req.URL))
		data.SetPdfRequest(req)

		if err := req.Validate(); err != nil {
			ihttp.WriteProblemDetails(reqLogger, w, r, http.StatusBadRequest, ihttp.ProblemDetails{
				Type:                 "https://tools.ietf.org/html/rfc7231#section-6.5.1",
				Title:                "Bad Request",
				Status:               http.StatusBadRequest,
				Detail:               fmt.Sprintf("Validation error: %v", err),
				TraceRejectionReason: "validation_error",
			})
			return
		}

		requestContext := r.Context()
		result, pdfErr := gen.Generate(requestContext, req)

		if pdfErr != nil {
			recordPDFError(r.Context(), reqLogger, span, pdfErr)
			errStr := pdfErr.Error()
			errorCode := http.StatusInternalServerError

			problemType := "https://tools.ietf.org/html/rfc7231#section-6.6.1"
			problemTitle := "Internal Server Error"
			if pdfErr.Is(types.ErrQueueFull) {
				problemType = "https://tools.ietf.org/html/rfc6585#section-4"
				problemTitle = "Too Many Requests"
				errorCode = http.StatusTooManyRequests
			}

			ihttp.WriteProblemDetails(reqLogger, w, r, errorCode, ihttp.ProblemDetails{
				Type:   problemType,
				Title:  problemTitle,
				Status: errorCode,
				Detail: errStr,
			})
			return
		}

		// Success - return PDF bytes
		w.Header().Set("Content-Type", "application/pdf")

		w.WriteHeader(http.StatusOK)
		if _, err := w.Write(result.Data); err != nil {
			reqLogger.ErrorContext(r.Context(), "Failed to write PDF response", attr.Error, err)
		}
	}
}

func normalizeLocaltestURL(requestURL, localtestBaseURL string) (string, string, error) {
	if localtestBaseURL == "" {
		return requestURL, "", nil
	}

	requestURI, err := url.Parse(requestURL)
	if err != nil {
		return requestURL, "", fmt.Errorf("parse request URL: %w", err)
	}

	if requestURI.Scheme == "" || requestURI.Host == "" {
		return requestURL, "", nil
	}

	canonicalBase, err := parseCanonicalLocaltestBaseURL(localtestBaseURL)
	if err != nil {
		return requestURL, "", err
	}

	if !strings.EqualFold(requestURI.Hostname(), canonicalBase.Hostname()) {
		return requestURL, "", nil
	}

	portMismatch := requestURI.Port() != canonicalBase.Port()
	schemeMismatch := !strings.EqualFold(requestURI.Scheme, canonicalBase.Scheme)
	if !portMismatch && !schemeMismatch {
		return requestURL, "", nil
	}

	rewritten := *requestURI
	rewritten.Scheme = canonicalBase.Scheme
	rewritten.Host = canonicalBase.Host

	reason := "scheme_mismatch"
	if portMismatch {
		if requestURI.Port() == "" {
			reason = "missing_port"
		} else {
			reason = "port_mismatch"
		}
		if schemeMismatch {
			reason += "_and_scheme_mismatch"
		}
	}

	return rewritten.String(), reason, nil
}

func parseCanonicalLocaltestBaseURL(localtestBaseURL string) (*url.URL, error) {
	canonicalBase, err := url.Parse(localtestBaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse %s: %w", config.LocaltestPublicBaseURLEnv, err)
	}
	if canonicalBase.Scheme == "" || canonicalBase.Host == "" {
		return nil, fmt.Errorf(
			"%w: %s=%q",
			errInvalidLocaltestPublicBaseURL,
			config.LocaltestPublicBaseURLEnv,
			localtestBaseURL,
		)
	}
	return canonicalBase, nil
}

var errInvalidLocaltestPublicBaseURL = errors.New("invalid localtest public base URL")

//nolint:gocognit // This handler keeps telemetry bookkeeping and response mapping in one flow.
func generatePdfHandler(logger *slog.Logger, gen types.PdfGenerator) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Worker-Id", workerId)
		w.Header().Set("X-Worker-Ip", workerIP)

		data := telemetry.NewRequestAttributes()
		r = r.WithContext(telemetry.WithRequestAttributes(r.Context(), data))
		span := trace.SpanFromContext(r.Context())
		setWorkerSpanAttrs(span)
		defer telemetry.SetOnSpan(span, data)

		if r.Method != http.MethodPost {
			data.SetRejection("method_not_allowed")
			ihttp.WriteText(r.Context(), logger, w, http.StatusMethodNotAllowed, "Only POST method is allowed")
			return
		}

		ct := strings.ToLower(r.Header.Get("Content-Type"))
		if !strings.HasPrefix(ct, "application/json") {
			data.SetRejection("unsupported_media_type")
			ihttp.WriteText(
				r.Context(),
				logger,
				w,
				http.StatusUnsupportedMediaType,
				"Content-Type must be application/json",
			)
			return
		}
		if !iruntime.IsTestInternalsMode && r.Header.Get(testing.TestInputHeaderName) != "" {
			data.SetRejection("illegal_test_header")
			ihttp.WriteText(r.Context(), logger, w, http.StatusBadRequest, "Illegal internals test mode header")
			return
		}

		defer func() {
			if closeErr := r.Body.Close(); closeErr != nil {
				logger.WarnContext(r.Context(), "Failed to close request body", attr.Error, closeErr)
			}
		}()

		var req types.PdfRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			data.SetRejection("invalid_json")
			ihttp.WriteText(r.Context(), logger, w, http.StatusBadRequest, fmt.Sprintf("Invalid JSON payload: %v", err))
			return
		}

		reqLogger := logger.With(attr.RequestURL, telemetry.RedactURL(req.URL))
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
			recordPDFError(r.Context(), reqLogger, span, pdfErr)
			errStr := pdfErr.Error()
			errorCode := http.StatusInternalServerError

			// Map specific errors to HTTP status codes
			if pdfErr.Is(types.ErrQueueFull) {
				errorCode = http.StatusTooManyRequests
			}

			ihttp.WriteText(r.Context(), reqLogger, w, errorCode, errStr)
			return
		}

		// Success - return PDF bytes
		w.Header().Set("Content-Type", "application/pdf")

		w.WriteHeader(http.StatusOK)
		if _, err := w.Write(result.Data); err != nil {
			reqLogger.ErrorContext(r.Context(), "Failed to write PDF response", attr.Error, err)
		}
	}
}

// discoverLocalIP finds the first non-loopback IPv4 address on this host.
// This works in both Kubernetes and regular containers.
func discoverLocalIP() (string, error) {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "", fmt.Errorf("list interface addresses: %w", err)
	}

	for _, addr := range addrs {
		if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
			if ipNet.IP.To4() != nil {
				return ipNet.IP.String(), nil
			}
		}
	}

	return "", errNoNonLoopbackIPv4
}

func getTestOutputHandler(logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		assert.That(
			iruntime.IsTestInternalsMode,
			"Test output handler should only be registered in test internals mode",
		)

		if r.Method != http.MethodGet {
			ihttp.WriteText(r.Context(), logger, w, http.StatusMethodNotAllowed, "Only GET method is allowed")
			return
		}

		// Extract ID from URL path: /testoutput/{id}
		path := strings.TrimPrefix(r.URL.Path, "/testoutput/")
		if path == "" || path == r.URL.Path {
			ihttp.WriteText(r.Context(), logger, w, http.StatusBadRequest, "Missing test output ID")
			return
		}

		// Get test output from store
		output, found := testing.GetTestOutput(path)
		if !found {
			ihttp.WriteText(r.Context(), logger, w, http.StatusNotFound, "Test output not found")
			return
		}

		// Wait for all snapshots to be collected
		if !output.WaitForComplete(30 * time.Second) {
			ihttp.WriteText(
				r.Context(),
				logger,
				w,
				http.StatusRequestTimeout,
				"Timeout waiting for test output to complete",
			)
			return
		}

		// Return test output as JSON
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		jsonData, err := json.Marshal(output)
		if err != nil {
			logger.Error("Failed to marshal test output", attr.Error, err)
			ihttp.WriteText(r.Context(), logger, w, http.StatusInternalServerError, "Failed to serialize test output")
			return
		}

		if _, err := w.Write(jsonData); err != nil {
			logger.Error("Failed to write test output response", attr.Error, err)
		}
	}
}

func setWorkerSpanAttrs(span trace.Span) {
	if !span.IsRecording() {
		return
	}
	span.SetAttributes(
		attribute.String(attr.WorkerID, workerId),
		attribute.String(attr.WorkerIP, workerIP),
	)
}

// recordPDFError records a failed generation on the request's entry span and, as error.type, on
// its HTTP server metrics, which otherwise only show a 500 whatever the reason. The error's
// details go in an error log correlated with the trace.
func recordPDFError(ctx context.Context, logger *slog.Logger, span trace.Span, pdfErr *types.PDFError) {
	if pdfErr == nil {
		return
	}
	// Queue-full 429s are expected; proxy retries handle them. Like other 4xx they are not
	// server errors, so they get no error.type; the status code tells them apart.
	if pdfErr.Is(types.ErrQueueFull) {
		return
	}
	errorType := pdfErr.ErrorType()
	labeler, _ := otelhttp.LabelerFromContext(ctx)
	labeler.Add(semconv.ErrorTypeKey.String(errorType))
	telemetry.SetError(span, errorType, pdfErr)
	logger.ErrorContext(ctx, "PDF generation failed", attr.ErrorType, errorType, attr.Error, pdfErr)
}
