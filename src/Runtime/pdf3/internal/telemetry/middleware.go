package telemetry

import (
	"net/http"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

// WrapHandler wraps an http.HandlerFunc with OpenTelemetry instrumentation.
// The name parameter is used to identify the route in metrics (e.g., "POST /pdf").
// This automatically collects metrics for:
// - http.server.request.count - number of requests
// - http.server.request.duration - request duration histogram
// - Labeled with: http.method, http.status_code, http.route
func (t *Telemetry) WrapHandler(name string, handler http.HandlerFunc) http.Handler {
	return otelhttp.NewHandler(handler, name)
}
