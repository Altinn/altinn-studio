package components

import (
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/envtopology"
)

// The collector takes gRPC at the topology's otel URL from the host and from the environment network alike: the
// host name is the collector's network alias, and the port is published at the same number.
func TestOTLPCollector(t *testing.T) {
	t.Parallel()

	collector := OTLPCollector(envtopology.NewLocal("8000"))
	want := envtopology.OTLPDestination{Endpoint: "http://otel.local.altinn.cloud:4317", Protocol: "grpc"}
	if collector.Host != want || collector.Network != want {
		t.Errorf("OTLPCollector() = %+v, want %+v on the host and the network", collector, want)
	}
	if !strings.HasSuffix(want.Endpoint, ":"+otelCollectorGRPCPort) {
		t.Errorf("the endpoint %s is not the collector's gRPC port %s", want.Endpoint, otelCollectorGRPCPort)
	}
}
