// Package problem writes the HTTP answers of the operator as JSON. It writes errors as RFC 9457 problem details, which
// is the error format of the run API and the callback API.
package problem

import (
	"encoding/json"
	"net/http"

	"altinn.studio/core-operator/internal/logging"
)

const ContentType = "application/problem+json"

// Details is an RFC 9457 problem. It has no Type, which means about:blank. The status code tells what happened. Reason
// is an extension member with a code for programs.
type Details struct {
	Title  string `json:"title"`
	Detail string `json:"detail,omitempty"`
	Reason string `json:"reason,omitempty"`
	Status int    `json:"status"`
}

// Write answers with status and a problem whose title is the status text.
func Write(w http.ResponseWriter, r *http.Request, status int, detail string) {
	WriteDetails(w, r, Details{Status: status, Detail: detail})
}

func WriteDetails(w http.ResponseWriter, r *http.Request, details Details) {
	w.Header().Set("X-Content-Type-Options", "nosniff")
	details.Title = http.StatusText(details.Status)
	write(w, r, details.Status, ContentType, details)
}

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
		// The server sent the status line, so only the log can show the error. Usually the client closed the
		// connection.
		logging.FromContext(r.Context()).V(1).Info("Write response failed", "path", r.URL.Path, "error", err.Error())
	}
}
