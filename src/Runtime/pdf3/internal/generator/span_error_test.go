package generator

import (
	"context"
	"errors"
	"log/slog"
	"testing"

	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"

	"altinn.studio/pdf3/internal/cdp"
	"altinn.studio/pdf3/internal/types"
)

var errCommandFailed = errors.New("command failed")

// failingConnection fails every CDP command.
type failingConnection struct{}

func (failingConnection) SendCommand(context.Context, string, any) (*cdp.CDPResponse, error) {
	return nil, errCommandFailed
}

func (failingConnection) SendCommandBatch(context.Context, []cdp.Command) []*cdp.CommandResponse {
	return nil
}

func (failingConnection) Close() error { return nil }

// TestSpanErrorType_MatchesResponse checks that a failed step's span has the same error.type as
// the error the request is answered with, which the entry span and metrics carry.
func TestSpanErrorType_MatchesResponse(t *testing.T) {
	tests := map[string]struct {
		step func(*browserSession, *workerRequest) error
		want string
	}{
		"set cookies": {(*browserSession).setCookies, "set_cookie_failed"},
		"navigate":    {(*browserSession).navigateToPage, "generation_failed"},
		"print":       {(*browserSession).printPDF, "generation_failed"},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			spans := tracetest.NewSpanRecorder()
			w := &browserSession{
				conn:   failingConnection{},
				tracer: sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(spans)).Tracer("test"),
				logger: slog.New(slog.DiscardHandler),
			}
			responder := make(chan workerResponse, 1)
			req := &workerRequest{
				ctx:       t.Context(),
				responder: responder,
				logger:    slog.New(slog.DiscardHandler),
				request:   types.PdfRequest{Cookies: []types.Cookie{{Name: "c", Value: "v"}}},
			}

			if err := tt.step(w, req); err != nil {
				t.Fatalf("step error = %v", err)
			}
			response := <-responder
			if got := response.Error.ErrorType(); got != tt.want {
				t.Errorf("response error.type = %q, want %q", got, tt.want)
			}
			ended := spans.Ended()
			if len(ended) != 1 {
				t.Fatalf("ended spans = %d, want 1", len(ended))
			}
			var got string
			for _, kv := range ended[0].Attributes() {
				if kv.Key == semconv.ErrorTypeKey {
					got = kv.Value.AsString()
				}
			}
			if got != tt.want {
				t.Errorf("%s span error.type = %q, want %q", ended[0].Name(), got, tt.want)
			}
		})
	}
}

func TestMapCustomError_ErrorType(t *testing.T) {
	if got := mapCustomError(errCommandFailed).ErrorType(); got != "unhandled_browser_error" {
		t.Errorf("error.type = %q, want unhandled_browser_error", got)
	}
}
