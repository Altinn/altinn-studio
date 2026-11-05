package main

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	ihttp "altinn.studio/pdf3/internal/http"
	"altinn.studio/pdf3/internal/telemetry/attr"
)

// healthTimeout bounds the check of the shared pdf3, below the gateway's 10 seconds for the whole check.
const healthTimeout = 5 * time.Second

// healthURL is the shared pdf3's health endpoint for its PDF endpoint upstream: /pdf/v3/health on DIS Edge for
// /pdf/v3/generate, and the proxy's /pdf/health for its /pdf.
func healthURL(upstream string) string {
	u, err := url.Parse(upstream)
	if err != nil {
		return ""
	}
	if base, ok := strings.CutSuffix(u.Path, "/generate"); ok {
		u.Path = base + "/health"
	} else {
		u.Path = strings.TrimSuffix(u.Path, "/") + "/health"
	}
	u.RawPath = ""
	return u.String()
}

// handleHealth answers whether apps can get PDFs through the relay. The gateway calls it through the route apps'
// requests take, and the relay checks the shared pdf3 the way it forwards their requests, with its API key. The
// client has no telemetry, since a check isn't traffic.
func (rl *relay) handleHealth(w http.ResponseWriter, r *http.Request) {
	if rl.shuttingDown() {
		ihttp.WriteText(r.Context(), rl.logger, w, http.StatusServiceUnavailable, "Shutting down")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), healthTimeout)
	defer cancel()
	if err := rl.checkUpstream(ctx); err != nil {
		// At INFO, so a long outage of the shared pdf3 doesn't fill the exported logs every check.
		rl.logger.InfoContext(ctx, "The PDF service is not available", attr.Error, err)
		ihttp.WriteText(r.Context(), rl.logger, w, http.StatusServiceUnavailable, "The PDF service is not available")
		return
	}
	ihttp.WriteText(r.Context(), rl.logger, w, http.StatusOK, "OK")
}

func (rl *relay) checkUpstream(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rl.healthURL, nil)
	if err != nil {
		return fmt.Errorf("create health request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+rl.keys.First())

	resp, err := rl.healthClient.Do(req)
	if err != nil {
		return fmt.Errorf("health request: %w", err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			rl.logger.WarnContext(ctx, "Failed to close upstream health response body", attr.Error, closeErr)
		}
	}()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("health request: %w", &statusError{status: resp.StatusCode})
	}
	return nil
}

type statusError struct{ status int }

func (e *statusError) Error() string { return fmt.Sprintf("the PDF service answered %d", e.status) }
