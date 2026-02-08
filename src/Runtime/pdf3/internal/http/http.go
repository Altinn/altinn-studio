package http

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"altinn.studio/pdf3/internal/telemetry"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

type ProblemDetails struct {
	Type       string         `json:"type,omitempty"`
	Title      string         `json:"title,omitempty"`
	Status     int            `json:"status,omitempty"`
	Detail     string         `json:"detail,omitempty"`
	Instance   string         `json:"instance,omitempty"`
	Extensions map[string]any `json:"extensions,omitempty"`
	// Internal tracing details; not serialized to JSON.
	TraceRejectionReason string `json:"-"`
	TraceRejectionError  error  `json:"-"`
}

func WriteProblemDetails(logger *slog.Logger, w http.ResponseWriter, r *http.Request, statusCode int, problem ProblemDetails) {
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
