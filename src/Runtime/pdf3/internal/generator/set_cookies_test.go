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

// TestSetCookies_PassesHttpOnlyToChrome checks that a cookie's httpOnly in the request body reaches
// Chrome, and that a cookie without it gets Chrome's default. Apps send their token cookie with
// httpOnly so that script on the page cannot read it, and the cookies the page reads without it.
func TestSetCookies_PassesHttpOnlyToChrome(t *testing.T) {
	body := `{
		"url": "http://app.example/",
		"cookies": [
			{"name": "AltinnStudioRuntime", "value": "token", "domain": "app.example", "sameSite": "Lax", "httpOnly": true},
			{"name": "altinn-telemetry-traceparent", "value": "trace", "domain": "app.example", "sameSite": "Lax", "httpOnly": false},
			{"name": "unset", "value": "value", "domain": "app.example", "sameSite": "Lax"}
		]
	}`

	// The proxy decodes the request and encodes it again for the worker, which decodes it.
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
	if !ok || len(cookies) != 3 {
		t.Fatalf("cookies sent to Chrome = %#v, want 3", params["cookies"])
	}
	want := map[string]any{
		"AltinnStudioRuntime":          true,
		"altinn-telemetry-traceparent": false,
		"unset":                        nil,
	}
	for _, cookie := range cookies {
		name, _ := cookie["name"].(string) //nolint:errcheck // A missing name fails the lookup below.
		wantHTTPOnly, known := want[name]
		if !known {
			t.Fatalf("unexpected cookie %q", name)
		}
		if got := cookie["httpOnly"]; got != wantHTTPOnly {
			t.Errorf("cookie %q httpOnly = %v, want %v", name, got, wantHTTPOnly)
		}
	}
}
