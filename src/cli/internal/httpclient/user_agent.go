// Package httpclient contains shared HTTP client helpers.
package httpclient

import (
	"net/http"

	"altinn.studio/studioctl/internal/config"
)

// UserAgent returns the studioctl User-Agent value for a CLI version.
func UserAgent(version config.Version) string {
	return version.UserAgent()
}

// SetUserAgent sets the studioctl User-Agent header on req.
func SetUserAgent(req *http.Request, version config.Version) {
	req.Header.Set("User-Agent", UserAgent(version))
}
