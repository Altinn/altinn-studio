package telemetry

import (
	"testing"

	"go.opentelemetry.io/otel/attribute"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
)

func TestNewResource(t *testing.T) {
	t.Setenv("OTEL_RESOURCE_ATTRIBUTES", "k8s.pod.uid=pod")

	res, err := newResource(t.Context(), "tt02")
	if err != nil {
		t.Fatalf("newResource() error = %v", err)
	}
	for key, want := range map[attribute.Key]string{
		semconv.ServiceVersionKey:            serviceVersion,
		semconv.DeploymentEnvironmentNameKey: "tt02",
		semconv.K8SPodUIDKey:                 "pod",
	} {
		if got, _ := res.Set().Value(key); got.AsString() != want {
			t.Errorf("%s = %q, want %q", key, got.AsString(), want)
		}
	}
}

func TestDeploymentEnvironmentName(t *testing.T) {
	for environment, want := range map[string]string{
		"prod":      "production",
		"tt02":      "tt02",
		"at22":      "at22",
		"yt01":      "yt01",
		"local":     "local",
		"localtest": "localtest",
	} {
		if got := deploymentEnvironmentName(environment); got != want {
			t.Errorf("deploymentEnvironmentName(%q) = %q, want %q", environment, got, want)
		}
	}
}
