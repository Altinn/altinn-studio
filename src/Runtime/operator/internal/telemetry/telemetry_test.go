package telemetry

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/metric/metricdata"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	"go.opentelemetry.io/otel/trace"
)

const (
	testAzureMonitorExpected404Attribute      = "azuremonitor.expected_404"
	testInactivityScalerOverrideConfigMapPath = "/api/v1/namespaces/runtime-operator/configmaps/" +
		"inactivity-scaler-override"
)

func TestWithoutSpan(t *testing.T) {
	t.Parallel()

	recorder := tracetest.NewSpanRecorder()
	provider := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(recorder))
	tracer := provider.Tracer("test")

	type contextKey string

	baseCtx, cancel := context.WithCancel(context.Background())
	defer cancel()
	baseCtx = context.WithValue(baseCtx, contextKey("key"), "value")

	parentCtx, parentSpan := tracer.Start(baseCtx, "parent")
	detachedCtx := WithoutSpan(parentCtx)

	if got := detachedCtx.Value(contextKey("key")); got != "value" {
		t.Fatalf("detached context value mismatch, got %v", got)
	}

	cancel()
	select {
	case <-detachedCtx.Done():
	case <-time.After(100 * time.Millisecond):
		t.Fatal("detached context did not preserve cancellation")
	}

	_, childSpan := tracer.Start(detachedCtx, "child")
	childSpan.End()
	parentSpan.End()

	spans := recorder.Ended()
	if len(spans) != 2 {
		t.Fatalf("unexpected span count, got %d want 2", len(spans))
	}

	var parentRecorded, childRecorded sdktrace.ReadOnlySpan
	for _, span := range spans {
		switch span.Name() {
		case "parent":
			parentRecorded = span
		case "child":
			childRecorded = span
		}
	}

	if parentRecorded == nil || childRecorded == nil {
		t.Fatalf("missing recorded spans: parent=%v child=%v", parentRecorded != nil, childRecorded != nil)
	}
	if childRecorded.Parent().IsValid() {
		t.Fatalf("child span unexpectedly had a parent: %s", childRecorded.Parent().SpanID())
	}
	if childRecorded.SpanContext().TraceID() == parentRecorded.SpanContext().TraceID() {
		t.Fatal("child span unexpectedly reused parent trace")
	}
}

func TestKubernetesTransportTreats404AsSuccess(t *testing.T) {
	t.Parallel()

	recorder := tracetest.NewSpanRecorder()
	provider := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(recorder))
	t.Cleanup(func() {
		if err := provider.Shutdown(context.Background()); err != nil {
			t.Fatalf("shutdown tracer provider: %v", err)
		}
	})

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("unexpected method: %s", r.Method)
		}
		if r.URL.Path != testInactivityScalerOverrideConfigMapPath {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	client := &http.Client{
		Transport: otelhttpTransportForTest(server.Client().Transport, provider),
	}

	req, err := http.NewRequestWithContext(
		withParentSpan(provider),
		http.MethodGet,
		server.URL+testInactivityScalerOverrideConfigMapPath,
		http.NoBody,
	)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}

	res, err := client.Do(req)
	if err != nil {
		t.Fatalf("client do: %v", err)
	}
	defer func() {
		if err := res.Body.Close(); err != nil {
			t.Fatalf("close response body: %v", err)
		}
	}()

	if _, err := io.Copy(io.Discard, res.Body); err != nil {
		t.Fatalf("read response body: %v", err)
	}

	span := singleEndedSpan(t, recorder)
	if span.Status().Code != codes.Ok {
		t.Fatalf("unexpected span status: got %s want %s", span.Status().Code, codes.Ok)
	}

	if got := findAttribute(span.Attributes(), testAzureMonitorExpected404Attribute); got != attribute.BoolValue(true) {
		t.Fatalf("missing success override attribute: got %v", got)
	}
}

func TestKubernetesTransportLeavesOther404AsError(t *testing.T) {
	t.Parallel()

	assertKubernetesTransportLeavesErrorStatus(t, http.StatusNotFound, "")
}

func TestKubernetesTransportLeaves500AsError(t *testing.T) {
	t.Parallel()

	assertKubernetesTransportLeavesErrorStatus(t, http.StatusInternalServerError, "")
}

func otelhttpTransportForTest(base http.RoundTripper, provider trace.TracerProvider) http.RoundTripper {
	return newKubernetesTransport(base, otelhttp.WithTracerProvider(provider))
}

// withParentSpan returns a context inside a span of provider, as in a reconcile. The span is
// never ended, so it isn't among the recorder's ended spans.
func withParentSpan(provider trace.TracerProvider) context.Context {
	ctx, _ := provider.Tracer("test").Start(context.Background(), "reconcile") //nolint:spancheck // See doc comment.
	return ctx
}

func singleEndedSpan(t *testing.T, recorder *tracetest.SpanRecorder) sdktrace.ReadOnlySpan {
	t.Helper()

	spans := recorder.Ended()
	if len(spans) != 1 {
		t.Fatalf("unexpected ended span count: got %d want 1", len(spans))
	}

	return spans[0]
}

func assertKubernetesTransportLeavesErrorStatus(t *testing.T, statusCode int, path string) {
	t.Helper()

	recorder := tracetest.NewSpanRecorder()
	provider := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(recorder))
	t.Cleanup(func() {
		if err := provider.Shutdown(context.Background()); err != nil {
			t.Fatalf("shutdown tracer provider: %v", err)
		}
	})

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(statusCode)
	}))
	defer server.Close()

	client := &http.Client{
		Transport: otelhttpTransportForTest(server.Client().Transport, provider),
	}

	req, err := http.NewRequestWithContext(withParentSpan(provider), http.MethodGet, server.URL+path, http.NoBody)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}

	res, err := client.Do(req)
	if err != nil {
		t.Fatalf("client do: %v", err)
	}
	defer func() {
		if err := res.Body.Close(); err != nil {
			t.Fatalf("close response body: %v", err)
		}
	}()

	if _, err := io.Copy(io.Discard, res.Body); err != nil {
		t.Fatalf("read response body: %v", err)
	}

	span := singleEndedSpan(t, recorder)
	if span.Status().Code != codes.Error {
		t.Fatalf("unexpected span status: got %s want %s", span.Status().Code, codes.Error)
	}

	if got := findAttribute(span.Attributes(), testAzureMonitorExpected404Attribute); got.Type() != attribute.EMPTY {
		t.Fatalf("unexpected success override attribute: got %v", got)
	}
}

func findAttribute(attrs []attribute.KeyValue, key string) attribute.Value {
	for _, attr := range attrs {
		if string(attr.Key) == key {
			return attr.Value
		}
	}

	return attribute.Value{}
}

func TestKubernetesTransportTracesOnlyWithinAUnitOfWork(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(server.Close)

	for _, tc := range []struct {
		name        string
		query       string
		wantSpans   int
		withParent  bool
		wantMetrics bool
	}{
		{name: "call within a unit of work", withParent: true, wantSpans: 1, wantMetrics: true},
		{name: "call outside a unit of work", wantMetrics: true},
		{name: "watch within a unit of work", query: "?watch=true", withParent: true},
		{name: "watch outside a unit of work", query: "?watch=1"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			recorder := tracetest.NewSpanRecorder()
			tracerProvider := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(recorder))
			reader := sdkmetric.NewManualReader()
			meterProvider := sdkmetric.NewMeterProvider(sdkmetric.WithReader(reader))
			client := &http.Client{Transport: newKubernetesTransport(
				server.Client().Transport,
				otelhttp.WithTracerProvider(tracerProvider),
				otelhttp.WithMeterProvider(meterProvider),
			)}

			ctx := context.Background()
			if tc.withParent {
				ctx = withParentSpan(tracerProvider)
			}
			req, err := http.NewRequestWithContext(ctx, http.MethodGet, server.URL+"/api/v1/pods"+tc.query, http.NoBody)
			if err != nil {
				t.Fatalf("new request: %v", err)
			}
			res, err := client.Do(req)
			if err != nil {
				t.Fatalf("client do: %v", err)
			}
			if _, err := io.Copy(io.Discard, res.Body); err != nil {
				t.Fatalf("read response body: %v", err)
			}
			if err := res.Body.Close(); err != nil {
				t.Fatalf("close response body: %v", err)
			}

			if got := len(recorder.Ended()); got != tc.wantSpans {
				t.Errorf("spans = %d, want %d", got, tc.wantSpans)
			}
			var data metricdata.ResourceMetrics
			if err := reader.Collect(context.Background(), &data); err != nil {
				t.Fatalf("collect metrics: %v", err)
			}
			if got := hasMetric(data, "http.client.request.duration"); got != tc.wantMetrics {
				t.Errorf("http.client.request.duration recorded = %v, want %v", got, tc.wantMetrics)
			}
		})
	}
}

func hasMetric(data metricdata.ResourceMetrics, name string) bool {
	for _, scope := range data.ScopeMetrics {
		for _, m := range scope.Metrics {
			if m.Name == name {
				return true
			}
		}
	}
	return false
}
