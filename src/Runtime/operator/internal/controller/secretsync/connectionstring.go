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

// canonicalKeys are the connection string keys Azure documents. The .NET SDKs read a key in any case, and the
// Collector's azure_monitor exporter only as written here, so the destination spells them this way.
var canonicalKeys = []string{
	"InstrumentationKey",
	"IngestionEndpoint",
	"LiveEndpoint",
	"ProfilerEndpoint",
	"SnapshotEndpoint",
	"EndpointSuffix",
	"Location",
	"ApplicationId",
	"Authorization",
}

type connectionString struct {
	// value is the connection string as key=value pairs separated by semicolons, without empty ones, with the
	// documented keys in their canonical case.
	value              string
	instrumentationKey string
}

// parseConnectionString checks the connection string as the .NET SDKs do, which reject a key that appears twice in
// any case, and returns it normalized. It needs an instrumentation key, and every endpoint it names to be an HTTPS
// URL. Errors never include a value.
func parseConnectionString(raw []byte) (connectionString, error) {
	value := strings.TrimSpace(string(raw))
	if value == "" {
		return connectionString{}, errNoConnectionString
	}

	pairs := make([]string, 0, 4)
	seen := make(map[string]bool, 4)
	instrumentationKey := ""
	for segment := range strings.SplitSeq(value, ";") {
		segment = strings.TrimSpace(segment)
		if segment == "" {
			continue
		}
		key, val, found := strings.Cut(segment, "=")
		key, val = canonicalKey(strings.TrimSpace(key)), strings.TrimSpace(val)
		if !found || key == "" {
			return connectionString{}, fmt.Errorf("%w: a segment is not key=value", errInvalidConnectionString)
		}
		folded := strings.ToLower(key)
		if seen[folded] {
			return connectionString{}, fmt.Errorf("%w: %s appears more than once", errInvalidConnectionString, key)
		}
		seen[folded] = true
		if strings.HasSuffix(folded, "endpoint") {
			parsed, err := url.Parse(val)
			if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
				return connectionString{}, fmt.Errorf("%w: %s is not an HTTPS URL", errInvalidConnectionString, key)
			}
		}
		if key == "InstrumentationKey" {
			instrumentationKey = val
		}
		pairs = append(pairs, key+"="+val)
	}

	if instrumentationKey == "" {
		return connectionString{}, fmt.Errorf("%w: no InstrumentationKey", errInvalidConnectionString)
	}

	normalized := strings.Join(pairs, ";")
	if len(normalized) > maxConnectionStringLength {
		return connectionString{}, fmt.Errorf(
			"%w: longer than %d characters", errInvalidConnectionString, maxConnectionStringLength,
		)
	}
	return connectionString{value: normalized, instrumentationKey: instrumentationKey}, nil
}

func canonicalKey(key string) string {
	for _, canonical := range canonicalKeys {
		if strings.EqualFold(key, canonical) {
			return canonical
		}
	}
	return key
}
