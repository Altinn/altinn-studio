package runs

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"altinn.studio/core-operator/internal/callbacks"
	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/engine/enginetest"
	"altinn.studio/core-operator/internal/runner"
	"altinn.studio/core-operator/internal/runner/runnertest"
	"altinn.studio/core-operator/internal/sandbox"
	"altinn.studio/core-operator/internal/sandbox/sandboxtest"
)

const (
	testKind = "upgrade-v9"
	// noArchiveKind is testKind for a command that requires no archive.
	noArchiveKind = "no-archive"
	testNamespace = "sandbox-runs"
	podIP         = "127.0.0.1"
	testCommit    = "0123456789abcdef0123456789abcdef01234567"
)

// appLabels are the labels of the test kinds, as upgrade-v9 has them.
var appLabels = []string{"org", "app", "repoOwner", "repo", "commit"}

// testLabels are the labels of a run of the app ttd/app at testCommit.
func testLabels(app string) map[string]string {
	return map[string]string{"org": "ttd", "app": app, "repoOwner": "ttd", "repo": app, "commit": testCommit}
}

func testConfig() *config.Config {
	kind := config.Kind{
		Namespace:          testNamespace,
		PodTemplate:        "operator-runner",
		Command:            "upgrade-v9",
		RequiresArchive:    true,
		Labels:             appLabels,
		MaxActive:          2,
		MaxActivePerCaller: 1,
		MaxQueuedPerCaller: 2,
		QueueTimeout:       15 * time.Minute,
		RunTimeout:         660 * time.Second,
	}
	noArchive := kind
	noArchive.RequiresArchive = false
	return &config.Config{
		HandlerGroups: []string{config.GroupRuns},
		Callers: map[string]config.Caller{
			"assistant": {ServiceAccount: "sa-assistant", Kinds: []string{testKind, noArchiveKind}},
			"designer":  {ServiceAccount: "sa-designer"},
			"other":     {ServiceAccount: "sa-other", Kinds: []string{testKind}},
		},
		Kinds: map[string]config.Kind{testKind: kind, noArchiveKind: noArchive},
	}
}

type harness struct {
	clock     *clock.FakeClock
	cfg       *config.Config
	engine    *enginetest.Engine
	host      *runnertest.Runner
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
	host := runnertest.New()
	t.Cleanup(host.Close)
	_, port := host.Address()

	cfg := testConfig()
	queue := NewQueue(clk, 0)
	queue.Open()
	clk.Advance(warmup)
	engineClient := engine.NewClient(fakeEngine.URL(), http.DefaultClient)
	box := sandboxtest.New()
	hostClient := runner.NewClient(http.DefaultClient, port)
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
	run, created, err := h.service.Create(t.Context(), caller, CreateRequest{Kind: testKind, Labels: testLabels(app)})
	if err != nil {
		t.Fatal(err)
	}
	if !created {
		t.Fatal("expected a new run")
	}
	return run
}

// upload sends an archive to the run's operator runner, as the run API passes on the caller's upload.
func (h *harness) upload(t *testing.T, runID, content string) {
	t.Helper()
	archive := gzipArchive(t, content)
	if err := h.steps.host.Start(t.Context(), podIP, runID, "upgrade-v9", bytes.NewReader(archive), -1); err != nil {
		t.Fatal(err)
	}
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

// call posts a step's callback as the engine would, with the state of the run's last answer, and keeps the state of
// this answer for the next step.
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
	deadline := h.clock.Now().Add(time.Minute)
	payload := callbacks.Payload{
		CommandKey:             key,
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
		h.states[runID] = result.response.State
	}
	return result
}

// readyPod makes the pod of a run's Job ready, with the fake operator runner's address.
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

// get reads the assistant's run, which most tests use.
func (h *harness) get(t *testing.T, runID string) *Run {
	t.Helper()
	run, err := h.service.Get(t.Context(), "assistant", runID, 0)
	if err != nil {
		t.Fatal(err)
	}
	return run
}
