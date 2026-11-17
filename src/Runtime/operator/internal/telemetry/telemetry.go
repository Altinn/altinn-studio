package telemetry

import (
	"context"
	"fmt"
	"net/http"
	"slices"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	otelmetric "go.opentelemetry.io/otel/metric"
	oteltrace "go.opentelemetry.io/otel/trace"
	tracenoop "go.opentelemetry.io/otel/trace/noop"
	"k8s.io/client-go/rest"

	commontelemetry "altinn.studio/common/telemetry"
)

const (
	scopeName = "operator"
)

// serviceVersion is the build's version, the commit the deployment workflow builds from:
// go build -ldflags "-X altinn.studio/operator/internal/telemetry.serviceVersion=...".
var serviceVersion = "dev"

func Tracer() oteltrace.Tracer {
	return otel.Tracer(scopeName)
}

func Meter() otelmetric.Meter {
	return otel.Meter(scopeName)
}

// WithoutSpan keeps cancellation and context values while dropping active span parentage.
// Use this when handing a request-scoped context to long-lived background loops.
func WithoutSpan(ctx context.Context) context.Context {
	return oteltrace.ContextWithSpanContext(ctx, oteltrace.SpanContext{})
}

// ConfigureOTel exports traces, metrics and logs, as the standards for Studio services describe
// (src/common/go/telemetry). The router in the cluster sets deployment.environment.name.
// If it does not return an error, make sure to call shutdown for proper cleanup.
func ConfigureOTel(ctx context.Context) (shutdown func(context.Context) error, err error) {
	shutdown, err = commontelemetry.Setup(ctx, commontelemetry.Config{
		ServiceVersion: serviceVersion,
		Signals:        commontelemetry.AllSignals(),
	})
	if err != nil {
		return nil, fmt.Errorf("configure OpenTelemetry: %w", err)
	}
	return shutdown, nil
}

func WrapTransport(config *rest.Config) {
	config.Wrap(func(base http.RoundTripper) http.RoundTripper {
		return newKubernetesTransport(base)
	})
}

// newKubernetesTransport instruments the operator's calls to the Kubernetes API.
//
// A call made within a unit of work, such as a reconcile, is a span in its trace. A call outside
// one gets no span, only the request metrics: leader election renews its lease and informers list
// every few seconds, and each call would be a trace of its own. Watches get neither. They are
// long-lived connections rather than units of work, and as spans they would last minutes and pass
// the slow-trace sampling policy every time.
func newKubernetesTransport(base http.RoundTripper, opts ...otelhttp.Option) http.RoundTripper {
	inner := &kubernetesAPITransport{base: base}
	traced := slices.Concat(opts, []otelhttp.Option{otelhttp.WithFilter(isNotWatch)})
	untraced := slices.Concat(traced, []otelhttp.Option{otelhttp.WithTracerProvider(tracenoop.NewTracerProvider())})
	return &kubernetesAPITracing{
		traced:   otelhttp.NewTransport(inner, traced...),
		untraced: otelhttp.NewTransport(inner, untraced...),
	}
}

type kubernetesAPITracing struct {
	traced   http.RoundTripper
	untraced http.RoundTripper
}

//nolint:wrapcheck // Preserve the exact transport error so callers can keep type-based handling.
func (t *kubernetesAPITracing) RoundTrip(req *http.Request) (*http.Response, error) {
	if oteltrace.SpanContextFromContext(req.Context()).IsValid() {
		return t.traced.RoundTrip(req)
	}
	return t.untraced.RoundTrip(req)
}

func isNotWatch(req *http.Request) bool {
	watch := req.URL.Query().Get("watch")
	return watch != "true" && watch != "1"
}

type kubernetesAPITransport struct {
	base http.RoundTripper
}

//nolint:wrapcheck // Preserve the exact transport error so callers can keep type-based handling.
func (t *kubernetesAPITransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if t.base == nil {
		t.base = http.DefaultTransport
	}

	res, err := t.base.RoundTrip(req)
	if err != nil || res == nil || res.StatusCode != http.StatusNotFound || !isExpectedNotFoundKubernetesRequest(req) {
		return res, err
	}

	const azureMonitorExpected404Attribute = "azuremonitor.expected_404"
	span := oteltrace.SpanFromContext(req.Context())
	span.SetAttributes(attribute.Bool(azureMonitorExpected404Attribute, true))
	span.SetStatus(codes.Ok, "")

	return res, nil
}

func isExpectedNotFoundKubernetesRequest(req *http.Request) bool {
	const inactivityScalerOverrideConfigMapPath = "/api/v1/namespaces/runtime-operator/configmaps/" +
		"inactivity-scaler-override"

	if req == nil || req.URL == nil {
		return false
	}

	return req.Method == http.MethodGet && req.URL.Path == inactivityScalerOverrideConfigMapPath
}
