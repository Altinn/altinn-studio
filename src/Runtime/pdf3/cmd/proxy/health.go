package main

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	ihttp "altinn.studio/pdf3/internal/http"
	"altinn.studio/pdf3/internal/telemetry/attr"
)

// workerHealthTimeout bounds the check of a worker, below the relay's 5 seconds for the whole check.
const workerHealthTimeout = 3 * time.Second

// workerHealth answers whether the proxy can generate PDFs, which takes a ready worker. The relays check pdf3
// through it. A worker's readiness covers its browser, and the workers' Service only sends to ready workers. The
// client has no telemetry, since a check isn't traffic.
func workerHealth(logger *slog.Logger, workerHTTPAddr string, shuttingDown func() bool) http.HandlerFunc {
	client := &http.Client{Timeout: workerHealthTimeout}
	return func(w http.ResponseWriter, r *http.Request) {
		if shuttingDown() {
			ihttp.WriteText(r.Context(), logger, w, http.StatusServiceUnavailable, "Shutting down")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), workerHealthTimeout)
		defer cancel()
		status, err := getStatus(ctx, logger, client, workerHTTPAddr+"/health/ready")
		if err != nil || status != http.StatusOK {
			// At INFO, so a long outage doesn't fill the exported logs every check.
			logger.InfoContext(ctx, "No worker is ready", attr.Error, err, attr.HTTPResponseStatusCode, status)
			ihttp.WriteText(r.Context(), logger, w, http.StatusServiceUnavailable, "No worker is ready")
			return
		}
		ihttp.WriteText(r.Context(), logger, w, http.StatusOK, "OK")
	}
}

func getStatus(ctx context.Context, logger *slog.Logger, client *http.Client, url string) (int, error) {
	//nolint:gosec // url is derived from trusted runtime configuration, the workers' address.
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return 0, err //nolint:wrapcheck // The caller logs it as it is.
	}
	//nolint:gosec // url is derived from trusted runtime configuration, the workers' address.
	resp, err := client.Do(req)
	if err != nil {
		return 0, err //nolint:wrapcheck // The caller logs it as it is.
	}
	if closeErr := resp.Body.Close(); closeErr != nil {
		logger.WarnContext(ctx, "Failed to close worker health response body", attr.Error, closeErr)
	}
	return resp.StatusCode, nil
}
