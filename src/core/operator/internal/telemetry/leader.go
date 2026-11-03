package telemetry

import (
	"context"
	"fmt"
	"sync/atomic"

	"go.opentelemetry.io/otel/metric"
)

// Leader is the gauge of leader election: 1 while this process is the elected leader, which runs the garbage
// collector, and 0 before.
const Leader = "altinn.core_operator.leader"

var elected, stopped atomic.Bool

// leading reports whether this process is the elected leader and its manager still runs.
func leading() bool {
	return elected.Load() && !stopped.Load()
}

// EndLeadership records that the manager has stopped, so the final export reports this process
// as no longer leading while the next leader takes over.
func EndLeadership() {
	stopped.Store(true)
}

// RegisterLeader reports Leader, which turns 1 when elected closes.
func RegisterLeader(electedChannel <-chan struct{}) error {
	go func() {
		<-electedChannel
		elected.Store(true)
	}()
	_, err := Meter().Int64ObservableGauge(
		Leader,
		metric.WithDescription("1 while this process is the elected leader that runs the garbage collector, else 0."),
		metric.WithInt64Callback(func(_ context.Context, observer metric.Int64Observer) error {
			if leading() {
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
