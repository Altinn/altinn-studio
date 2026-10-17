package telemetry

import (
	"context"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"

	"altinn.studio/pdf3/internal/telemetry/attr"
)

// Retry counters, named under altinn.pdf3 as the metrics of one service are
// (https://github.com/Altinn/altinn-studio/issues/21073). A retry that works is otherwise only an
// INFO log, which is not exported, so these are what shows that requests are being retried.
const (
	// RelayConnectRetriesMetric counts the relay's retries of requests that failed to connect to the
	// shared pdf3.
	RelayConnectRetriesMetric = "altinn.pdf3.relay.connect_retries"
	// ProxyWorkerRetriesMetric counts the proxy's retries at a worker, by the error.type that made
	// it retry: RetryQueueFull or RetryTransportError.
	ProxyWorkerRetriesMetric = "altinn.pdf3.proxy.worker_retries"
)

// Why the proxy retried a request at a worker.
const (
	RetryQueueFull      = "queue_full"
	RetryTransportError = "transport_error"
)

// CountRetry adds one to the retry counter name, with errorType as error.type unless it is empty.
// The instrument is looked up on each call, which is cheap for a retry and follows the meter
// provider in use.
func CountRetry(ctx context.Context, name string, errorType string) {
	counter, err := Meter().Int64Counter(
		name,
		metric.WithUnit("{retry}"),
		metric.WithDescription("Retries of a request that failed or was rejected."),
	)
	if err != nil {
		// Only an invalid name fails, and the names are constants. Telemetry never fails a request.
		return
	}
	if errorType == "" {
		counter.Add(ctx, 1)
		return
	}
	counter.Add(ctx, 1, metric.WithAttributes(attribute.String(attr.ErrorType, errorType)))
}
