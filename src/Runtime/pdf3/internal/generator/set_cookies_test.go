package generator

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"testing"

	sdktrace "go.opentelemetry.io/otel/sdk/trace"

	"altinn.studio/pdf3/internal/cdp"
	"altinn.studio/pdf3/internal/types"
)

// cookieConnection records the parameters of the Storage.setCookies command it is sent.
type cookieConnection struct {
	failingConnection

	setCookies any
}

func (c *cookieConnection) SendCommand(_ context.Context, method string, params any) (*cdp.CDPMessage, error) {
	if method != "Storage.setCookies" {
		return nil, fmt.Errorf("%w: %s", errUnexpectedCommand, method)
	}
	c.setCookies = params
	return &cdp.CDPMessage{}, nil
}

// cookiesSentToChrome sends a request body through the steps that read it, and returns the
// cookies Chrome is asked to set, by name. The proxy decodes the request and encodes it again for
// the worker, which decodes it and sets the cookies.
func cookiesSentToChrome(t *testing.T, body string) map[string]map[string]any {
	t.Helper()

	var proxied types.PdfRequest
	if err := json.Unmarshal([]byte(body), &proxied); err != nil {
		t.Fatalf("proxy decode: %v", err)
	}
	if err := proxied.Validate(); err != nil {
		t.Fatalf("validate: %v", err)
	}
	forwarded, err := json.Marshal(proxied)
	if err != nil {
		t.Fatalf("proxy encode: %v", err)
	}
	var request types.PdfRequest
	if err := json.Unmarshal(forwarded, &request); err != nil {
		t.Fatalf("worker decode: %v", err)
	}

	conn := &cookieConnection{}
	w := &browserSession{
		conn:   conn,
		tracer: sdktrace.NewTracerProvider().Tracer("test"),
		logger: slog.New(slog.DiscardHandler),
	}
	responder := make(chan workerResponse, 1)
	req := &workerRequest{
		ctx:              t.Context(),
		responder:        responder,
		logger:           slog.New(slog.DiscardHandler),
		browserContextID: "context",
		request:          request,
	}

	if err := w.setCookies(req); err != nil {
		t.Fatalf("setCookies error = %v", err)
	}
	select {
	case response := <-responder:
		t.Fatalf("setCookies answered the request with %v", response.Error)
	default:
	}

	params, ok := conn.setCookies.(map[string]any)
	if !ok {
		t.Fatalf("Storage.setCookies params = %#v", conn.setCookies)
	}
	cookies, ok := params["cookies"].([]map[string]any)
	if !ok || len(cookies) != len(request.Cookies) {
		t.Fatalf("cookies sent to Chrome = %#v, want %d", params["cookies"], len(request.Cookies))
	}
	byName := make(map[string]map[string]any, len(cookies))
	for _, cookie := range cookies {
		name, _ := cookie["name"].(string) //nolint:errcheck // A missing name fails the lookups in the tests.
		byName[name] = cookie
	}
	return byName
}

// TestSetCookies_PassesHttpOnlyToChrome checks that a cookie's httpOnly in the request body reaches
// Chrome, and that a cookie without it gets Chrome's default. Apps send their token cookie with
// httpOnly so that script on the page cannot read it, and the cookies the page reads without it.
func TestSetCookies_PassesHttpOnlyToChrome(t *testing.T) {
	cookies := cookiesSentToChrome(t, `{
		"url": "http://app.example/",
		"cookies": [
			{"name": "AltinnStudioRuntime", "value": "token", "domain": "app.example", "sameSite": "Lax", "httpOnly": true},
			{"name": "altinn-telemetry-traceparent", "value": "trace", "domain": "app.example", "sameSite": "Lax", "httpOnly": false},
			{"name": "unset", "value": "value", "domain": "app.example", "sameSite": "Lax"}
		]
	}`)

	want := map[string]any{
		"AltinnStudioRuntime":          true,
		"altinn-telemetry-traceparent": false,
		"unset":                        nil,
	}
	for name, wantHTTPOnly := range want {
		if got := cookies[name]["httpOnly"]; got != wantHTTPOnly {
			t.Errorf("cookie %q httpOnly = %v, want %v", name, got, wantHTTPOnly)
		}
	}
}

// TestSetCookies_SecureFollowsPage checks that a cookie without secure is Secure when the page or
// the cookie's own url is https, and that a cookie's secure in the request is kept. Apps leave
// secure out, and their pages are https in clusters and http locally.
func TestSetCookies_SecureFollowsPage(t *testing.T) {
	tests := map[string]struct {
		want    map[string]any
		pageURL string
	}{
		"https page": {
			pageURL: "https://ttd.apps.tt02.altinn.no/ttd/app/",
			want: map[string]any{
				"unset":         true,
				"secure false":  false,
				"secure true":   true,
				"http url":      nil,
				"https url":     true,
				"uppercase url": true,
			},
		},
		"http page": {
			pageURL: "http://local.altinn.cloud:8000/ttd/app/",
			want: map[string]any{
				"unset":         nil,
				"secure false":  false,
				"secure true":   true,
				"http url":      nil,
				"https url":     true,
				"uppercase url": true,
			},
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			cookies := cookiesSentToChrome(t, `{
				"url": "`+tt.pageURL+`",
				"cookies": [
					{"name": "unset", "value": "v", "domain": "app.example", "sameSite": "Lax"},
					{"name": "secure false", "value": "v", "domain": "app.example", "sameSite": "Lax", "secure": false},
					{"name": "secure true", "value": "v", "domain": "app.example", "sameSite": "Lax", "secure": true},
					{"name": "http url", "value": "v", "url": "http://app.example/", "sameSite": "Lax"},
					{"name": "https url", "value": "v", "url": "https://app.example/", "sameSite": "Lax"},
					{"name": "uppercase url", "value": "v", "url": "HTTPS://app.example/", "sameSite": "Lax"}
				]
			}`)

			for cookieName, wantSecure := range tt.want {
				if got := cookies[cookieName]["secure"]; got != wantSecure {
					t.Errorf("cookie %q secure = %v, want %v", cookieName, got, wantSecure)
				}
			}
		})
	}
}
