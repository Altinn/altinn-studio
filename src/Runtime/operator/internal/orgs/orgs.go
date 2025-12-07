package orgs

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync/atomic"
	"time"

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/telemetry"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	DefaultRefreshInterval = 1 * time.Hour
	DefaultInitialBackoff  = 1 * time.Second
	DefaultMaxBackoff      = 30 * time.Second
	DefaultMaxRetries      = 5
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

type OrgRegistry struct {
	url            string
	orgs           atomic.Pointer[map[string]Org]
	httpClient     *http.Client
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

// NewOrgRegistry creates a new OrgRegistry and performs the initial fetch with retry.
func NewOrgRegistry(ctx context.Context, url string, opts ...OrgRegistryOption) (*OrgRegistry, error) {
	tracer := otel.Tracer(telemetry.ServiceName)
	ctx, span := tracer.Start(ctx, "OrgRegistry.New")
	defer span.End()

	r := &OrgRegistry{
		url:            url,
		orgs:           atomic.Pointer[map[string]Org]{},
		httpClient:     &http.Client{Timeout: 10 * time.Second},
		initialBackoff: DefaultInitialBackoff,
		maxBackoff:     DefaultMaxBackoff,
		maxRetries:     DefaultMaxRetries,
	}

	for _, opt := range opts {
		opt(r)
	}

	span.SetAttributes(attribute.String("url", r.url))

	if err := r.fetchWithRetry(ctx); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return nil, fmt.Errorf("failed to fetch org registry: %w", err)
	}

	go r.startPeriodicRefresh(ctx, DefaultRefreshInterval)

	return r, nil
}

// Get returns the org for the given service owner ID.
func (r *OrgRegistry) Get(serviceOwnerId string) (Org, bool) {
	orgs := r.orgs.Load()
	if orgs == nil {
		return Org{}, false
	}
	org, ok := (*orgs)[serviceOwnerId]
	return org, ok
}

func (r *OrgRegistry) startPeriodicRefresh(ctx context.Context, interval time.Duration) {
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

	for attempt := 0; attempt < r.maxRetries; attempt++ {
		err := r.fetch(ctx)
		if err == nil {
			return nil
		}

		if attempt == r.maxRetries-1 {
			return err
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(backoff):
			backoff *= 2
			if backoff > r.maxBackoff {
				backoff = r.maxBackoff
			}
		}
	}

	return fmt.Errorf("max retries exceeded")
}

func (r *OrgRegistry) fetch(ctx context.Context) error {
	tracer := otel.Tracer(telemetry.ServiceName)
	ctx, span := tracer.Start(ctx, "OrgRegistry.Fetch")
	defer span.End()

	span.SetAttributes(attribute.String("url", r.url))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, r.url, nil)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := r.httpClient.Do(req)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return fmt.Errorf("failed to fetch orgs: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	span.SetAttributes(attribute.Int("http.status_code", resp.StatusCode))

	if resp.StatusCode != http.StatusOK {
		err := fmt.Errorf("unexpected status code: %d", resp.StatusCode)
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return err
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return fmt.Errorf("failed to read response body: %w", err)
	}

	var orgs map[string]Org
	if err := json.Unmarshal(body, &orgs); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return fmt.Errorf("failed to unmarshal orgs: %w", err)
	}

	r.orgs.Store(&orgs)

	span.SetAttributes(attribute.Int("orgs.count", len(orgs)))

	return nil
}
