package telemetry

import (
	"context"
	"fmt"
	"sync/atomic"

	"go.opentelemetry.io/otel/metric"
)

// Leader is the gauge of leader election: 1 while this process is the elected leader, which runs
// the controllers, and 0 before. A cluster where no process reports 1 has no controllers running.
const Leader = "altinn.operator.leader"

var leading atomic.Bool

// IsLeader reports whether this process has been elected leader. Gauges that describe the cluster
// rather than the process report only from the leader, so a rollout's second process doesn't
// count everything twice.
func IsLeader() bool {
	return leading.Load()
}

// RegisterLeader reports Leader, which turns 1 when elected closes.
func RegisterLeader(elected <-chan struct{}) error {
	go func() {
		<-elected
		leading.Store(true)
	}()
	_, err := Meter().Int64ObservableGauge(
		Leader,
		metric.WithDescription("1 while this process is the elected leader that runs the controllers, else 0."),
		metric.WithInt64Callback(func(_ context.Context, observer metric.Int64Observer) error {
			if IsLeader() {
				observer.Observe(1)
			} else {
				observer.Observe(0)
			}
			return nil
		}),
	)
	if err != nil {
		return fmt.Errorf("register %s: %w", Leader, err)
	}
	return nil
}
