package telemetry

import (
	"context"
	"fmt"
	"time"

	"go.opentelemetry.io/otel/metric"
)

// registerInstanceMetric reports the same Unix start time every collection, even without requests.
// This cross-service identity metric deliberately uses altinn.workload rather than altinn.pdf3.
func registerInstanceMetric(meter metric.Meter, started time.Time) error {
	startSeconds := float64(started.UnixNano()) / float64(time.Second)
	_, err := meter.Float64ObservableGauge(
		"altinn.workload.start_time",
		metric.WithUnit("s"),
		metric.WithDescription("Process start time in Unix seconds."),
		metric.WithFloat64Callback(func(_ context.Context, observer metric.Float64Observer) error {
			observer.Observe(startSeconds)
			return nil
		}),
	)
	if err != nil {
		return fmt.Errorf("register instance start time: %w", err)
	}
	return nil
}
