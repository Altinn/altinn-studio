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

	"altinn.studio/core-operator/internal/logging"
	"altinn.studio/core-operator/internal/sandbox/sandboxtest"
)

// recordMetrics makes the histogram of admissions record to the returned reader for the rest of the test.
func recordMetrics(t *testing.T) *sdkmetric.ManualReader {
	t.Helper()
	reader := sdkmetric.NewManualReader()
	if err := registerHistogram(sdkmetric.NewMeterProvider(sdkmetric.WithReader(reader)).Meter("test")); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { queueWaitDuration = noop.Float64Histogram{} })
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

//nolint:paralleltest // recordMetrics sets the package's histogram.
func TestQueueWaitDurationCountsFromTheCreate(t *testing.T) {
	RegisterTestingT(t)
	reader := recordMetrics(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "app")
	h.clock.Advance(30 * time.Second)
	Expect(h.call(t, run.ID, StepAdmit).done()).To(BeTrue())

	Expect(histogram(t, reader, QueueWaitDuration)).To(ConsistOf(HaveField("Sum", 30.0)))
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
