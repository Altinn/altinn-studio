package envtopology

// The values of OTEL_EXPORTER_OTLP_PROTOCOL a collector is reached with.
const (
	OTLPProtocolGRPC         = "grpc"
	OTLPProtocolHTTPProtobuf = "http/protobuf"
)

// OTLPDestination is where a process sends OTLP: the values of OTEL_EXPORTER_OTLP_ENDPOINT and
// OTEL_EXPORTER_OTLP_PROTOCOL, which belong together.
type OTLPDestination struct {
	Endpoint string
	Protocol string
}

// OTLPCollector is where an environment's collector receives OTLP. A process on the host and a container on the
// environment's network may reach it at different addresses, and each runtime states its own.
type OTLPCollector struct {
	Host    OTLPDestination
	Network OTLPDestination
}
