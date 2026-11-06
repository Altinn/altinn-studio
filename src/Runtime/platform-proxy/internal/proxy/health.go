package proxy

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"time"

	"altinn.studio/platform-proxy/internal/accesstoken"
	"altinn.studio/platform-proxy/internal/telemetry/attr"
)

const (
	// healthCheckPath is a platform API that every app reads when it starts: small, public and without side
	// effects. Storage's own health endpoint is not exposed on the platform's host.
	healthCheckPath = "/authentication/api/v1/openid/.well-known/openid-configuration"
	// healthTimeout bounds the check of the platform, below the gateway's 10 seconds for the whole check.
	healthTimeout = 5 * time.Second
	// maxHealthBodySize bounds what the check reads of the platform's answer, so the connection can be reused.
	maxHealthBodySize = 64 * 1024
)

// The reasons the health check gives for being unhealthy.
const (
	healthNoCredentials      = "no_certificate"
	healthCertificateExpired = "certificate_expired"
	healthUnexpectedStatus   = "unexpected_status"
)

// HealthChecker answers whether apps can reach the platform through the proxy. The gateway calls it for the
// runtime cluster's health, not the kubelet: the platform being down must not take the proxy out of rotation.
type HealthChecker struct {
	now      func() time.Time
	logger   *slog.Logger
	issuer   CredentialsIssuer
	client   *http.Client
	checkURL string
}

// CredentialsIssuer issues tokens, and tells when its certificate expires.
type CredentialsIssuer interface {
	TokenIssuer
	NotAfter() (time.Time, bool)
}

// NewHealthChecker checks upstream, the platform's origin, with tokens from issuer.
func NewHealthChecker(logger *slog.Logger, upstream *url.URL, issuer CredentialsIssuer) *HealthChecker {
	return &HealthChecker{
		now:    time.Now,
		logger: logger,
		issuer: issuer,
		client: &http.Client{
			Transport: newTransport(),
			Timeout:   healthTimeout,
			// A redirect is not followed, so the token is only ever sent to the platform's host.
			CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
		},
		checkURL: upstream.JoinPath(healthCheckPath).String(),
	}
}

// ServeHTTP answers 200 when the proxy can sign tokens with a certificate that has not expired, and the
// platform answers a request sent the way apps' requests are, with a token. It answers 503 otherwise. The
// check is not traffic, so it has no span or metrics.
func (h *HealthChecker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	reason := h.check(r.Context())
	if reason != "" {
		// At INFO, so a long outage of the platform doesn't fill the exported logs every check.
		h.logger.InfoContext(r.Context(), "The platform is not reachable through the proxy", attr.HealthReason, reason)
		writeText(r.Context(), h.logger, w, http.StatusServiceUnavailable, "The platform is not reachable")
		return
	}
	writeText(r.Context(), h.logger, w, http.StatusOK, "OK")
}

// check returns why the platform is not reachable, or "" if it is. Like a failed request, a failure is
// reported only by its kind: an error's message can quote the response.
func (h *HealthChecker) check(ctx context.Context) string {
	notAfter, ok := h.issuer.NotAfter()
	if !ok {
		return healthNoCredentials
	}
	if h.now().After(notAfter) {
		return healthCertificateExpired
	}
	token, err := h.issuer.Token()
	if err != nil {
		return healthNoCredentials
	}

	ctx, cancel := context.WithTimeout(ctx, healthTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, h.checkURL, nil)
	if err != nil {
		return errorUpstreamFailed
	}
	req.Header.Set(accesstoken.Header, token)
	resp, err := h.client.Do(req)
	if err != nil {
		_, errorType := classify(err)
		return errorType
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			h.logger.DebugContext(ctx, "Failed to close the platform's health response", attr.Error, closeErr)
		}
	}()
	if _, err := io.Copy(io.Discard, io.LimitReader(resp.Body, maxHealthBodySize)); err != nil {
		return errorUpstreamFailed
	}
	if resp.StatusCode != http.StatusOK {
		return healthUnexpectedStatus
	}
	return ""
}

func writeText(ctx context.Context, logger *slog.Logger, w http.ResponseWriter, status int, body string) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(status)
	if _, err := io.WriteString(w, body); err != nil {
		logger.InfoContext(ctx, "Failed to write a health response", attr.Error, err)
	}
}
