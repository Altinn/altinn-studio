package generator

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"strings"
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

//nolint:ireturn // Implements cdp.Connection.
func (c failingConnection) Session(string) cdp.Commander { return c }

func (failingConnection) Close() error { return nil }

// TestSpanErrorType_MatchesResponse checks that a failed step's span has the same error.type as
// the error the request is answered with, which the entry span and metrics carry.
func TestSpanErrorType_MatchesResponse(t *testing.T) {
	tests := map[string]struct {
		step func(*browserSession, *workerRequest) error
		want string
	}{
		"set cookies": {(*browserSession).setCookies, "set_cookie_failed"},
		"navigate": {func(w *browserSession, req *workerRequest) error {
			return w.navigateToPage(req, w.conn)
		}, "generation_failed"},
		"print": {func(w *browserSession, req *workerRequest) error {
			return w.printPDF(req, w.conn)
		}, "generation_failed"},
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

// evaluatingConnection answers Runtime.evaluate with result.
type evaluatingConnection struct {
	failingConnection

	result any
}

func (c evaluatingConnection) SendCommand(context.Context, string, any) (*cdp.CDPResponse, error) {
	return &cdp.CDPResponse{Result: c.result}, nil
}

// TestWaitForPageLoad_FailedWaitAnswersOnce checks that a page-load wait that fails answers the
// request with element_not_ready, marks its span the same, and returns no error, so
// pdf.session.process doesn't record it again as an unhandled browser error.
func TestWaitForPageLoad_FailedWaitAnswersOnce(t *testing.T) {
	tests := map[string]any{
		"never loads": map[string]any{"result": map[string]any{"type": "boolean", "value": false}},
		"exception": map[string]any{"exceptionDetails": map[string]any{
			"text":      "Uncaught",
			"exception": map[string]any{"description": "Error: boom"},
		}},
	}
	for name, result := range tests {
		t.Run(name, func(t *testing.T) {
			spans := tracetest.NewSpanRecorder()
			w := &browserSession{
				conn:   evaluatingConnection{result: result},
				tracer: sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(spans)).Tracer("test"),
				logger: slog.New(slog.DiscardHandler),
			}
			responder := make(chan workerResponse, 1)
			req := &workerRequest{ctx: t.Context(), responder: responder, logger: slog.New(slog.DiscardHandler)}

			if err := w.waitForPageLoad(req, w.conn, 100); err != nil {
				t.Fatalf("waitForPageLoad() = %v, want nil once the request is answered", err)
			}
			if got := (<-responder).Error.ErrorType(); got != "element_not_ready" {
				t.Errorf("response error.type = %q, want element_not_ready", got)
			}
			var got string
			for _, kv := range spans.Ended()[0].Attributes() {
				if kv.Key == semconv.ErrorTypeKey {
					got = kv.Value.AsString()
				}
			}
			if got != "element_not_ready" {
				t.Errorf("pdf.session.wait error.type = %q, want element_not_ready", got)
			}
		})
	}
}

// TestFailedWait_LogsDetailsAtInfo checks that a failed wait logs its details at INFO: the
// failed request logs its one error with the error the wait answers it with.
func TestFailedWait_LogsDetailsAtInfo(t *testing.T) {
	notLoaded := evaluatingConnection{result: map[string]any{"result": map[string]any{"value": false}}}
	tests := map[string]struct {
		wait func(*browserSession, *workerRequest) error
		conn cdp.Connection
		msg  string
	}{
		"page load command fails": {
			wait: func(w *browserSession, req *workerRequest) error { return w.waitForPageLoad(req, w.conn, 100) },
			conn: failingConnection{},
			msg:  "Failed to wait for page load event",
		},
		"page never loads": {
			wait: func(w *browserSession, req *workerRequest) error { return w.waitForPageLoad(req, w.conn, 100) },
			conn: notLoaded,
			msg:  "Wait condition not satisfied within timeout",
		},
		"element command fails": {
			wait: func(w *browserSession, req *workerRequest) error {
				return w.waitForElement(req, w.conn, "#ready", 100, false, false)
			},
			conn: failingConnection{},
			msg:  "Failed to wait for element",
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			var logs bytes.Buffer
			w := &browserSession{
				conn:   tt.conn,
				tracer: sdktrace.NewTracerProvider().Tracer("test"),
				logger: slog.New(slog.NewTextHandler(&logs, nil)),
			}
			req := &workerRequest{
				ctx:       t.Context(),
				responder: make(chan workerResponse, 1),
				logger:    slog.New(slog.DiscardHandler),
			}
			if err := tt.wait(w, req); err != nil {
				t.Logf("wait error = %v", err)
			}

			got := logs.String()
			if !strings.Contains(got, `level=INFO msg="`+tt.msg+`"`) {
				t.Errorf("logs = %q, want %q at INFO", got, tt.msg)
			}
			if strings.Contains(got, "level=WARN") || strings.Contains(got, "level=ERROR") {
				t.Errorf("logs = %q, want nothing above INFO", got)
			}
		})
	}
}
