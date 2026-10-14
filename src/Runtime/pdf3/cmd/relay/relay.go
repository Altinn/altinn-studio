package main

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/propagation"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
	"go.opentelemetry.io/otel/trace"

	"altinn.studio/pdf3/internal/auth"
	ihttp "altinn.studio/pdf3/internal/http"
	"altinn.studio/pdf3/internal/serviceowner"
	"altinn.studio/pdf3/internal/telemetry"
	"altinn.studio/pdf3/internal/telemetry/attr"
)

const (
	// maxBodySize matches the proxy's limit for the JSON request.
	maxBodySize = 64 * 1024
	// upstreamTimeout is only a safety net, above the time apps wait today. The local proxy has no
	// overall deadline: each attempt at a worker has types.RequestTimeout, and it retries after any
	// failed attempt, a timed out one included. What ends a slow request is the app's HttpClient,
	// whose default timeout is 100 seconds, so the relay must not give up before that. An app that
	// gives up cancels the upstream request anyway.
	upstreamTimeout = 2 * time.Minute
	// maxAttempts bounds retries of requests that never reached the upstream.
	maxAttempts = 3
	retryDelay  = 250 * time.Millisecond
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

//nolint:funlen // Request validation and response mapping are easier to follow in one flow.
func (rl *relay) handlePdf(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	if r.Method != http.MethodPost {
		ihttp.WriteProblemDetails(rl.logger, w, r, http.StatusMethodNotAllowed, ihttp.ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.5",
			Title:  "Method Not Allowed",
			Status: http.StatusMethodNotAllowed,
			Detail: "Only POST method is allowed",
		})
		return
	}

	// A request the relay can't forward is answered as the local proxy answers it, checked in the
	// same order, so an app sees no difference.
	if !strings.HasPrefix(strings.ToLower(r.Header.Get("Content-Type")), "application/json") {
		ihttp.WriteProblemDetails(rl.logger, w, r, http.StatusUnsupportedMediaType, ihttp.ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.13",
			Title:  "Unsupported Media Type",
			Status: http.StatusUnsupportedMediaType,
			Detail: "Content-Type must be application/json",
		})
		return
	}
	if r.ContentLength > maxBodySize {
		ihttp.WriteProblemDetails(rl.logger, w, r, http.StatusRequestEntityTooLarge, ihttp.ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.11",
			Title:  "Request Entity Too Large",
			Status: http.StatusRequestEntityTooLarge,
			Detail: fmt.Sprintf("Request body too large (max %d bytes)", maxBodySize),
		})
		return
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
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), rl.timeout)
	defer cancel()

	resp, err := rl.send(ctx, body, r.Header.Get("Content-Type"))
	if err != nil {
		f := rl.classify(ctx, r)
		status := f.status()
		rl.logger.Log(
			ctx,
			f.level(),
			f.message("before the PDF service responded", "Failed to reach the PDF service"),
			attr.ElapsedMs, time.Since(start).Milliseconds(),
			attr.Error, err,
		)
		ihttp.WriteProblemDetails(rl.logger, w, r, status, ihttp.ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.6",
			Title:  http.StatusText(status),
			Status: status,
			Detail: fmt.Sprintf("Failed to reach the PDF service: %v", err),
		})
		return
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			rl.logger.WarnContext(ctx, "Failed to close upstream response body", attr.Error, closeErr)
		}
	}()

	switch {
	case resp.StatusCode >= http.StatusMultipleChoices && resp.StatusCode < http.StatusBadRequest,
		resp.StatusCode == http.StatusUnauthorized,
		resp.StatusCode == http.StatusForbidden:
		// A redirect isn't followed, and a rejected API key is the relay's to fix, not the app's,
		// so neither is passed on as it is.
		rl.logger.ErrorContext(
			ctx,
			"The PDF service did not accept the request",
			attr.HTTPResponseStatusCode, resp.StatusCode,
			attr.ElapsedMs, time.Since(start).Milliseconds(),
		)
		ihttp.WriteProblemDetails(rl.logger, w, r, http.StatusBadGateway, ihttp.ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.6.3",
			Title:  "Bad Gateway",
			Status: http.StatusBadGateway,
			Detail: fmt.Sprintf("The PDF service did not accept the request: %d", resp.StatusCode),
		})
		return
	case resp.StatusCode >= http.StatusInternalServerError:
		rl.logger.WarnContext(
			ctx,
			"The PDF service returned an error",
			attr.HTTPResponseStatusCode, resp.StatusCode,
			attr.ElapsedMs, time.Since(start).Milliseconds(),
		)
	}

	if contentType := resp.Header.Get("Content-Type"); contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}
	if resp.ContentLength >= 0 {
		w.Header().Set("Content-Length", strconv.FormatInt(resp.ContentLength, 10))
	}
	w.WriteHeader(resp.StatusCode)
	if _, err := io.Copy(w, resp.Body); err != nil {
		f := rl.classify(ctx, r)
		rl.logger.Log(
			ctx,
			f.level(),
			f.message("while the PDF service response was copied", "Failed to copy the PDF service response"),
			attr.ElapsedMs, time.Since(start).Milliseconds(),
			attr.Error, err,
		)
		// otelhttp neither sees the status nor ends the span with an error when the handler panics,
		// so both are recorded here.
		span := trace.SpanFromContext(ctx)
		span.SetAttributes(semconv.HTTPResponseStatusCode(resp.StatusCode))
		telemetry.SetError(span, f.errorType(), err)
		// The status is sent, so abort the response whatever the reason: the app must see a failed
		// request, not a truncated PDF. If the app is gone, it is harmless.
		panic(http.ErrAbortHandler)
	}
}

// failure is why the relay failed to pass on the PDF service's response.
type failure int

const (
	// failureUpstream is a failed request to the PDF service or a broken response from it.
	failureUpstream failure = iota
	// failureTimeout is the relay's own timeout, which an app should never reach.
	failureTimeout
	// failureClientGone is an app that disconnected, which is not the relay's error.
	failureClientGone
	// failureShutdown is the relay shutting down before the request finished.
	failureShutdown
)

// classify tells why the request r failed, where ctx is its upstream request's context.
func (rl *relay) classify(ctx context.Context, r *http.Request) failure {
	switch {
	// Shutting down cancels the request's context too, so it is checked first.
	case rl.shuttingDown():
		return failureShutdown
	case r.Context().Err() != nil:
		return failureClientGone
	case errors.Is(ctx.Err(), context.DeadlineExceeded):
		return failureTimeout
	default:
		return failureUpstream
	}
}

func (f failure) level() slog.Level {
	switch f {
	case failureClientGone:
		return slog.LevelInfo
	case failureShutdown:
		return slog.LevelWarn
	case failureUpstream, failureTimeout:
		return slog.LevelError
	}
	return slog.LevelError
}

// status is the status to answer with when the request failed before the PDF service responded.
func (f failure) status() int {
	switch f {
	case failureShutdown:
		return http.StatusServiceUnavailable
	case failureTimeout:
		return http.StatusGatewayTimeout
	case failureClientGone, failureUpstream:
		return http.StatusBadGateway
	}
	return http.StatusBadGateway
}

// message is the log message for f, where when is the point the request failed at and
// upstreamMessage the message for a failure of the PDF service or the relay's timeout.
func (f failure) message(when string, upstreamMessage string) string {
	switch f {
	case failureClientGone:
		return "The client gave up " + when
	case failureShutdown:
		return "The relay shut down " + when
	case failureUpstream, failureTimeout:
		return upstreamMessage
	}
	return upstreamMessage
}

// errorType is f's error.type on the request's span.
func (f failure) errorType() string {
	switch f {
	case failureClientGone:
		return "client_dropped"
	case failureShutdown:
		return "shutting_down"
	case failureTimeout:
		return "timeout"
	case failureUpstream:
		return "upstream_response_failed"
	}
	return "_OTHER"
}

// send posts the request upstream. Only requests that failed to connect are retried:
// the shared pdf3 already retries busy workers, and anything else may have been processed.
func (rl *relay) send(ctx context.Context, body []byte, contentType string) (*http.Response, error) {
	for attempt := 1; ; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, rl.upstream, bytes.NewReader(body))
		if err != nil {
			return nil, fmt.Errorf("create upstream request: %w", err)
		}
		req.Header.Set("Content-Type", contentType)
		req.Header.Set("Authorization", "Bearer "+rl.keys.First())
		req.Header.Set(serviceowner.Header, rl.serviceOwner)

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
