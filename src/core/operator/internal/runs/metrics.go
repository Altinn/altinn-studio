package runs

import (
	"context"
	"fmt"
	"time"

	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/metric/noop"

	"altinn.studio/core-operator/internal/telemetry"
)

const (
	// QueueWaiting is the gauge of queued runs for each kind.
	QueueWaiting = "altinn.core_operator.queue.waiting"
	// QueueWaitDuration is the histogram of the time from a run's create to its admission.
	QueueWaitDuration = "altinn.core_operator.queue.wait.duration"
)

// The histogram of admissions records nothing until RegisterMetrics makes it.
var queueWaitDuration metric.Float64Histogram = noop.Float64Histogram{}

func recordAdmission(ctx context.Context, kind, caller string, waited time.Duration) {
	queueWaitDuration.Record(ctx, waited.Seconds(),
		metric.WithAttributes(telemetry.AttrKind.String(kind), telemetry.AttrCaller.String(caller)))
}

func registerHistogram(meter metric.Meter) error {
	var err error
	queueWaitDuration, err = meter.Float64Histogram(QueueWaitDuration, metric.WithUnit("s"), metric.WithDescription(
		"The time from a run's create to its admission to the sandbox, by kind and caller."))
	if err != nil {
		return fmt.Errorf("register %s: %w", QueueWaitDuration, err)
	}
	return nil
}

// RegisterMetrics reports the queue. Only the process that serves the run callbacks has a queue.
func RegisterMetrics(queue *Queue) error {
	if err := registerHistogram(telemetry.Meter()); err != nil {
		return err
	}
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
