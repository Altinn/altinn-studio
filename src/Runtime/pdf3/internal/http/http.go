package http

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"

	"altinn.studio/pdf3/internal/telemetry"
)

type ProblemDetails struct {
	Extensions           map[string]any `json:"extensions,omitempty"`
	Type                 string         `json:"type,omitempty"`
	Title                string         `json:"title,omitempty"`
	Detail               string         `json:"detail,omitempty"`
	Instance             string         `json:"instance,omitempty"`
	TraceRejectionReason string         `json:"-"`
	Status               int            `json:"status,omitempty"`
}

func WriteProblemDetails(
	logger *slog.Logger,
	w http.ResponseWriter,
	r *http.Request,
	statusCode int,
	problem ProblemDetails,
) {
	if r != nil && problem.TraceRejectionReason != "" {
		telemetry.RequestAttributesFromContext(r.Context()).SetRejection(problem.TraceRejectionReason)
	}

	ctx := context.Background()
	if r != nil {
		ctx = r.Context()
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false) // Don't escape <, >, & for cleaner error messages
	if err := encoder.Encode(problem); err != nil {
		logger.ErrorContext(ctx, "Failed to encode error response", "error", err)
	}
}

func WriteText(ctx context.Context, logger *slog.Logger, w http.ResponseWriter, statusCode int, body string) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(statusCode)
	if _, err := io.WriteString(w, body); err != nil {
		logger.ErrorContext(ctx, "Failed to write response body", "error", err)
	}
}

func WriteProbe(ctx context.Context, logger *slog.Logger, w http.ResponseWriter, ready bool) {
	if ready {
		WriteText(ctx, logger, w, http.StatusOK, "OK")
		return
	}
	WriteText(ctx, logger, w, http.StatusServiceUnavailable, "Shutting down")
}
