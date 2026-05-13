// Package httpclient contains shared HTTP client helpers.
package httpclient

import (
	"net/http"

	"altinn.studio/studioctl/internal/config"
)

// SetUserAgent sets the studioctl User-Agent header on req.
func SetUserAgent(req *http.Request, version config.Version) {
	req.Header.Set("User-Agent", version.UserAgent())
}
