package telemetry

import (
	"net/http"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

// WrapHandler wraps an http.HandlerFunc with OpenTelemetry instrumentation.
// The name parameter is used to identify the route in metrics (e.g., "POST /pdf").
func WrapHandler(name string, handler http.HandlerFunc) http.Handler {
	return otelhttp.NewHandler(handler, name)
}
