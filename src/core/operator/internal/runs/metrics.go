package runs

import (
	"context"
	"fmt"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/metric/noop"

	"altinn.studio/core-operator/internal/telemetry"
)

const (
	// QueueWaiting is the gauge of queued runs for each kind.
	QueueWaiting = "altinn.core_operator.queue.waiting"
	// RunDuration is the histogram of runs that ended, from their create to their final status. Its count is the
	// number of runs that ended, by kind, caller, status and reason.
	RunDuration = "altinn.core_operator.run.duration"
	// QueueWaitDuration is the histogram of the time from a run's create to its admission, by kind and caller.
	QueueWaitDuration = "altinn.core_operator.queue.wait.duration"
)

// The histograms of runs record nothing until RegisterMetrics makes them.
var runDuration, queueWaitDuration metric.Float64Histogram = noop.Float64Histogram{}, noop.Float64Histogram{}

// recordEnd records a run that ended, took after its create. reason is empty for a run that completed or was canceled.
func recordEnd(ctx context.Context, kind, caller string, status Status, reason string, took time.Duration) {
	attributes := []attribute.KeyValue{
		telemetry.AttrKind.String(kind),
		telemetry.AttrCaller.String(caller),
		telemetry.AttrRunStatus.String(string(status)),
	}
	if reason != "" {
		attributes = append(attributes, telemetry.AttrRunReason.String(reason))
	}
	runDuration.Record(ctx, took.Seconds(), metric.WithAttributes(attributes...))
}

// recordAdmission records a run that the queue let into the sandbox, waited after its create.
func recordAdmission(ctx context.Context, kind, caller string, waited time.Duration) {
	queueWaitDuration.Record(ctx, waited.Seconds(),
		metric.WithAttributes(telemetry.AttrKind.String(kind), telemetry.AttrCaller.String(caller)))
}

// registerHistograms makes the histograms of runs with meter.
func registerHistograms(meter metric.Meter) error {
	var err error
	runDuration, err = meter.Float64Histogram(RunDuration, metric.WithUnit("s"), metric.WithDescription(
		"Runs that ended, from their create to their final status, by kind, caller, status and reason."))
	if err != nil {
		return fmt.Errorf("register %s: %w", RunDuration, err)
	}
	queueWaitDuration, err = meter.Float64Histogram(QueueWaitDuration, metric.WithUnit("s"), metric.WithDescription(
		"The time from a run's create to its admission to the sandbox, by kind and caller."))
	if err != nil {
		return fmt.Errorf("register %s: %w", QueueWaitDuration, err)
	}
	return nil
}

// RegisterMetrics reports the queue and the runs. Only the process that serves the run callbacks has a queue.
func RegisterMetrics(queue *Queue) error {
	if err := registerHistograms(telemetry.Meter()); err != nil {
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
