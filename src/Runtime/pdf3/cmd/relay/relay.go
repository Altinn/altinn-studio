package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/propagation"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
	"go.opentelemetry.io/otel/trace"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/auth"
	ihttp "altinn.studio/pdf3/internal/http"
	iruntime "altinn.studio/pdf3/internal/runtime"
	"altinn.studio/pdf3/internal/serviceowner"
	"altinn.studio/pdf3/internal/telemetry"
	"altinn.studio/pdf3/internal/telemetry/attr"
	"altinn.studio/pdf3/internal/testing"
)

const (
	// maxBodySize matches the proxy's limit for the JSON request.
	maxBodySize = 64 * 1024
	// maxErrorBodySize bounds the upstream error body the relay reads to tell whether pdf3 sent it.
	maxErrorBodySize = 1024 * 1024
	// upstreamTimeout is only a safety net, above the time apps wait today. The local proxy has no
	// overall deadline: each attempt at a worker has types.RequestTimeout, and it retries after any
	// failed attempt, a timed out one included. What ends a slow request is the app's HttpClient,
	// whose default timeout is 100 seconds, so the relay must not give up before that. An app that
	// gives up cancels the upstream request anyway.
	upstreamTimeout = 2 * time.Minute
	// maxAttempts bounds retries of requests that never reached the upstream.
	maxAttempts = 3
	retryDelay  = 250 * time.Millisecond
	// idempotencyKeyHeader marks a POST as safe to send again, which lets Go's transport retry a
	// request that failed on a reused connection the upstream had closed. A PDF request has no
	// side effects, so generating it twice only costs time.
	idempotencyKeyHeader = "Idempotency-Key"
)

// relay forwards PDF requests from apps in a tenant cluster to the shared pdf3,
// adding the API key the shared pdf3 requires and the cluster's service owner.
type relay struct {
	logger *slog.Logger
	keys   *auth.KeyFile
	client *http.Client
	// shuttingDown tells whether the relay is shutting down, which also cancels its requests.
	shuttingDown func() bool
	upstream     string
	serviceOwner string
	timeout      time.Duration
}

func newRelay(
	logger *slog.Logger,
	upstream string,
	keys *auth.KeyFile,
	serviceOwner string,
	shuttingDown func() bool,
) *relay {
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   5 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		TLSHandshakeTimeout: 5 * time.Second,
		ForceAttemptHTTP2:   true,
		MaxIdleConns:        64,
		MaxIdleConnsPerHost: 64,
		IdleConnTimeout:     90 * time.Second,
	}
	return &relay{
		logger: logger,
		keys:   keys,
		client: &http.Client{
			// otelhttp injects the trace context, so the shared pdf3's spans join the app's trace. Only
			// the trace context: baggage is not sent over the internet to the shared pdf3.
			Transport: otelhttp.NewTransport(transport, otelhttp.WithPropagators(propagation.TraceContext{})),
			// A redirect is not followed, so the API key is only ever sent to the upstream.
			CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
		},
		upstream:     upstream,
		serviceOwner: serviceOwner,
		timeout:      upstreamTimeout,
		shuttingDown: shuttingDown,
	}
}

// abortKey is the request context key of the flag handlePdf's caller sets to abort the response.
type abortKey struct{}

// handler serves the relay's PDF endpoint with the telemetry middleware. A response that fails
// after its status is sent is aborted outside the middleware, which records a request only when
// its handler returns, so an aborted request is in the metrics too.
func (rl *relay) handler() http.Handler {
	instrumented := telemetry.WrapHandler("POST /pdf", func(w http.ResponseWriter, r *http.Request) {
		if rl.handlePdf(w, r) {
			abort, ok := r.Context().Value(abortKey{}).(*bool)
			assert.That(ok, "The PDF handler must be served by relay.handler")
			*abort = true
		}
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		abort := false
		instrumented.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), abortKey{}, &abort)))
		if abort {
			// The app must see a failed request, not a truncated PDF. If the app is gone, it is
			// harmless.
			panic(http.ErrAbortHandler)
		}
	})
}

// handlePdf forwards an app's request to the PDF service and answers with its response. It returns
// whether the response must be aborted, because it failed after its status was sent.
//
//nolint:funlen // Request validation and response mapping are easier to follow in one flow.
func (rl *relay) handlePdf(w http.ResponseWriter, r *http.Request) bool {
	start := time.Now()
	if r.Method != http.MethodPost {
		ihttp.WriteProblemDetails(rl.logger, w, r, http.StatusMethodNotAllowed, ihttp.ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.5",
			Title:  "Method Not Allowed",
			Status: http.StatusMethodNotAllowed,
			Detail: "Only POST method is allowed",
		})
		return false
	}

	// The relay answers what the local proxy checks before it reads the body as the local proxy
	// does, in the same order. The shared proxy checks the rest, the JSON and the request in it, and
	// its answers are passed on.
	if !strings.HasPrefix(strings.ToLower(r.Header.Get("Content-Type")), "application/json") {
		ihttp.WriteProblemDetails(rl.logger, w, r, http.StatusUnsupportedMediaType, ihttp.ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.13",
			Title:  "Unsupported Media Type",
			Status: http.StatusUnsupportedMediaType,
			Detail: "Content-Type must be application/json",
		})
		return false
	}
	if r.ContentLength > maxBodySize {
		ihttp.WriteProblemDetails(rl.logger, w, r, http.StatusRequestEntityTooLarge, ihttp.ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.11",
			Title:  "Request Entity Too Large",
			Status: http.StatusRequestEntityTooLarge,
			Detail: fmt.Sprintf("Request body too large (max %d bytes)", maxBodySize),
		})
		return false
	}
	if !iruntime.IsTestInternalsMode && r.Header.Get(testing.TestInputHeaderName) != "" {
		ihttp.WriteProblemDetails(rl.logger, w, r, http.StatusBadRequest, ihttp.ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.1",
			Title:  "Bad Request",
			Status: http.StatusBadRequest,
			Detail: "Illegal test internals mode header",
		})
		return false
	}

	// The body is buffered so a request that never reached the upstream can be sent again. The
	// proxy fails to decode a body without a Content-Length that goes past the limit, so it is a
	// 400 here too.
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBodySize))
	if err != nil {
		ihttp.WriteProblemDetails(rl.logger, w, r, http.StatusBadRequest, ihttp.ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.1",
			Title:  "Bad Request",
			Status: http.StatusBadRequest,
			Detail: fmt.Sprintf("Invalid JSON payload: %v", err),
		})
		return false
	}

	ctx, cancel := context.WithTimeout(r.Context(), rl.timeout)
	defer cancel()

	resp, err := rl.send(ctx, body, r.Header.Get("Content-Type"))
	if err != nil {
		f := rl.classify(ctx, r, "before the PDF service responded", "Failed to reach the PDF service")
		rl.logger.Log(ctx, f.level, f.message, attr.ElapsedMs, time.Since(start).Milliseconds(), attr.Error, err)
		ihttp.WriteProblemDetails(rl.logger, w, r, f.status, ihttp.ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.6",
			Title:  http.StatusText(f.status),
			Status: f.status,
			Detail: fmt.Sprintf("Failed to reach the PDF service: %v", err),
		})
		return false
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			rl.logger.WarnContext(ctx, "Failed to close upstream response body", attr.Error, closeErr)
		}
	}()

	if resp.StatusCode != http.StatusOK || mediaType(resp) != "application/pdf" {
		rl.answerError(ctx, w, r, resp, start)
		return false
	}

	w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
	if resp.ContentLength >= 0 {
		w.Header().Set("Content-Length", strconv.FormatInt(resp.ContentLength, 10))
	}
	w.WriteHeader(http.StatusOK)
	if _, err := io.Copy(w, resp.Body); err != nil {
		f := rl.classify(
			ctx,
			r,
			"while the PDF service response was copied",
			"Failed to copy the PDF service response",
		)
		rl.logger.Log(ctx, f.level, f.message, attr.ElapsedMs, time.Since(start).Milliseconds(), attr.Error, err)
		// The status is sent, so the middleware records a success unless told otherwise.
		labeler, _ := otelhttp.LabelerFromContext(ctx)
		labeler.Add(semconv.ErrorTypeKey.String(f.errorType))
		telemetry.SetError(trace.SpanFromContext(ctx), f.errorType, err)
		return true
	}
	return false
}

// answerError answers with what the upstream's response resp, which is not a PDF, means for the app.
//
// Only an error pdf3 itself answered, a 4xx or 5xx problem details body with that status, is passed
// on as it is: the local path answers the same. A rejected API key (401 or 403) is the relay's to
// fix, not the app's, so it is a 502. Any other answer is from something between the relay and
// pdf3, such as DIS Edge, and its body is replaced with the relay's own. A 429 or 5xx keeps its
// status, since busy or broken is what it means on the local path too, and an app retries it as
// it would there. Anything else, such as a redirect, a 200 that isn't a PDF, or a 404 or 413
// from DIS Edge, is a 502, so an app never sees a status the local path couldn't give it.
func (rl *relay) answerError(
	ctx context.Context,
	w http.ResponseWriter,
	r *http.Request,
	resp *http.Response,
	start time.Time,
) {
	if body, ok := readPDF3Error(resp); ok &&
		resp.StatusCode != http.StatusUnauthorized && resp.StatusCode != http.StatusForbidden {
		if resp.StatusCode >= http.StatusInternalServerError {
			rl.logger.WarnContext(
				ctx,
				"The PDF service returned an error",
				attr.HTTPResponseStatusCode, resp.StatusCode,
				attr.ElapsedMs, time.Since(start).Milliseconds(),
			)
		}
		w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
		w.Header().Set("Content-Length", strconv.Itoa(len(body)))
		w.WriteHeader(resp.StatusCode)
		if _, err := w.Write(body); err != nil {
			rl.logger.InfoContext(ctx, "Failed to pass on the PDF service's error", attr.Error, err)
		}
		return
	}

	status := http.StatusBadGateway
	problemType := "https://tools.ietf.org/html/rfc7231#section-6.6.3"
	switch {
	case resp.StatusCode == http.StatusTooManyRequests:
		status = resp.StatusCode
		problemType = "https://tools.ietf.org/html/rfc6585#section-4"
	case resp.StatusCode >= http.StatusInternalServerError && resp.StatusCode <= 599:
		status = resp.StatusCode
		problemType = "https://tools.ietf.org/html/rfc7231#section-6.6"
	}
	rl.logger.ErrorContext(
		ctx,
		"Unexpected response from the PDF service",
		attr.HTTPResponseStatusCode, resp.StatusCode,
		attr.HTTPResponseContentType, resp.Header.Get("Content-Type"),
		attr.ElapsedMs, time.Since(start).Milliseconds(),
	)
	ihttp.WriteProblemDetails(rl.logger, w, r, status, ihttp.ProblemDetails{
		Type:   problemType,
		Title:  http.StatusText(status),
		Status: status,
		Detail: fmt.Sprintf("Unexpected response from the PDF service: %d", resp.StatusCode),
	})
}

// readPDF3Error reads resp's body and reports whether it is an error pdf3 answered: a 4xx or 5xx
// with problem details, whose status is the response's, as the proxy writes them.
func readPDF3Error(resp *http.Response) ([]byte, bool) {
	if resp.StatusCode < http.StatusBadRequest || resp.StatusCode > 599 || mediaType(resp) != "application/json" {
		return nil, false
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxErrorBodySize+1))
	if err != nil || len(body) > maxErrorBodySize {
		return nil, false
	}
	var problem ihttp.ProblemDetails
	if err := json.Unmarshal(body, &problem); err != nil || problem.Status != resp.StatusCode {
		return nil, false
	}
	return body, true
}

// mediaType returns resp's media type without parameters, or "" if it has none or it is invalid.
func mediaType(resp *http.Response) string {
	mediaType, _, err := mime.ParseMediaType(resp.Header.Get("Content-Type"))
	if err != nil {
		return ""
	}
	return mediaType
}

// failure is why the relay failed to pass on the PDF service's response, and how that is reported.
type failure struct {
	message   string
	errorType string
	level     slog.Level
	// status is the status to answer with if none was sent yet.
	status int
}

// classify tells why the request r failed, where ctx is its upstream request's context, when is the
// point it failed at and upstreamMessage the message for a failure of the PDF service or the
// relay's own timeout.
func (rl *relay) classify(ctx context.Context, r *http.Request, when string, upstreamMessage string) failure {
	switch {
	// Shutting down cancels the request's context too, so it is checked first.
	case rl.shuttingDown():
		return failure{
			level:     slog.LevelWarn,
			status:    http.StatusServiceUnavailable,
			errorType: "shutting_down",
			message:   "The relay shut down " + when,
		}
	// An app that disconnected is not the relay's error.
	case r.Context().Err() != nil:
		return failure{
			level:     slog.LevelInfo,
			status:    http.StatusBadGateway,
			errorType: "client_dropped",
			message:   "The client gave up " + when,
		}
	// The relay's own timeout, which an app should never reach.
	case errors.Is(ctx.Err(), context.DeadlineExceeded):
		return failure{
			level:     slog.LevelError,
			status:    http.StatusGatewayTimeout,
			errorType: "timeout",
			message:   upstreamMessage,
		}
	default:
		return failure{
			level:     slog.LevelError,
			status:    http.StatusBadGateway,
			errorType: "upstream_response_failed",
			message:   upstreamMessage,
		}
	}
}

// send posts the request upstream. Only requests that failed to connect are retried:
// the shared pdf3 already retries busy workers, and anything else may have been processed.
func (rl *relay) send(ctx context.Context, body []byte, contentType string) (*http.Response, error) {
	// One key for the app's request, so every attempt at it is the same request.
	idempotencyKey := rand.Text()
	for attempt := 1; ; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, rl.upstream, bytes.NewReader(body))
		if err != nil {
			return nil, fmt.Errorf("create upstream request: %w", err)
		}
		req.Header.Set("Content-Type", contentType)
		req.Header.Set("Authorization", "Bearer "+rl.keys.First())
		req.Header.Set(serviceowner.Header, rl.serviceOwner)
		req.Header.Set(idempotencyKeyHeader, idempotencyKey)

		resp, err := rl.client.Do(req)
		if err == nil {
			return resp, nil
		}
		if attempt == maxAttempts || !isConnectError(err) || ctx.Err() != nil {
			return nil, fmt.Errorf("upstream request: %w", err)
		}
		// Retries are logged at INFO, so they are not exported; running out of them is an error.
		rl.logger.InfoContext(
			ctx,
			"Failed to connect to the PDF service, retrying",
			attr.Attempt, attempt,
			attr.Error, err,
		)
		select {
		case <-time.After(retryDelay):
		case <-ctx.Done():
			return nil, fmt.Errorf("upstream request: %w", ctx.Err())
		}
	}
}

func isConnectError(err error) bool {
	var opErr *net.OpError
	return errors.As(err, &opErr) && opErr.Op == "dial"
}
