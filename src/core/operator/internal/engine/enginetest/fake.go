// Package enginetest stores workflows for tests behind the HTTP API of the engine. It runs no steps and copies none of
// the engine rules. A test sets the statuses that it needs with Update or a switch. The integration test in cmd/ checks
// the operator against the real engine.
package enginetest

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/problem"
)

// Workflow is a stored workflow and the request that made it.
type Workflow struct {
	key     string
	Request engine.EnqueueRequest
	State   engine.Workflow
}

type Engine struct {
	Server *httptest.Server
	now    func() time.Time
	// workflows are in the order of their enqueue, which lists them newest first.
	workflows []*Workflow
	// AtCapacity makes enqueue answer 429.
	AtCapacity bool
	// FailReads makes reads of workflows answer 500.
	FailReads bool
	// Conflict makes an enqueue with a key that exists answer 409, as the engine does for another request.
	Conflict bool
	mu       sync.Mutex
}

// New starts a fake engine. now gives the engine's clock.
func New(now func() time.Time) *Engine {
	e := &Engine{now: now}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/{namespace}/workflows", e.enqueue)
	mux.HandleFunc("GET /api/v1/{namespace}/workflows", e.list)
	mux.HandleFunc("GET /api/v1/{namespace}/workflows/{id}", e.get)
	mux.HandleFunc("POST /api/v1/{namespace}/workflows/{id}/cancel", e.cancel)
	e.Server = httptest.NewServer(mux)
	return e
}

func (e *Engine) Close() {
	e.Server.Close()
}

func (e *Engine) URL() string {
	return e.Server.URL
}

func (e *Engine) enqueue(w http.ResponseWriter, r *http.Request) {
	namespace := r.PathValue("namespace")
	key := r.URL.Query().Get("idempotencyKey")
	var request engine.EnqueueRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || key == "" || len(request.Workflows) != 1 {
		problem.WriteJSON(w, r, http.StatusBadRequest, map[string]string{"detail": "bad request"})
		return
	}

	e.mu.Lock()
	defer e.mu.Unlock()
	if e.AtCapacity {
		problem.WriteJSON(w, r, http.StatusTooManyRequests, map[string]string{"detail": "at capacity"})
		return
	}
	for _, existing := range e.workflows {
		if existing.State.Namespace != namespace || existing.key != key {
			continue
		}
		if e.Conflict {
			problem.WriteJSON(w, r, http.StatusConflict, map[string]string{"detail": "idempotency conflict"})
			return
		}
		problem.WriteJSON(w, r, http.StatusOK, accepted(existing))
		return
	}

	now := e.now()
	workflow := &Workflow{
		Request: request,
		key:     key,
		State: engine.Workflow{
			DatabaseID:    uuid.NewString(),
			Namespace:     namespace,
			CreatedAt:     now,
			UpdatedAt:     &now,
			Labels:        request.Labels,
			InitialState:  request.Workflows[0].State,
			OverallStatus: engine.StatusEnqueued,
		},
	}
	for i, step := range request.Workflows[0].Steps {
		workflow.State.Steps = append(workflow.State.Steps, engine.Step{
			OperationID:     step.OperationID,
			ProcessingOrder: i,
			Status:          engine.StatusEnqueued,
		})
	}
	e.workflows = append(e.workflows, workflow)
	problem.WriteJSON(w, r, http.StatusCreated, accepted(workflow))
}

func (e *Engine) findLocked(namespace, id string) *Workflow {
	index := slices.IndexFunc(e.workflows, func(w *Workflow) bool { return w.State.DatabaseID == id })
	if index < 0 || (namespace != "" && e.workflows[index].State.Namespace != namespace) {
		return nil
	}
	return e.workflows[index]
}

func accepted(workflow *Workflow) map[string]any {
	return map[string]any{"workflows": []map[string]string{{
		"databaseId": workflow.State.DatabaseID,
		"namespace":  workflow.State.Namespace,
	}}}
}

func (e *Engine) get(w http.ResponseWriter, r *http.Request) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.FailReads {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	workflow := e.findLocked(r.PathValue("namespace"), r.PathValue("id"))
	if workflow == nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	problem.WriteJSON(w, r, http.StatusOK, workflow.State)
}

func (e *Engine) list(w http.ResponseWriter, r *http.Request) {
	filters := map[string]string{}
	for _, label := range r.URL.Query()["label"] {
		if key, value, ok := strings.Cut(label, ":"); ok {
			filters[key] = value
		}
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.FailReads {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	var found []engine.Workflow
	for _, workflow := range slices.Backward(e.workflows) {
		if workflow.State.Namespace == r.PathValue("namespace") && hasLabels(workflow.State.Labels, filters) {
			found = append(found, workflow.State)
		}
	}
	if size, err := strconv.Atoi(r.URL.Query().Get("pageSize")); err == nil && size > 0 && len(found) > size {
		found = found[:size]
	}
	if len(found) == 0 {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	problem.WriteJSON(
		w,
		r,
		http.StatusOK,
		map[string]any{"data": found, "pageSize": len(found), "totalCount": len(found)},
	)
}

func hasLabels(labels, filters map[string]string) bool {
	for key, value := range filters {
		if labels[key] != value {
			return false
		}
	}
	return true
}

func (e *Engine) cancel(w http.ResponseWriter, r *http.Request) {
	e.mu.Lock()
	defer e.mu.Unlock()
	workflow := e.findLocked(r.PathValue("namespace"), r.PathValue("id"))
	if workflow == nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if workflow.State.OverallStatus.Terminal() {
		problem.WriteJSON(w, r, http.StatusConflict, map[string]string{"detail": "terminal"})
		return
	}
	if workflow.State.CancellationRequestedAt != nil {
		problem.WriteJSON(w, r, http.StatusOK, map[string]any{"workflowId": workflow.State.DatabaseID})
		return
	}
	now := e.now()
	workflow.State.CancellationRequestedAt = &now
	problem.WriteJSON(w, r, http.StatusAccepted, map[string]any{"workflowId": workflow.State.DatabaseID})
}

func (e *Engine) Workflows() []Workflow {
	e.mu.Lock()
	defer e.mu.Unlock()
	workflows := make([]Workflow, 0, len(e.workflows))
	for _, workflow := range e.workflows {
		workflows = append(workflows, *workflow)
	}
	return workflows
}

func (e *Engine) Workflow(id string) (Workflow, bool) {
	e.mu.Lock()
	defer e.mu.Unlock()
	workflow := e.findLocked("", id)
	if workflow == nil {
		return Workflow{}, false
	}
	return *workflow, true
}

// Update changes a stored workflow, for example its status, for a test that needs a run in that state.
func (e *Engine) Update(id string, change func(*engine.Workflow)) {
	e.mu.Lock()
	defer e.mu.Unlock()
	workflow := e.findLocked("", id)
	if workflow == nil {
		panic("no workflow " + id)
	}
	change(&workflow.State)
}
