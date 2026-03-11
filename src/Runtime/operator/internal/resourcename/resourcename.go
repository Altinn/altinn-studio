package resourcename

import (
	"errors"
	"fmt"
	"strings"
)

var errInvalidMaskinportenClientName = errors.New("invalid MaskinportenClient resource name")

// MaskinportenClientName format: {serviceOwnerId}-{appId} where appId may contain hyphens.
type MaskinportenClientName struct {
	ServiceOwnerId string
	AppId          string
}

func ParseMaskinportenClientName(name string) (MaskinportenClientName, error) {
	parts := strings.SplitN(name, "-", 2)
	if len(parts) < 2 || parts[0] == "" || parts[1] == "" {
		return MaskinportenClientName{}, fmt.Errorf(
			"%w: %q (expected {serviceOwnerId}-{appId})",
			errInvalidMaskinportenClientName,
			name,
		)
	}
	return MaskinportenClientName{
		ServiceOwnerId: parts[0],
		AppId:          parts[1],
	}, nil
}
