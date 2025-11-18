package http

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

type ProblemDetails struct {
	Type       string         `json:"type,omitempty"`
	Title      string         `json:"title,omitempty"`
	Status     int            `json:"status,omitempty"`
	Detail     string         `json:"detail,omitempty"`
	Instance   string         `json:"instance,omitempty"`
	Extensions map[string]any `json:"extensions,omitempty"`
}

func WriteProblemDetails(logger *slog.Logger, w http.ResponseWriter, statusCode int, problem ProblemDetails) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false) // Don't escape <, >, & for cleaner error messages
	if err := encoder.Encode(problem); err != nil {
		logger.Error("Failed to encode error response", "error", err)
	}
}
