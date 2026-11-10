// Package serviceowner determines the service owner a PDF request is for.
//
// In a service owner's own cluster, PDF3_SERVICEOWNER names it. A pdf3 shared by all service
// owners has no such setting: the relay in each service owner's cluster sends its own
// PDF3_SERVICEOWNER in Header, and the proxy passes the header on to the worker.
package serviceowner

import "context"

// Header carries the service owner from the relay to a shared pdf3.
const Header = "X-Altinn-Service-Owner"

// Valid reports whether s can be a service owner: a lowercase DNS label, as service owner codes
// are.
func Valid(s string) bool {
	if s == "" || len(s) > 63 || s[0] == '-' || s[len(s)-1] == '-' {
		return false
	}
	for _, c := range s {
		if (c < 'a' || c > 'z') && (c < '0' || c > '9') && c != '-' {
			return false
		}
	}
	return true
}

// FromHeader returns the service owner in a request's Header value, or "" if it isn't Valid.
func FromHeader(value string) string {
	if !Valid(value) {
		return ""
	}
	return value
}

// Resolve returns the service owner of a request: configured, the PDF3_SERVICEOWNER of the
// cluster pdf3 runs in, if it is set, and otherwise the one in the request's Header value.
// It returns "" when neither is known.
func Resolve(configured string, header string) string {
	if configured != "" {
		return configured
	}
	return FromHeader(header)
}

type contextKey struct{}

// WithContext returns ctx carrying the request's service owner.
func WithContext(ctx context.Context, serviceOwner string) context.Context {
	return context.WithValue(ctx, contextKey{}, serviceOwner)
}

// FromContext returns the service owner WithContext put on ctx, or "".
func FromContext(ctx context.Context) string {
	if serviceOwner, ok := ctx.Value(contextKey{}).(string); ok {
		return serviceOwner
	}
	return ""
}
