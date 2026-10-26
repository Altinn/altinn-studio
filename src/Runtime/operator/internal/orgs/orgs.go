package orgs

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sync/atomic"
	"time"

	commontelemetry "altinn.studio/common/telemetry"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/attribute"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/telemetry"
)

const (
	// DefaultRefreshInterval is the background refresh cadence for the cached registry.
	DefaultRefreshInterval = 1 * time.Hour
	// DefaultInitialBackoff is the first retry delay after a failed fetch.
	DefaultInitialBackoff = 1 * time.Second
	// DefaultMaxBackoff is the largest retry delay after repeated failed fetches.
	DefaultMaxBackoff = 30 * time.Second
	// DefaultMaxRetries is the maximum number of fetch attempts before giving up.
	DefaultMaxRetries  = 5
	defaultHTTPTimeout = 10 * time.Second
)

var (
	errMaxRetriesExceeded  = errors.New("max retries exceeded")
	errUnexpectedStatus    = errors.New("unexpected status code from org registry")
	errMissingOrgsKey      = errors.New(`invalid org registry payload: missing required top-level key "orgs"`)
	errEmptyOrgsPayload    = errors.New(`length of "orgs" property is zero`)
	errRetryContextStopped = errors.New("org registry retry cancelled")
)

type Org struct {
	Name  OrgName `json:"name"`
	OrgNr string  `json:"orgnr"`
}

type OrgName struct {
	En string `json:"en"`
	Nb string `json:"nb"`
	Nn string `json:"nn"`
}

type orgRegistryResponse struct {
	Orgs map[string]Org `json:"orgs"`
}

type OrgRegistry struct {
	orgs           atomic.Pointer[map[string]Org]
	httpClient     *http.Client
	url            string
	initialBackoff time.Duration
	maxBackoff     time.Duration
	maxRetries     int
}

type OrgRegistryOption func(*OrgRegistry)

func WithHTTPClient(client *http.Client) OrgRegistryOption {
	return func(r *OrgRegistry) {
		r.httpClient = client
	}
}

func WithRetryConfig(initialBackoff, maxBackoff time.Duration, maxRetries int) OrgRegistryOption {
	return func(r *OrgRegistry) {
		r.initialBackoff = initialBackoff
		r.maxBackoff = maxBackoff
		r.maxRetries = maxRetries
	}
}

func NewOrgRegistry(ctx context.Context, url string, opts ...OrgRegistryOption) (*OrgRegistry, error) {
	tracer := telemetry.Tracer()
	ctx, span := tracer.Start(ctx, "OrgRegistry.New")
	defer span.End()

	r := &OrgRegistry{
		url:  url,
		orgs: atomic.Pointer[map[string]Org]{},
		httpClient: &http.Client{
			Timeout:   defaultHTTPTimeout,
			Transport: otelhttp.NewTransport(http.DefaultTransport),
		},
		initialBackoff: DefaultInitialBackoff,
		maxBackoff:     DefaultMaxBackoff,
		maxRetries:     DefaultMaxRetries,
	}

	for _, opt := range opts {
		opt(r)
	}

	if err := r.fetchWithRetry(ctx); err != nil {
		commontelemetry.SetError(span, "fetch_org_registry", err)
		return nil, fmt.Errorf("failed to fetch org registry: %w", err)
	}

	go r.startPeriodicRefresh(ctx, DefaultRefreshInterval)

	return r, nil
}

func (r *OrgRegistry) Get(serviceOwnerId string) (Org, bool) {
	orgs := r.orgs.Load()
	if orgs == nil {
		return Org{}, false
	}
	org, ok := (*orgs)[serviceOwnerId]
	return org, ok
}

func (r *OrgRegistry) startPeriodicRefresh(ctx context.Context, interval time.Duration) {
	ctx = telemetry.WithoutSpan(ctx)
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		logger := log.FromContext(ctx)

		logger.Info("starting OrgRegistry loop")
		defer func() {
			logger.Info("exiting OrgRegistry loop")
			assert.That(ctx.Err() != nil, "exited OrgRegistry loop without context cancellation")
		}()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := r.fetch(ctx); err != nil {
					logger.Error(err, "failed to refresh org registry, keeping cached data")
				} else {
					logger.Info("org registry refreshed successfully")
				}
			}
		}
	}()
}

func (r *OrgRegistry) fetchWithRetry(ctx context.Context) error {
	backoff := r.initialBackoff

	for attempt := range r.maxRetries {
		err := r.fetch(ctx)
		if err == nil {
			return nil
		}

		if attempt == r.maxRetries-1 {
			return err
		}

		select {
		case <-ctx.Done():
			return fmt.Errorf("%w: %w", errRetryContextStopped, ctx.Err())
		case <-time.After(backoff):
			backoff *= 2
			if backoff > r.maxBackoff {
				backoff = r.maxBackoff
			}
		}
	}

	return errMaxRetriesExceeded
}

//nolint:errcheck,gosec // Response body cleanup is best-effort after the body has been fully consumed.
func closeResponseBody(resp *http.Response) {
	resp.Body.Close()
}

func (r *OrgRegistry) fetch(ctx context.Context) error {
	tracer := telemetry.Tracer()
	ctx, span := tracer.Start(ctx, "OrgRegistry.Fetch")
	defer span.End()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, r.url, nil)
	if err != nil {
		commontelemetry.SetError(span, "create_request", err)
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := r.httpClient.Do(req)
	if err != nil {
		commontelemetry.SetError(span, "request_failed", err)
		return fmt.Errorf("failed to fetch orgs: %w", err)
	}
	defer closeResponseBody(resp)

	if resp.StatusCode != http.StatusOK {
		statusErr := fmt.Errorf("%w: %d", errUnexpectedStatus, resp.StatusCode)
		commontelemetry.SetError(span, "unexpected_status", statusErr)
		return statusErr
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		commontelemetry.SetError(span, "read_response", err)
		return fmt.Errorf("failed to read response body: %w", err)
	}

	var registry orgRegistryResponse
	if err := json.Unmarshal(body, &registry); err != nil {
		commontelemetry.SetError(span, "decode_response", err)
		return fmt.Errorf("failed to unmarshal orgs: %w", err)
	}

	if registry.Orgs == nil {
		err := errMissingOrgsKey
		commontelemetry.SetError(span, "missing_orgs", err)
		return err
	}

	if len(registry.Orgs) == 0 {
		err := errEmptyOrgsPayload
		commontelemetry.SetError(span, "empty_orgs", err)
		return err
	}

	r.orgs.Store(&registry.Orgs)

	span.SetAttributes(attribute.Int("altinn.operator.org_registry.orgs", len(registry.Orgs)))

	return nil
}
