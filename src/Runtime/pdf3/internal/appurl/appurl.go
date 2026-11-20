// Package appurl identifies the Altinn app a PDF request renders.
//
// Apps ask for PDFs of their own pages, at https://{org}.apps.{hostname}/{org}/{app}/...
// In a cluster shared by every service owner, the service owner and app are only
// known from this URL.
package appurl

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
)

// App is the service owner and app a request belongs to, in lowercase.
type App struct {
	Org string
	App string
}

var (
	ErrInvalidURL       = errors.New("invalid URL")
	ErrScheme           = errors.New("URL scheme must be https")
	ErrUserInfoOrPort   = errors.New("URL must not contain user info or a port")
	ErrHost             = errors.New("URL host is not an app host")
	ErrPath             = errors.New("URL path must start with /{org}/{app}/")
	ErrOrgMismatch      = errors.New("org in URL host and path differ")
	ErrDotSegment       = errors.New("URL path must not contain dot segments")
	errEmptyAppHostname = errors.New("app hostname must be set")
)

// Parse returns the app that rawURL belongs to. appHostname is the environment's
// hostname, e.g. "tt02.altinn.no" for https://ttd.apps.tt02.altinn.no/ttd/app/.
func Parse(rawURL string, appHostname string) (App, error) {
	if appHostname == "" {
		return App{}, errEmptyAppHostname
	}
	// Browsers read "\" as "/" in https URLs, which Go's parser does not.
	if strings.Contains(rawURL, `\`) {
		return App{}, ErrInvalidURL
	}

	u, err := url.Parse(rawURL)
	if err != nil {
		return App{}, fmt.Errorf("%w: %w", ErrInvalidURL, err)
	}
	if !strings.EqualFold(u.Scheme, "https") {
		return App{}, ErrScheme
	}
	if u.User != nil || u.Port() != "" {
		return App{}, ErrUserInfoOrPort
	}

	host := strings.ToLower(u.Hostname())
	hostOrg, found := strings.CutSuffix(host, ".apps."+strings.ToLower(appHostname))
	if !found || !isName(hostOrg) {
		return App{}, ErrHost
	}

	// Browsers resolve "." and ".." segments, also percent-encoded ones,
	// so /ttd/../nav/ would load another service owner's app.
	path := u.EscapedPath()
	if hasDotSegment(path) {
		return App{}, ErrDotSegment
	}

	// Split the escaped path, as a browser does, so an encoded "/" stays inside its segment.
	segments := strings.Split(strings.ToLower(path), "/")
	// "/ttd/app/..." splits into "", "ttd", "app", ...
	if len(segments) < 4 || segments[0] != "" || !isName(segments[1]) || !isName(segments[2]) {
		return App{}, ErrPath
	}
	if segments[1] != hostOrg {
		return App{}, ErrOrgMismatch
	}

	return App{Org: hostOrg, App: segments[2]}, nil
}

// isName reports whether s is a lowercase DNS label, which is what org and app names are.
func isName(s string) bool {
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

func hasDotSegment(escapedPath string) bool {
	for segment := range strings.SplitSeq(escapedPath, "/") {
		switch strings.ToLower(segment) {
		case ".", "..", "%2e", "%2e.", ".%2e", "%2e%2e":
			return true
		}
	}
	return false
}
