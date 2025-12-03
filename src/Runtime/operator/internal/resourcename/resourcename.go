package resourcename

import (
	"fmt"
	"strings"
)

// MaskinportenClientName represents a parsed MaskinportenClient resource name.
// Format: {serviceOwnerId}-{appId} where appId may contain hyphens.
type MaskinportenClientName struct {
	ServiceOwnerId string
	AppId          string
}

// ParseMaskinportenClientName parses a MaskinportenClient resource name.
func ParseMaskinportenClientName(name string) (MaskinportenClientName, error) {
	parts := strings.SplitN(name, "-", 2)
	if len(parts) < 2 || parts[0] == "" || parts[1] == "" {
		return MaskinportenClientName{}, fmt.Errorf("invalid MaskinportenClient resource name: %q (expected {serviceOwnerId}-{appId})", name)
	}
	return MaskinportenClientName{
		ServiceOwnerId: parts[0],
		AppId:          parts[1],
	}, nil
}
