package http

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"altinn.studio/pdf3/internal/telemetry"
)

type ProblemDetails struct {
	TraceRejectionError  error          `json:"-"`
	Extensions           map[string]any `json:"extensions,omitempty"`
	Type                 string         `json:"type,omitempty"`
	Title                string         `json:"title,omitempty"`
	Detail               string         `json:"detail,omitempty"`
	Instance             string         `json:"instance,omitempty"`
	TraceRejectionReason string         `json:"-"`
	Status               int            `json:"status,omitempty"`
}

//nolint:nestif // The rejection bookkeeping is intentionally colocated with response encoding.
func WriteProblemDetails(
	logger *slog.Logger,
	w http.ResponseWriter,
	r *http.Request,
	statusCode int,
	problem ProblemDetails,
) {
	if r != nil {
		span := trace.SpanFromContext(r.Context())
		if span.IsRecording() && problem.TraceRejectionReason != "" {
			attrs := []attribute.KeyValue{attribute.String("pdf.request.rejected.reason", problem.TraceRejectionReason)}
			span.SetAttributes(attribute.Bool("pdf.request.rejected", true))
			if problem.TraceRejectionError != nil {
				span.RecordError(problem.TraceRejectionError, trace.WithAttributes(attrs...))
			} else {
				span.AddEvent("pdf.request.rejected", trace.WithAttributes(attrs...))
			}
		}
		if data := telemetry.RequestEventDataFromContext(r.Context()); data != nil {
			data.SetResponseStatus(statusCode)
			if problem.Detail != "" {
				data.SetErrorMessageIfEmpty(problem.Detail)
			}
			if problem.TraceRejectionReason != "" {
				data.SetRejection(problem.TraceRejectionReason, problem.TraceRejectionError)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false) // Don't escape <, >, & for cleaner error messages
	if err := encoder.Encode(problem); err != nil {
		logger.Error("Failed to encode error response", "error", err)
	}
}

func WriteText(logger *slog.Logger, w http.ResponseWriter, statusCode int, body string) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(statusCode)
	if _, err := io.WriteString(w, body); err != nil {
		logger.Error("Failed to write response body", "error", err)
	}
}

func WriteProbe(logger *slog.Logger, w http.ResponseWriter, ready bool) {
	if ready {
		WriteText(logger, w, http.StatusOK, "OK")
		return
	}
	WriteText(logger, w, http.StatusServiceUnavailable, "Shutting down")
}
