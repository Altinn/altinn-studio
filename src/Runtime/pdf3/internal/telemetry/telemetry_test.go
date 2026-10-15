package telemetry

import (
	"testing"

	"go.opentelemetry.io/otel/attribute"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
)

func TestNewResource(t *testing.T) {
	t.Setenv("OTEL_RESOURCE_ATTRIBUTES", "k8s.pod.uid=pod")

	for _, environment := range []string{"prod", "tt02", "at22", "yt01", "local", "localtest"} {
		t.Run(environment, func(t *testing.T) {
			res, err := newResource(t.Context(), environment)
			if err != nil {
				t.Fatalf("newResource() error = %v", err)
			}
			for key, want := range map[attribute.Key]string{
				semconv.ServiceVersionKey:            serviceVersion,
				semconv.ServiceInstanceIDKey:         instanceID,
				semconv.DeploymentEnvironmentNameKey: environment,
				semconv.K8SPodUIDKey:                 "pod",
			} {
				if got, _ := res.Set().Value(key); got.AsString() != want {
					t.Errorf("%s = %q, want %q", key, got.AsString(), want)
				}
			}
		})
	}
}

func TestNewResourceAllowsIdentityOverride(t *testing.T) {
	t.Setenv("OTEL_RESOURCE_ATTRIBUTES", "service.instance.id=explicit,service.version=build-42")
	res, err := newResource(t.Context(), "local")
	if err != nil {
		t.Fatal(err)
	}
	for key, want := range map[attribute.Key]string{semconv.ServiceInstanceIDKey: "explicit", semconv.ServiceVersionKey: "build-42"} {
		if got, _ := res.Set().Value(key); got.AsString() != want {
			t.Errorf("%s = %q, want %q", key, got.AsString(), want)
		}
	}
}
