package runs

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel/metric"

	"altinn.studio/core-operator/internal/telemetry"
)

// QueueWaiting is the gauge of queued runs for each kind.
const QueueWaiting = "altinn.core_operator.queue.waiting"

// RegisterMetrics reports the queue. Only the process that serves the run callbacks has a queue.
func RegisterMetrics(queue *Queue) error {
	_, err := telemetry.Meter().Int64ObservableGauge(
		QueueWaiting,
		metric.WithDescription("Runs that wait for sandbox capacity, by kind."),
		metric.WithInt64Callback(func(_ context.Context, observer metric.Int64Observer) error {
			for kind, count := range queue.WaitingByKind() {
				observer.Observe(int64(count), metric.WithAttributes(telemetry.AttrKind.String(kind)))
			}
			return nil
		}),
	)
	if err != nil {
		return fmt.Errorf("register %s: %w", QueueWaiting, err)
	}
	return nil
}
