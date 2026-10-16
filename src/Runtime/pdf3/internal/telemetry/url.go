package telemetry

import (
	"net/url"
	"regexp"
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

// embeddedURL matches an http, https, ws or wss URL in free text, up to whitespace, a quote or a
// bracket, which end URLs in messages and stack traces such as "at f (https://host/app.js:1:2)".
var embeddedURL = regexp.MustCompile(`(?i)\b(?:https?|wss?)://[^\s"'<>()\[\]{}]+`)

// redactedURL replaces a URL in free text that RedactURL can't parse.
const redactedURL = "[url]"

// RedactURLsInText replaces each URL in text with its RedactURL form, without user
// information, query or fragment.
func RedactURLsInText(text string) string {
	return embeddedURL.ReplaceAllStringFunc(text, func(match string) string {
		if redacted := RedactURL(match); redacted != "" {
			return redacted
		}
		return redactedURL
	})
}
