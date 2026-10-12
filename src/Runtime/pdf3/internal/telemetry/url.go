package telemetry

import (
	"net/url"
	"strings"
)

// RedactURL keeps a URL's scheme, host and path for telemetry, and leaves out user
// information, the query and the fragment, which can carry credentials or tokens. It returns
// "" for anything that isn't an absolute URL.
func RedactURL(raw string) string {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || u.Scheme == "" || u.Host == "" {
		return ""
	}
	redacted := url.URL{Scheme: u.Scheme, Host: u.Host, Path: u.Path, RawPath: u.RawPath}
	return redacted.String()
}
