package telemetry

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.opentelemetry.io/otel/metric"
)

// WorkloadStartTime is the gauge every Studio process reports: its start time in Unix seconds.
// It is the one metric name shared across services rather than under altinn.<service>.
const WorkloadStartTime = "altinn.workload.start_time"

// The process's identity, captured once when the package initializes, before main starts or
// telemetry is configured. A restart gets a new ID, even inside the same pod.
var (
	processStartTime  = time.Now()
	processInstanceID = uuid.NewString()
)

// registerStartTime reports the same start time at every collection, even when the process is
// idle, so dashboards can count reporting processes and mark restarts and deploys.
func registerStartTime(meter metric.Meter, started time.Time) error {
	startSeconds := float64(started.UnixNano()) / float64(time.Second)
	_, err := meter.Float64ObservableGauge(
		WorkloadStartTime,
		metric.WithUnit("s"),
		metric.WithDescription("Process start time in Unix seconds."),
		metric.WithFloat64Callback(func(_ context.Context, observer metric.Float64Observer) error {
			observer.Observe(startSeconds)
			return nil
		}),
	)
	if err != nil {
		return fmt.Errorf("register %s: %w", WorkloadStartTime, err)
	}
	return nil
}
