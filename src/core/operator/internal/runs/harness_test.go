package runs

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"altinn.studio/core-operator/internal/callbacks"
	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/engine/enginetest"
	"altinn.studio/core-operator/internal/jobhost"
	"altinn.studio/core-operator/internal/jobhost/jobhosttest"
	"altinn.studio/core-operator/internal/sandbox"
	"altinn.studio/core-operator/internal/sandbox/sandboxtest"
)

const (
	testKind = "upgrade-v9"
	// argsKind is testKind with the arguments mode and target.
	argsKind      = "with-args"
	testNamespace = "sandbox-runs"
	podIP         = "127.0.0.1"
	testCommit    = "0123456789abcdef0123456789abcdef01234567"
)

// testSource is the source of a run of the app ttd/app at testCommit.
func testSource(app string) Source {
	return Source{Org: "ttd", App: app, RepoOwner: "ttd", Repo: app, Commit: testCommit}
}

func testConfig() *config.Config {
	kind := config.Kind{
		Namespace:          testNamespace,
		PodTemplate:        "job-host",
		Command:            "upgrade-v9",
		MaxActive:          2,
		MaxActivePerCaller: 1,
		MaxQueuedPerCaller: 2,
		QueueTimeout:       15 * time.Minute,
		RunTimeout:         660 * time.Second,
	}
	withArgs := kind
	withArgs.Args = []string{"mode", "target"}
	return &config.Config{
		HandlerGroups: []string{config.GroupRuns},
		Callers: map[string]config.Caller{
			"assistant": {ServiceAccount: "sa-assistant", Kinds: []string{testKind, argsKind}},
			"designer":  {ServiceAccount: "sa-designer"},
			"other":     {ServiceAccount: "sa-other", Kinds: []string{testKind}},
		},
		Kinds: map[string]config.Kind{testKind: kind, argsKind: withArgs},
	}
}

type harness struct {
	clock     *clock.FakeClock
	cfg       *config.Config
	engine    *enginetest.Engine
	host      *jobhosttest.JobHost
	sandbox   *sandboxtest.Sandbox
	queue     *Queue
	steps     *Steps
	service   *Service
	collector *Collector
	router    *callbacks.Router
	states    map[string]*string
}

func newHarness(t *testing.T) *harness {
	t.Helper()
	clk := clock.NewFakeClockAt(time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC))
	fakeEngine := enginetest.New(clk.Now)
	t.Cleanup(fakeEngine.Close)
	host := jobhosttest.New()
	t.Cleanup(host.Close)
	_, port := host.Address()

	cfg := testConfig()
	queue := NewQueue(clk)
	queue.Open()
	clk.Advance(warmup)
	engineClient := engine.NewClient(fakeEngine.URL(), http.DefaultClient)
	box := sandboxtest.New()
	hostClient := jobhost.NewClient(http.DefaultClient, port)
	steps := NewSteps(cfg, queue, box, hostClient, clk)
	return &harness{
		clock:     clk,
		cfg:       cfg,
		engine:    fakeEngine,
		host:      host,
		sandbox:   box,
		queue:     queue,
		steps:     steps,
		service:   NewService(cfg, queue, engineClient, hostClient, box, clk),
		collector: NewCollector(cfg, engineClient, box, clk),
		router:    callbacks.NewRouter(clk, steps.Group()),
		states:    make(map[string]*string),
	}
}

func gzipArchive(t *testing.T, content string) []byte {
	t.Helper()
	var buffer bytes.Buffer
	writer := gzip.NewWriter(&buffer)
	if _, err := writer.Write([]byte(content)); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	return buffer.Bytes()
}

// create creates a run of testKind for the app and fails the test on an error.
func (h *harness) create(t *testing.T, caller, app string) *Run {
	t.Helper()
	run, created, err := h.service.Create(t.Context(), caller, CreateRequest{Kind: testKind, Source: testSource(app)})
	if err != nil {
		t.Fatal(err)
	}
	if !created {
		t.Fatal("expected a new run")
	}
	return run
}

// uploadArchive uploads an archive for the assistant's run, as the caller would once the run awaits it.
func (h *harness) uploadArchive(t *testing.T, runID, content string) error {
	t.Helper()
	archive := gzipArchive(t, content)
	_, err := h.service.Upload(t.Context(), "assistant", runID, bytes.NewReader(archive), int64(len(archive)))
	return err
}

// workflowID finds a run's workflow in the fake engine.
func (h *harness) workflowID(t *testing.T, runID string) string {
	t.Helper()
	for _, workflow := range h.engine.Workflows() {
		if workflow.State.Labels[workflowLabelRunID] == runID {
			return workflow.State.DatabaseID
		}
	}
	t.Fatalf("no workflow for run %s", runID)
	return ""
}

type stepResult struct {
	response callbacks.Response
	body     string
	status   int
}

func (r stepResult) done() bool {
	return r.status == http.StatusOK && r.response.Defer == nil
}

func (r stepResult) deferred() bool {
	return r.status == http.StatusOK && r.response.Defer != nil
}

// call posts a step's callback as the engine would, with the state the run's last step left.
func (h *harness) call(t *testing.T, runID, key string, changes ...func(*callbacks.Payload)) stepResult {
	t.Helper()
	workflowID := h.workflowID(t, runID)
	stored, ok := h.engine.Workflow(workflowID)
	if !ok {
		t.Fatalf("no workflow %s", workflowID)
	}
	var workflowContext callbacks.Context
	if err := json.Unmarshal(stored.Request.Context, &workflowContext); err != nil {
		t.Fatal(err)
	}
	var data callbacks.CommandData
	for _, step := range stored.Request.Workflows[0].Steps {
		if step.OperationID == key {
			if err := json.Unmarshal(step.Command.Data, &data); err != nil {
				t.Fatal(err)
			}
		}
	}
	deadline := h.clock.Now().Add(time.Minute)
	payload := callbacks.Payload{
		CommandKey:             key,
		Payload:                data.Payload,
		Context:                workflowContext,
		WorkflowID:             workflowID,
		ExecutionReferenceTime: stored.State.CreatedAt,
		ExecutionDeadline:      &deadline,
		State:                  h.states[runID],
	}
	if payload.State == nil {
		// The first step gets the workflow's initial state.
		payload.State = stored.Request.Workflows[0].State
	}
	for _, change := range changes {
		change(&payload)
	}
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, callbacks.PathPrefix+key, bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.router.ServeHTTP(rec, req)
	result := stepResult{status: rec.Code, body: rec.Body.String()}
	if rec.Code == http.StatusOK {
		if err := json.Unmarshal(rec.Body.Bytes(), &result.response); err != nil {
			t.Fatal(err)
		}
	}
	return result
}

// step runs a step and moves the fake engine along, as the engine would with the answer.
func (h *harness) step(t *testing.T, runID, key string, changes ...func(*callbacks.Payload)) stepResult {
	t.Helper()
	result := h.call(t, runID, key, changes...)
	workflowID := h.workflowID(t, runID)
	switch {
	case result.done():
		h.states[runID] = result.response.State
		h.engine.Reach(workflowID, key, engine.StatusCompleted)
		h.setStateOut(workflowID, key, result.response.State)
	case result.deferred():
		h.states[runID] = result.response.State
		h.engine.Reach(workflowID, key, engine.StatusWaiting)
	}
	return result
}

func (h *harness) setStateOut(workflowID, key string, state *string) {
	h.engine.Update(workflowID, func(w *engine.Workflow) {
		now := h.clock.Now()
		w.UpdatedAt = &now
		for i := range w.Steps {
			if w.Steps[i].OperationID == key {
				w.Steps[i].StateOut = state
				w.Steps[i].UpdatedAt = &now
			}
		}
	})
}

// failStep fails a step the way the engine records it.
func (h *harness) failStep(t *testing.T, runID, key, message string) {
	t.Helper()
	workflowID := h.workflowID(t, runID)
	h.engine.Reach(workflowID, key, engine.StatusFailed)
	h.engine.Update(workflowID, func(w *engine.Workflow) {
		now := h.clock.Now()
		w.UpdatedAt = &now
		for i := range w.Steps {
			if w.Steps[i].OperationID == key {
				w.Steps[i].ErrorHistory = append(w.Steps[i].ErrorHistory, engine.ErrorEntry{Message: message})
			}
		}
	})
}

// readyPod makes the pod of a run's Job ready, with the fake job host's address.
func (h *harness) readyPod(runID string) {
	h.sandbox.SetPod(testNamespace, runID, sandbox.Pod{Status: sandbox.PodReady, IP: podIP})
}

// setPod sets the state of the pod of a run's Job.
func (h *harness) setPod(runID string, status sandbox.PodStatus, detail string) {
	h.sandbox.SetPod(testNamespace, runID, sandbox.Pod{Status: status, Detail: detail})
}

// hasJob reports whether a run's Job exists.
func (h *harness) hasJob(runID string) bool {
	_, ok := h.sandbox.Job(testNamespace, runID)
	return ok
}

// failedByOperator is the error the engine records for a step that the operator failed with 422, as
// operator-workflow-engine's OperatorCommand writes it.
func failedByOperator(result stepResult) string {
	return "OperatorCommand failed with client error UnprocessableEntity: " + result.body
}

// result reads the result of the assistant's run, as the run API sends it.
func (h *harness) result(t *testing.T, runID string) string {
	t.Helper()
	body, _, err := h.service.Result(t.Context(), "assistant", runID)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if closeErr := body.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	}()
	data, err := io.ReadAll(body)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

// get reads the assistant's run, which most tests use.
func (h *harness) get(t *testing.T, runID string) *Run {
	t.Helper()
	run, err := h.service.Get(t.Context(), "assistant", runID, 0)
	if err != nil {
		t.Fatal(err)
	}
	return run
}
