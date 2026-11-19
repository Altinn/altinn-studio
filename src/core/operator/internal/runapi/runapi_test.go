package runapi

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/auth"
	"altinn.studio/core-operator/internal/callbacks"
	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/engine/enginetest"
	"altinn.studio/core-operator/internal/runner"
	"altinn.studio/core-operator/internal/runner/runnertest"
	"altinn.studio/core-operator/internal/runs"
	"altinn.studio/core-operator/internal/sandbox"
	"altinn.studio/core-operator/internal/sandbox/sandboxtest"
)

const (
	kind   = "upgrade-v9"
	commit = "0123456789abcdef0123456789abcdef01234567"
)

type apiHarness struct {
	clock   *clock.FakeClock
	engine  *enginetest.Engine
	host    *runnertest.Runner
	box     *sandboxtest.Sandbox
	steps   http.Handler
	handler http.Handler
}

func newAPI(t *testing.T) *apiHarness {
	t.Helper()
	clk := clock.NewFakeClockAt(time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC))
	fakeEngine := enginetest.New(clk.Now)
	t.Cleanup(fakeEngine.Close)
	host := runnertest.New()
	t.Cleanup(host.Close)
	_, port := host.Address()
	kindConfig := config.Kind{
		Namespace: "core-operator-runners", PodTemplate: "operator-runner", Command: kind,
		Labels:             []string{"org", "repoOwner", "repo", "commit"},
		MaxActivePerCaller: 1, MaxQueuedPerCaller: 2,
		QueueTimeout: 15 * time.Minute, RunTimeout: 660 * time.Second,
	}
	cfg := &config.Config{
		Callers: map[string]config.Caller{
			"assistant": {ServiceAccount: "a", Kinds: []string{kind}},
			"designer":  {ServiceAccount: "d"},
		},
		Kinds: map[string]config.Kind{kind: kindConfig},
	}
	box := sandboxtest.New()
	box.SlotCount = 1
	queue := runs.NewQueue(cfg, box, clk)
	// A minute is longer than the queue's warmup, so run.admit admits a run at once.
	queue.Open()
	clk.Advance(time.Minute)
	hostClient := runner.NewClient(http.DefaultClient, port, box)
	service := runs.NewService(cfg, queue, engine.NewClient(fakeEngine.URL(), http.DefaultClient), hostClient, box, clk)
	return &apiHarness{
		clock:   clk,
		engine:  fakeEngine,
		host:    host,
		box:     box,
		steps:   callbacks.NewRouter(clk, runs.NewSteps(queue, box, hostClient).Group()),
		handler: New(service).Routes(),
	}
}

// awaitArchive moves the run through the steps before run.await-archive, as the engine does. The pod of the run is
// ready at the fake operator runner. The fake engine runs no steps, so awaitArchive stores each step as completed, with
// the state of its answer.
func (h *apiHarness) awaitArchive(t *testing.T, runID string) {
	t.Helper()
	stored := h.workflow(t, runID)
	var workflowContext callbacks.Context
	Expect(json.Unmarshal(stored.Request.Context, &workflowContext)).To(Succeed())
	state := stored.Request.Workflows[0].State
	ip, _ := h.host.Address()
	for i, key := range []string{runs.StepAdmit, runs.StepCreateJob, runs.StepAwaitPod} {
		if key == runs.StepAwaitPod {
			h.box.SetPod("core-operator-runners", runID, sandbox.Pod{Status: sandbox.PodReady, IP: ip})
		}
		deadline := h.clock.Now().Add(time.Minute)
		body, err := json.Marshal(callbacks.Payload{
			CommandKey: key, Context: workflowContext, WorkflowID: stored.State.DatabaseID,
			ExecutionReferenceTime: stored.State.CreatedAt, ExecutionDeadline: &deadline, State: state,
		})
		Expect(err).NotTo(HaveOccurred())
		res := httptest.NewRecorder()
		h.steps.ServeHTTP(res, httptest.NewRequestWithContext(
			t.Context(), http.MethodPost, callbacks.PathPrefix+key, bytes.NewReader(body)))
		Expect(res.Code).To(Equal(http.StatusOK), res.Body.String())
		var answer callbacks.Response
		Expect(json.Unmarshal(res.Body.Bytes(), &answer)).To(Succeed())
		Expect(answer.Defer).To(BeNil(), key)
		state = answer.State
		h.engine.Update(stored.State.DatabaseID, func(w *engine.Workflow) {
			w.Steps[i].Status, w.Steps[i].StateOut = engine.StatusCompleted, state
		})
	}
}

func (h *apiHarness) workflow(t *testing.T, runID string) enginetest.Workflow {
	t.Helper()
	for _, workflow := range h.engine.Workflows() {
		if workflow.State.Labels["runId"] == runID {
			return workflow
		}
	}
	t.Fatalf("no workflow for run %s", runID)
	return enginetest.Workflow{}
}

func (h *apiHarness) do(t *testing.T, caller string, req *http.Request) *httptest.ResponseRecorder {
	t.Helper()
	req = req.WithContext(auth.WithCaller(req.Context(), caller))
	res := httptest.NewRecorder()
	h.handler.ServeHTTP(res, req)
	return res
}

func (h *apiHarness) request(
	t *testing.T,
	caller, method, path, contentType string,
	body []byte,
) *httptest.ResponseRecorder {
	t.Helper()
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req := httptest.NewRequestWithContext(t.Context(), method, path, reader)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	return h.do(t, caller, req)
}

func createBody(kindName, repo string) []byte {
	body := `{"kind":"` + kindName + `","labels":{"org":"ttd","repoOwner":"ttd","repo":"` + repo + `","commit":"` + commit +
		`"}`
	return []byte(body + "}")
}

func (h *apiHarness) createRun(t *testing.T, caller string, body []byte) *httptest.ResponseRecorder {
	t.Helper()
	return h.request(t, caller, http.MethodPost, "/api/v1/runs", "application/json", body)
}

// upload puts the archive of a run as the caller, and returns the status code. A body that is not a bytes or a
// strings reader has no length, as in a chunked upload.
func (h *apiHarness) upload(t *testing.T, caller, runID, contentType string, body io.Reader) int {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPut, "/api/v1/runs/"+runID+"/archive", body)
	req.Header.Set("Content-Type", contentType)
	return h.do(t, caller, req).Code
}

func gzipped(t *testing.T, content string) []byte {
	t.Helper()
	var buffer bytes.Buffer
	writer := gzip.NewWriter(&buffer)
	_, err := writer.Write([]byte(content))
	Expect(err).NotTo(HaveOccurred())
	Expect(writer.Close()).To(Succeed())
	return buffer.Bytes()
}

func decodeRun(t *testing.T, res *httptest.ResponseRecorder) runs.Run {
	t.Helper()
	var run runs.Run
	if err := json.Unmarshal(res.Body.Bytes(), &run); err != nil {
		t.Fatalf("%v: %s", err, res.Body.String())
	}
	return run
}

func TestCreateRunAnswersWithTheQueuedRun(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)

	res := h.createRun(t, "assistant", createBody(kind, "app"))
	Expect(res.Code).To(Equal(http.StatusAccepted), res.Body.String())
	Expect(res.Header().Get("Content-Type")).To(Equal("application/json"))
	Expect(res.Body.String()).To(MatchJSON(`{
		"id": "` + decodeRun(t, res).ID + `",
		"kind": "upgrade-v9",
		"labels": {"org": "ttd", "repoOwner": "ttd", "repo": "app", "commit": "` + commit + `"},
		"status": "queued",
		"queuePosition": 1,
		"createdAt": "2026-11-03T10:01:00Z",
		"startedAt": null,
		"finishedAt": null,
		"resultExpiresAt": null,
		"error": null
	}`))
}

// Gitea compares the names in the labels without case.
func TestCreateRunAgainFindsTheRunInProgress(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)
	created := decodeRun(t, h.createRun(t, "assistant", createBody(kind, "app")))

	res := h.createRun(t, "assistant", createBody(kind, "APP"))
	Expect(res.Code).To(Equal(http.StatusOK), res.Body.String())
	Expect(decodeRun(t, res).ID).To(Equal(created.ID))
}

func TestCreateRunRefusesAKindThatTheCallerCannotRun(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)

	res := h.createRun(t, "assistant", createBody("upgrade-v10", "app"))
	Expect(res.Code).To(Equal(http.StatusNotFound), "a kind that this environment does not have")
	res = h.createRun(t, "designer", createBody(kind, "app"))
	Expect(res.Code).To(Equal(http.StatusForbidden), "a kind that the caller may not run")
}

func TestCreateRunAsksForARetryWhenTheEngineIsAtCapacity(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)

	h.engine.AtCapacity = true
	res := h.createRun(t, "assistant", createBody(kind, "app"))
	Expect(res.Code).To(Equal(http.StatusServiceUnavailable))
	Expect(res.Header().Get("Retry-After")).To(Equal("5"))
}

func TestCreateRunRefusesARunPastTheCallersQueueLimit(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)

	// maxQueuedPerCaller is 2.
	Expect(h.createRun(t, "assistant", createBody(kind, "first")).Code).To(Equal(http.StatusAccepted))
	Expect(h.createRun(t, "assistant", createBody(kind, "second")).Code).To(Equal(http.StatusAccepted))
	Expect(h.createRun(t, "assistant", createBody(kind, "third")).Code).To(Equal(http.StatusTooManyRequests))
}

func TestCreateRunRefusesBadRequests(t *testing.T) {
	h := newAPI(t)
	labels := `"labels":{"org":"ttd","repoOwner":"ttd","repo":"app","commit":"` + commit + `"}`
	cases := map[string]string{
		"bad kind":       `{"kind":"Upgrade V9",` + labels + `}`,
		"unknown field":  `{"kind":"upgrade-v9","command":"sh",` + labels + `}`,
		"not JSON":       `kind=upgrade-v9`,
		"no labels":      `{"kind":"upgrade-v9"}`,
		"the old source": `{"kind":"upgrade-v9","source":{"org":"ttd"}}`,
		"missing label":  `{"kind":"upgrade-v9","labels":{"org":"ttd","repoOwner":"ttd","repo":"app"}}`,
		"bad repo":       `{"kind":"upgrade-v9","labels":{"org":"ttd","repoOwner":"ttd","repo":"../x","commit":"` + commit + `"}}`,
		"unknown label":  `{"kind":"upgrade-v9","labels":{"org":"ttd","repoOwner":"ttd","repo":"app","commit":"` + commit + `","branch":"main"}}`,
		"label not text": `{"kind":"upgrade-v9","labels":{"org":1}}`,
	}
	for name, body := range cases {
		t.Run(name, func(t *testing.T) {
			RegisterTestingT(t)
			res := h.createRun(t, "assistant", []byte(body))
			Expect(res.Code).To(Equal(http.StatusBadRequest), res.Body.String())
			Expect(res.Header().Get("Content-Type")).To(Equal("application/problem+json"))
		})
	}

	t.Run("not JSON content", func(t *testing.T) {
		RegisterTestingT(t)
		res := h.request(
			t,
			"assistant",
			http.MethodPost,
			"/api/v1/runs",
			"multipart/form-data",
			createBody(kind, "app"),
		)
		Expect(res.Code).To(Equal(http.StatusUnsupportedMediaType))
	})
}

func TestFindRuns(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)
	created := decodeRun(t, h.createRun(t, "assistant", createBody(kind, "app")))
	h.clock.Advance(time.Second)
	other := decodeRun(t, h.createRun(t, "assistant", createBody(kind, "other")))

	res := h.request(t, "assistant", http.MethodGet,
		"/api/v1/runs?labelSelector=repoOwner=TTD,repo=app,commit="+commit, "", nil)
	Expect(res.Code).To(Equal(http.StatusOK), res.Body.String())
	var found struct {
		Runs []runs.Run `json:"runs"`
	}
	Expect(json.Unmarshal(res.Body.Bytes(), &found)).To(Succeed())
	Expect(found.Runs).To(HaveLen(1))
	Expect(found.Runs[0].ID).To(Equal(created.ID))

	res = h.request(t, "assistant", http.MethodGet, "/api/v1/runs?labelSelector=org=ttd", "", nil)
	Expect(json.Unmarshal(res.Body.Bytes(), &found)).To(Succeed())
	Expect(found.Runs).To(HaveLen(2), "both runs of the org")
	Expect(found.Runs[0].ID).To(Equal(other.ID), "the newest first")

	res = h.request(t, "designer", http.MethodGet, "/api/v1/runs?labelSelector=org=ttd", "", nil)
	Expect(res.Body.String()).To(MatchJSON(`{"runs":[]}`), "another caller's runs")

	for _, query := range []string{
		"", "?labelSelector=repo=../x", "?labelSelector=org", "?labelSelector=org=a,org=b", "?labelSelector=runId=x",
		"?kind=Upgrade", "?kind=upgrade&labelSelector=org=%zz",
	} {
		res = h.request(t, "assistant", http.MethodGet, "/api/v1/runs"+query, "", nil)
		Expect(res.Code).To(Equal(http.StatusBadRequest), query)
	}
}

func TestGetRunAnswersWithTheRun(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)
	created := decodeRun(t, h.createRun(t, "assistant", createBody(kind, "app")))

	res := h.request(t, "assistant", http.MethodGet, "/api/v1/runs/"+created.ID+"?wait=0", "", nil)
	Expect(res.Code).To(Equal(http.StatusOK))
	Expect(decodeRun(t, res)).To(Equal(created))
}

func TestGetRunRefusesAnotherCallersRunAndABadWait(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)
	runPath := "/api/v1/runs/" + decodeRun(t, h.createRun(t, "assistant", createBody(kind, "app"))).ID

	for _, want := range []struct {
		caller, path string
		status       int
	}{
		{caller: "designer", path: runPath, status: http.StatusNotFound},
		{caller: "assistant", path: "/api/v1/runs/nope", status: http.StatusNotFound},
		{caller: "assistant", path: runPath + "?wait=-1", status: http.StatusBadRequest},
	} {
		got := want
		got.status = h.request(t, want.caller, http.MethodGet, want.path, "", nil).Code
		Expect(got).To(Equal(want))
	}
}

func (h *apiHarness) cancelRun(t *testing.T, runID string) *httptest.ResponseRecorder {
	t.Helper()
	return h.request(t, "assistant", http.MethodPost, "/api/v1/runs/"+runID+"/cancel", "", nil)
}

// endWorkflows ends every workflow as canceled, as the engine does after a cancel.
func (h *apiHarness) endWorkflows() {
	for _, workflow := range h.engine.Workflows() {
		h.engine.Update(workflow.State.DatabaseID, func(stored *engine.Workflow) {
			stored.OverallStatus = engine.StatusCanceled
		})
	}
}

func TestCancelRunAnswersWithTheCanceledRun(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)
	created := decodeRun(t, h.createRun(t, "assistant", createBody(kind, "app")))

	res := h.cancelRun(t, created.ID)
	Expect(res.Code).To(Equal(http.StatusAccepted))
	Expect(decodeRun(t, res).Status).To(Equal(runs.StatusCanceled))
}

func TestCancelRunAgainAfterTheEngineEndedTheRun(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)
	created := decodeRun(t, h.createRun(t, "assistant", createBody(kind, "app")))
	h.cancelRun(t, created.ID)
	h.endWorkflows()

	Expect(h.cancelRun(t, created.ID).Code).To(Equal(http.StatusOK))
}

func TestACanceledRunHasNoResult(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)
	created := decodeRun(t, h.createRun(t, "assistant", createBody(kind, "app")))
	h.cancelRun(t, created.ID)
	h.endWorkflows()

	res := h.request(t, "assistant", http.MethodGet, "/api/v1/runs/"+created.ID+"/result", "", nil)
	Expect(res.Code).To(Equal(http.StatusConflict))
}

func TestCreateRunAfterTheRunEndedStartsANewRun(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)
	created := decodeRun(t, h.createRun(t, "assistant", createBody(kind, "app")))
	h.cancelRun(t, created.ID)
	h.endWorkflows()

	res := h.createRun(t, "assistant", createBody(kind, "app"))
	Expect(res.Code).To(Equal(http.StatusAccepted))
	Expect(decodeRun(t, res).ID).NotTo(Equal(created.ID))
}

func TestUploadArchive(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)
	created := decodeRun(t, h.createRun(t, "assistant", createBody(kind, "app")))
	archive := gzipped(t, "app")
	Expect(h.upload(t, "assistant", created.ID, "application/gzip", bytes.NewReader(archive))).
		To(Equal(http.StatusConflict), "the run is queued")

	h.awaitArchive(t, created.ID)
	Expect(h.upload(t, "assistant", created.ID, "application/json", bytes.NewReader(archive))).
		To(Equal(http.StatusUnsupportedMediaType))
	Expect(h.upload(t, "assistant", created.ID, "application/gzip", strings.NewReader("PK\x03\x04"))).
		To(Equal(http.StatusBadRequest), "the operator runner refuses a body that is not gzip")
	Expect(h.upload(t, "designer", created.ID, "application/gzip", bytes.NewReader(archive))).
		To(Equal(http.StatusNotFound), "another caller's run")
	large := make([]byte, runs.MaxArchiveBytes+1)
	Expect(h.upload(t, "assistant", created.ID, "application/gzip", bytes.NewReader(large))).
		To(Equal(http.StatusRequestEntityTooLarge), "from its length")
	Expect(h.upload(t, "assistant", created.ID, "application/gzip", io.MultiReader(bytes.NewReader(large)))).
		To(Equal(http.StatusRequestEntityTooLarge), "from its chunks")
	Expect(h.host.Claimed()).To(BeEmpty())

	Expect(h.upload(t, "assistant", created.ID, "Application/GZIP; x=y", bytes.NewReader(archive))).
		To(Equal(http.StatusAccepted))
	Expect(h.upload(t, "assistant", created.ID, "application/gzip", bytes.NewReader(gzipped(t, "again")))).
		To(Equal(http.StatusAccepted), "an upload that comes again")
	runID, command, received, starts := h.host.Snapshot()
	Expect([]any{runID, command, received, starts}).To(Equal([]any{created.ID, kind, archive, 2}))
}

func TestListKinds(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)

	res := h.request(t, "assistant", http.MethodGet, "/api/v1/kinds", "", nil)
	Expect(res.Code).To(Equal(http.StatusOK))
	Expect(res.Body.String()).To(MatchJSON(`{"kinds":[
		{"name":"upgrade-v9","labels":["org","repoOwner","repo","commit"],
			"queueTimeoutSeconds":900,"uploadTimeoutSeconds":300,"runTimeoutSeconds":660,"resultTimeoutSeconds":300,
			"maxDurationSeconds":4380}
	]}`))

	res = h.request(t, "designer", http.MethodGet, "/api/v1/kinds", "", nil)
	Expect(res.Body.String()).To(MatchJSON(`{"kinds":[]}`))
}
