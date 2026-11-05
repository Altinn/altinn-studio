// Package jobhosttest is a job host for tests: one run per server, as in a pod.
package jobhosttest

import (
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"

	"altinn.studio/core-operator/internal/jobhost"
	"altinn.studio/core-operator/internal/problem"
)

// MaxArchiveBytes is the largest archive the fake accepts, as the job host does.
const MaxArchiveBytes = 50 << 20

type JobHost struct {
	Server *httptest.Server
	status *jobhost.Status
	result string
	// RunID, Command and Archive are what the operator started.
	RunID   string
	Command string
	Archive []byte
	Starts  int
	// Fetches counts the requests for the result of the ended run.
	Fetches int
	mu      sync.Mutex
}

func New() *JobHost {
	host := &JobHost{}
	mux := http.NewServeMux()
	mux.HandleFunc("PUT /runs/{id}", host.start)
	mux.HandleFunc("GET /runs/{id}", host.getStatus)
	mux.HandleFunc("GET /runs/{id}/result", host.getResult)
	host.Server = httptest.NewServer(mux)
	return host
}

func (h *JobHost) Close() {
	h.Server.Close()
}

// Address returns the IP and port the operator calls, in place of the pod IP and jobhost.Port.
func (h *JobHost) Address() (string, int) {
	host, port, err := net.SplitHostPort(h.Server.Listener.Addr().String())
	if err != nil {
		panic(err)
	}
	number, err := strconv.Atoi(port)
	if err != nil {
		panic(err)
	}
	return host, number
}

// Finish ends the run with the status, and result as the JSON that a fetch gets.
func (h *JobHost) Finish(status jobhost.Status, result string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.status = &status
	h.result = result
}

func (h *JobHost) Snapshot() (runID, command string, archive []byte, starts int) {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.RunID, h.Command, h.Archive, h.Starts
}

// Claimed returns the id of the run that claimed the job host, or an empty string.
func (h *JobHost) Claimed() string {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.RunID
}

// FetchCount returns how many times a client fetched the result.
func (h *JobHost) FetchCount() int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.Fetches
}

func (h *JobHost) start(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("Content-Type") != "application/gzip" {
		problem.Write(w, r, http.StatusUnsupportedMediaType, "The content type must be application/gzip.")
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, MaxArchiveBytes+1))
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.RunID != "" && h.RunID != r.PathValue("id") {
		problem.Write(w, r, http.StatusConflict, "Another run has claimed this job host.")
		return
	}
	if h.RunID == "" {
		switch {
		case len(body) > MaxArchiveBytes:
			problem.Write(w, r, http.StatusRequestEntityTooLarge, "The archive is too large.")
			return
		case len(body) < 2 || body[0] != 0x1f || body[1] != 0x8b:
			problem.Write(w, r, http.StatusBadRequest, "The body is not a gzip archive.")
			return
		}
		h.RunID = r.PathValue("id")
		h.Command = r.URL.Query().Get("command")
		h.Archive = body
	}
	h.Starts++
	problem.WriteJSON(w, r, http.StatusAccepted, map[string]string{"runId": h.RunID, "status": h.statusLocked().Status})
}

func (h *JobHost) statusLocked() jobhost.Status {
	if h.status == nil {
		return jobhost.Status{Status: jobhost.StatusRunning}
	}
	return *h.status
}

func (h *JobHost) getStatus(w http.ResponseWriter, r *http.Request) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.RunID == "" || h.RunID != r.PathValue("id") {
		problem.Write(w, r, http.StatusNotFound, "This run has not claimed the job host.")
		return
	}
	problem.WriteJSON(w, r, http.StatusOK, h.statusLocked())
}

func (h *JobHost) getResult(w http.ResponseWriter, r *http.Request) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.RunID == "" || h.RunID != r.PathValue("id") {
		problem.Write(w, r, http.StatusNotFound, "This run has not claimed the job host.")
		return
	}
	if h.status == nil {
		problem.WriteJSON(w, r, http.StatusOK, jobhost.Status{Status: jobhost.StatusRunning})
		return
	}
	h.Fetches++
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if _, err := io.WriteString(w, h.result); err != nil {
		return
	}
}
