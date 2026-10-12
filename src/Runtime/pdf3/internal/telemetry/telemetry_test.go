package telemetry

import (
	"testing"

	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
)

func TestNewResource_ServiceVersion(t *testing.T) {
	t.Setenv("OTEL_RESOURCE_ATTRIBUTES", "")

	res, err := newResource(t.Context())
	if err != nil {
		t.Fatalf("newResource() error = %v", err)
	}
	if got, _ := res.Set().Value(semconv.ServiceVersionKey); got.AsString() != serviceVersion {
		t.Errorf("service.version = %q, want %q", got.AsString(), serviceVersion)
	}
}
