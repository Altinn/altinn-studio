package secretsync

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
)

// The service owner's Application Insights connection string, which the platform's ExternalSecret writes to
// flux-system (dis-way/gitops-manifests, oci/otel-collector/apps, Altinn/altinn-platform#4392).
const (
	appInsightsSourceNamespace = "flux-system"
	appInsightsSourceName      = "app-insights-connstring"
	appInsightsSourceKey       = "connectionString"
)

// An exporter that can't parse the connection string refuses to start, so a value no exporter would accept never
// reaches the destination.
const maxConnectionStringLength = 4096

var (
	errNoConnectionString      = errors.New("source secret has no connectionString")
	errInvalidConnectionString = errors.New("invalid Application Insights connection string")
)

type connectionString struct {
	// value is the connection string as key=value pairs separated by semicolons, without empty ones.
	value              string
	instrumentationKey string
}

// parseConnectionString checks that the connection string has an instrumentation key and, if it names one, an
// HTTPS ingestion endpoint, and returns it normalized. Errors never include the value.
func parseConnectionString(raw []byte) (connectionString, error) {
	value := strings.TrimSpace(string(raw))
	if value == "" {
		return connectionString{}, errNoConnectionString
	}

	pairs := make([]string, 0, 4)
	values := make(map[string]string, 4)
	for segment := range strings.SplitSeq(value, ";") {
		segment = strings.TrimSpace(segment)
		if segment == "" {
			continue
		}
		key, val, found := strings.Cut(segment, "=")
		key, val = strings.TrimSpace(key), strings.TrimSpace(val)
		if !found || key == "" {
			return connectionString{}, fmt.Errorf("%w: a segment is not key=value", errInvalidConnectionString)
		}
		values[key] = val
		pairs = append(pairs, key+"="+val)
	}

	instrumentationKey := values["InstrumentationKey"]
	if instrumentationKey == "" {
		return connectionString{}, fmt.Errorf("%w: no InstrumentationKey", errInvalidConnectionString)
	}
	if endpoint, ok := values["IngestionEndpoint"]; ok {
		parsed, err := url.Parse(endpoint)
		if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
			return connectionString{}, fmt.Errorf(
				"%w: IngestionEndpoint is not an HTTPS URL",
				errInvalidConnectionString,
			)
		}
	}

	normalized := strings.Join(pairs, ";")
	if len(normalized) > maxConnectionStringLength {
		return connectionString{}, fmt.Errorf(
			"%w: longer than %d characters", errInvalidConnectionString, maxConnectionStringLength,
		)
	}
	return connectionString{value: normalized, instrumentationKey: instrumentationKey}, nil
}
