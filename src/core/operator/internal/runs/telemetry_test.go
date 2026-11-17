package runs

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/go-logr/zapr"
	. "github.com/onsi/gomega"
	"go.opentelemetry.io/otel/metric/noop"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/metric/metricdata"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"go.uber.org/zap/zaptest/observer"

	"altinn.studio/core-operator/internal/callbacks"
	"altinn.studio/core-operator/internal/logging"
	"altinn.studio/core-operator/internal/runner"
	"altinn.studio/core-operator/internal/sandbox/sandboxtest"
	"altinn.studio/core-operator/internal/telemetry"
)

// recordMetrics makes the run histograms record to the returned reader for the rest of the test.
func recordMetrics(t *testing.T) *sdkmetric.ManualReader {
	t.Helper()
	reader := sdkmetric.NewManualReader()
	if err := registerHistograms(sdkmetric.NewMeterProvider(sdkmetric.WithReader(reader)).Meter("test")); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { runDuration, queueWaitDuration = noop.Float64Histogram{}, noop.Float64Histogram{} })
	return reader
}

// histogram reads the data points of the histogram with the name.
func histogram(t *testing.T, reader *sdkmetric.ManualReader, name string) []metricdata.HistogramDataPoint[float64] {
	t.Helper()
	var data metricdata.ResourceMetrics
	if err := reader.Collect(t.Context(), &data); err != nil {
		t.Fatal(err)
	}
	for _, scope := range data.ScopeMetrics {
		for _, found := range scope.Metrics {
			if points, ok := found.Data.(metricdata.Histogram[float64]); ok && found.Name == name {
				return points.DataPoints
			}
		}
	}
	return nil
}

//nolint:paralleltest // recordMetrics sets the package's histograms.
func TestRunDurationCountsEachRunThatEnds(t *testing.T) {
	RegisterTestingT(t)
	reader := recordMetrics(t)
	h := newHarness(t)

	// maxActivePerCaller is 1, so the assistant's second run waits in the queue until it expires.
	failed := h.create(t, "assistant", "failed")
	h.clock.Advance(time.Second)
	expired := h.create(t, "assistant", "expired")
	h.startCommand(t, failed.ID)
	h.host.Finish(runner.Status{Status: runner.StatusFailed, Error: "the app does not build"}, "")
	Expect(h.call(t, failed.ID, StepAwaitResult).done()).To(BeTrue())
	Expect(h.call(t, expired.ID, StepAdmit, func(p *callbacks.Payload) { p.IsFinalWaitCheck = true }).status).
		To(Equal(422))
	canceled := h.create(t, "other", "canceled")
	for range 2 {
		if _, _, err := h.service.Cancel(t.Context(), "other", canceled.ID); err != nil {
			t.Fatal(err)
		}
	}

	ended := make(map[string]uint64)
	for _, point := range histogram(t, reader, RunDuration) {
		status, _ := point.Attributes.Value(telemetry.AttrRunStatus)
		reason, _ := point.Attributes.Value(telemetry.AttrRunReason)
		ended[status.AsString()+"/"+reason.AsString()] += point.Count
	}
	Expect(ended).To(Equal(map[string]uint64{
		"failed/run-failed":     1,
		"expired/queue-timeout": 1,
		"canceled/":             1,
	}))
}

//nolint:paralleltest // recordMetrics sets the package's histograms.
func TestRunDurationAndQueueWaitDurationCountFromTheCreate(t *testing.T) {
	RegisterTestingT(t)
	reader := recordMetrics(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	h.clock.Advance(30 * time.Second)
	h.startCommand(t, run.ID)
	h.clock.Advance(time.Minute)
	h.host.Finish(runner.Status{Status: runner.StatusCompleted}, "")
	Expect(h.call(t, run.ID, StepAwaitResult).done()).To(BeTrue())

	Expect(histogram(t, reader, QueueWaitDuration)).To(ConsistOf(HaveField("Sum", 30.0)))
	Expect(histogram(t, reader, RunDuration)).To(ConsistOf(HaveField("Sum", 90.0)))
}

//nolint:paralleltest // The test sets the process's logger.
func TestDeleteJobFirstRelaysTheRunnersWarningsAndErrors(t *testing.T) {
	RegisterTestingT(t)
	core, logs := observer.New(zapcore.DebugLevel)
	logging.SetDefault(zapr.NewLogger(zap.New(core)))
	t.Cleanup(func() { logging.SetDefault(zapr.NewLogger(zap.NewNop())) })
	box := sandboxtest.New()
	lines := make([]string, 0, 4+maxRelayed)
	lines = append(lines,
		`{"level":"INFO","fields":{"message":"the run starts"}}`,
		`{"level":"WARN","fields":{"message":"the command wrote no report","error":"not found"}}`,
		`{"level":"ERROR","fields":{"message":"could not delete the VM"}}`,
		`thread 'main' panicked at src/host.rs:1:1`,
	)
	for i := range maxRelayed {
		lines = append(lines, fmt.Sprintf(`{"level":"WARN","fields":{"message":"warning %d"}}`, i))
	}
	box.RunnerLog = []byte(strings.Join(lines, "\n") + "\n")

	Expect(deleteJob(t.Context(), box, testNamespace, "run")).To(Succeed())

	entries := logs.All()
	Expect(entries).To(HaveLen(maxRelayed + 1))
	Expect(entries[0].Level).To(Equal(zapcore.WarnLevel))
	Expect(entries[0].Message).To(Equal("the command wrote no report"))
	Expect(entries[0].ContextMap()).To(And(HaveKeyWithValue("runId", "run"), HaveKeyWithValue("error", "not found")))
	Expect(entries[1].Level).To(Equal(zapcore.ErrorLevel))
	Expect(entries[1].Message).To(Equal("could not delete the VM"))
	Expect(entries[2].ContextMap()).To(HaveKeyWithValue("line", "thread 'main' panicked at src/host.rs:1:1"))
	Expect(entries[maxRelayed].Message).To(Equal("The operator runner logged more warnings and errors"))
	Expect(entries[maxRelayed].ContextMap()).To(HaveKeyWithValue("count", int64(3)))
}
