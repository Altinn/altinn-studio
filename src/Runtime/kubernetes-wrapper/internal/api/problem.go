package api

import (
	"encoding/json"
	"fmt"
	"net/http"
)

//nolint:govet // String-heavy response model; fieldalignment suggestion is not useful here.
type problemDetails struct {
	Status   int    `json:"status,omitempty"`
	Type     string `json:"type,omitempty"`
	Title    string `json:"title,omitempty"`
	Detail   string `json:"detail,omitempty"`
	Instance string `json:"instance,omitempty"`
}

func writeProblem(w http.ResponseWriter, r *http.Request, status int, title string, detail string) {
	response := problemDetails{
		Status:   status,
		Type:     "about:blank",
		Title:    title,
		Detail:   detail,
		Instance: r.URL.Path,
	}
	if err := writeJSON(w, status, response); err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		return fmt.Errorf("encode json response: %w", err)
	}
	return nil
}
