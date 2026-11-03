// Package enginetest is an in-memory workflow engine for tests. It keeps the engine's rules that the operator relies
// on: idempotent enqueue that ignores the context, the initial state, label filters with the newest first, and
// cancellation.
package enginetest

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
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
	hash    [sha256.Size]byte
}

type Engine struct {
	Server    *httptest.Server
	now       func() time.Time
	workflows map[string]*Workflow
	// AtCapacity makes enqueue answer 429.
	AtCapacity bool
	// FailReads makes reads of workflows answer 500.
	FailReads bool
	mu        sync.Mutex
}

// New starts a fake engine. now gives the engine's clock.
func New(now func() time.Time) *Engine {
	e := &Engine{now: now, workflows: make(map[string]*Workflow)}
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
	hash, err := hashWithoutContext(request)
	if err != nil {
		problem.WriteJSON(w, r, http.StatusBadRequest, map[string]string{"detail": err.Error()})
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
		if existing.hash != hash {
			problem.WriteJSON(w, r, http.StatusConflict, map[string]string{"detail": "idempotency conflict"})
			return
		}
		problem.WriteJSON(w, r, http.StatusOK, accepted(existing))
		return
	}

	now := e.now()
	workflow := &Workflow{
		Request: request,
		hash:    hash,
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
	e.workflows[workflow.State.DatabaseID] = workflow
	problem.WriteJSON(w, r, http.StatusCreated, accepted(workflow))
}

// hashWithoutContext hashes the request as the engine does: everything but the context. The round trip through a
// map sorts the keys, so the hash does not depend on field order.
func hashWithoutContext(request engine.EnqueueRequest) ([sha256.Size]byte, error) {
	request.Context = nil
	data, err := json.Marshal(request)
	if err != nil {
		return [sha256.Size]byte{}, fmt.Errorf("encode request: %w", err)
	}
	var canonical any
	if decodeErr := json.Unmarshal(data, &canonical); decodeErr != nil {
		return [sha256.Size]byte{}, fmt.Errorf("decode request: %w", decodeErr)
	}
	if data, err = json.Marshal(canonical); err != nil {
		return [sha256.Size]byte{}, fmt.Errorf("encode request: %w", err)
	}
	return sha256.Sum256(data), nil
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
	workflow, ok := e.workflows[r.PathValue("id")]
	if !ok || workflow.State.Namespace != r.PathValue("namespace") {
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
	for _, workflow := range e.workflows {
		if workflow.State.Namespace == r.PathValue("namespace") && hasLabels(workflow.State.Labels, filters) {
			found = append(found, workflow.State)
		}
	}
	// The newest first, as the engine lists them, and at most a page.
	slices.SortFunc(found, func(a, b engine.Workflow) int { return b.CreatedAt.Compare(a.CreatedAt) })
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
	workflow, ok := e.workflows[r.PathValue("id")]
	if !ok || workflow.State.Namespace != r.PathValue("namespace") {
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

// Workflows returns a copy of every stored workflow.
func (e *Engine) Workflows() []Workflow {
	e.mu.Lock()
	defer e.mu.Unlock()
	workflows := make([]Workflow, 0, len(e.workflows))
	for _, workflow := range e.workflows {
		workflows = append(workflows, *workflow)
	}
	return workflows
}

// Workflow returns a copy of one workflow.
func (e *Engine) Workflow(id string) (Workflow, bool) {
	e.mu.Lock()
	defer e.mu.Unlock()
	workflow, ok := e.workflows[id]
	if !ok {
		return Workflow{}, false
	}
	return *workflow, true
}

// Update changes a stored workflow, as the engine would while it runs it.
func (e *Engine) Update(id string, change func(*engine.Workflow)) {
	e.mu.Lock()
	defer e.mu.Unlock()
	workflow, ok := e.workflows[id]
	if !ok {
		panic("no workflow " + id)
	}
	change(&workflow.State)
}

// Delete removes a workflow, as retention does.
func (e *Engine) Delete(id string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	delete(e.workflows, id)
}

// Reach sets the workflow's steps before operationID to Completed and that step to status, as if the engine had run
// the workflow that far. The workflow's own status follows the step.
func (e *Engine) Reach(id string, operationID string, status engine.Status) {
	e.Update(id, func(workflow *engine.Workflow) {
		reached := false
		for i := range workflow.Steps {
			step := &workflow.Steps[i]
			switch {
			case step.OperationID == operationID:
				step.Status = status
				reached = true
			case !reached:
				step.Status = engine.StatusCompleted
			default:
				step.Status = engine.StatusEnqueued
			}
		}
		switch status {
		case engine.StatusCompleted:
			workflow.OverallStatus = engine.StatusProcessing
			if operationID == workflow.Steps[len(workflow.Steps)-1].OperationID {
				workflow.OverallStatus = engine.StatusCompleted
			}
		case engine.StatusEnqueued, engine.StatusProcessing, engine.StatusRequeued, engine.StatusWaiting,
			engine.StatusHeld, engine.StatusFailed, engine.StatusCanceled, engine.StatusDependencyFailed,
			engine.StatusAbandoned:
			workflow.OverallStatus = status
		}
	})
}
