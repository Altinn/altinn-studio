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
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"

	"altinn.studio/pdf3/internal/auth"
	ihttp "altinn.studio/pdf3/internal/http"
	"altinn.studio/pdf3/internal/serviceowner"
	"altinn.studio/pdf3/internal/telemetry/attr"
	"altinn.studio/pdf3/internal/types"
)

const (
	// maxBodySize matches the proxy's limit for the JSON request.
	maxBodySize = 64 * 1024
	// upstreamTimeoutMargin is added to the shared proxy's request timeout to cover the network hop.
	upstreamTimeoutMargin = 5 * time.Second
	// maxAttempts bounds retries of requests that never reached the upstream.
	maxAttempts = 3
	retryDelay  = 250 * time.Millisecond
)

// relay forwards PDF requests from apps in a tenant cluster to the shared pdf3,
// adding the API key the shared pdf3 requires and the cluster's service owner.
type relay struct {
	logger       *slog.Logger
	keys         *auth.KeyFile
	client       *http.Client
	upstream     string
	serviceOwner string
	timeout      time.Duration
}

func newRelay(logger *slog.Logger, upstream string, keys *auth.KeyFile, serviceOwner string) *relay {
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
		// otelhttp injects the trace context, so the shared pdf3's spans join the app's trace.
		client:       &http.Client{Transport: otelhttp.NewTransport(transport)},
		upstream:     upstream,
		serviceOwner: serviceOwner,
		timeout:      types.RequestTimeout() + upstreamTimeoutMargin,
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

	// The body is buffered so a request that never reached the upstream can be sent again.
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBodySize))
	if err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			ihttp.WriteProblemDetails(rl.logger, w, r, http.StatusRequestEntityTooLarge, ihttp.ProblemDetails{
				Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.11",
				Title:  "Request Entity Too Large",
				Status: http.StatusRequestEntityTooLarge,
				Detail: fmt.Sprintf("Request body too large (max %d bytes)", maxBodySize),
			})
			return
		}
		ihttp.WriteProblemDetails(rl.logger, w, r, http.StatusBadRequest, ihttp.ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.5.1",
			Title:  "Bad Request",
			Status: http.StatusBadRequest,
			Detail: fmt.Sprintf("Failed to read request body: %v", err),
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), rl.timeout)
	defer cancel()

	resp, err := rl.send(ctx, body, r.Header.Get("Content-Type"))
	if err != nil {
		status := http.StatusBadGateway
		title := "Bad Gateway"
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			status = http.StatusGatewayTimeout
			title = "Gateway Timeout"
		}
		rl.logger.ErrorContext(
			ctx,
			"Failed to reach the PDF service",
			attr.ElapsedMs, time.Since(start).Milliseconds(),
			attr.Error, err,
		)
		ihttp.WriteProblemDetails(rl.logger, w, r, status, ihttp.ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7231#section-6.6",
			Title:  title,
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
	case resp.StatusCode == http.StatusUnauthorized:
		// The relay's API key is wrong or expired, which apps can't fix.
		rl.logger.ErrorContext(
			ctx,
			"The PDF service rejected the API key",
			attr.ElapsedMs, time.Since(start).Milliseconds(),
		)
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
	w.WriteHeader(resp.StatusCode)
	if _, err := io.Copy(w, resp.Body); err != nil {
		rl.logger.ErrorContext(
			ctx,
			"Failed to copy the PDF service response",
			attr.ElapsedMs, time.Since(start).Milliseconds(),
			attr.Error, err,
		)
	}
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
