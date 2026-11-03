// Package problem writes the operator's HTTP answers: JSON, and errors as RFC 9457 problem details, the error format
// of the run API and the callback API.
package problem

import (
	"encoding/json"
	"net/http"

	"altinn.studio/core-operator/internal/logging"
)

const ContentType = "application/problem+json"

// Details is an RFC 9457 problem. Type is left out, which means about:blank: the status code says what happened.
type Details struct {
	Title  string `json:"title"`
	Detail string `json:"detail,omitempty"`
	Status int    `json:"status"`
}

// Write answers with status and a problem whose title is the status text.
func Write(w http.ResponseWriter, r *http.Request, status int, detail string) {
	w.Header().Set("X-Content-Type-Options", "nosniff")
	write(w, r, status, ContentType, Details{Title: http.StatusText(status), Status: status, Detail: detail})
}

// WriteJSON answers with status and body as JSON.
func WriteJSON(w http.ResponseWriter, r *http.Request, status int, body any) {
	write(w, r, status, "application/json", body)
}

func write(w http.ResponseWriter, r *http.Request, status int, contentType string, body any) {
	data, err := json.Marshal(body)
	if err != nil {
		logging.FromContext(r.Context()).Error(err, "Encode response failed", "path", r.URL.Path)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(status)
	if _, err := w.Write(append(data, '\n')); err != nil {
		// The status line is out, so only the log can tell. It is usually a client that went away.
		logging.FromContext(r.Context()).V(1).Info("Write response failed", "path", r.URL.Path, "error", err.Error())
	}
}
