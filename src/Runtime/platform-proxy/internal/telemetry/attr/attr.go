// Package attr names the attributes the platform proxy puts on its spans, metrics and log records:
// the OpenTelemetry semantic conventions it sets itself and its own under altinn.platform_proxy.
//
// A concept has one name on every signal. No attribute name is a string literal at a call site.
package attr

import sharedattr "altinn.studio/common/telemetry/attr"

// Semantic conventions the proxy sets on log records. Spans and metrics take them from semconv.
const (
	ErrorType = "error.type"
	HTTPRoute = "http.route"
	// UpstreamAddress is the platform the proxy forwards to.
	UpstreamAddress = "server.address"
)

// ServiceOwner is the runtime cluster's service owner, the issuer of its tokens.
const ServiceOwner = sharedattr.ServiceOwner

// Error is the key for an error value on a log record. The OpenTelemetry log bridge moves an
// error to the record's exception.message and exception.type, so it is never exported under this
// key.
const Error = "error"

const prefix = "altinn.platform_proxy."

const (
	// Component is the part of the process that logs.
	Component = prefix + "component"
	// AccessToken is where the request's platform access token came from, one of the AccessToken*
	// values. It goes on the request's span and on http.server.request.duration.
	AccessToken = prefix + "access_token"
	// SigningKeyID is the thumbprint of the certificate the proxy signs tokens with. It is public.
	SigningKeyID = prefix + "signing.key_id"
	// SigningKeyNotBefore and SigningKeyNotAfter are when that certificate is valid.
	SigningKeyNotBefore = prefix + "signing.not_before"
	SigningKeyNotAfter  = prefix + "signing.not_after"
)

// The values of AccessToken.
const (
	// AccessTokenAdded means the proxy added a token, since the request had none.
	AccessTokenAdded = "added"
	// AccessTokenFromApp means the app sent its own token, and the proxy passed it on.
	AccessTokenFromApp = "from_app"
)
