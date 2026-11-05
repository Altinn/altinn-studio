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
	corev1 "k8s.io/api/core/v1"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"altinn.studio/core-operator/internal/auth"
	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/engine/enginetest"
	"altinn.studio/core-operator/internal/jobhost"
	"altinn.studio/core-operator/internal/jobhost/jobhosttest"
	"altinn.studio/core-operator/internal/runs"
)

const (
	kind = "upgrade-v9"
	// argsKind accepts the arguments mode and target.
	argsKind = "with-args"
	commit   = "0123456789abcdef0123456789abcdef01234567"
)

type apiHarness struct {
	clock   *clock.FakeClock
	engine  *enginetest.Engine
	host    *jobhosttest.JobHost
	handler http.Handler
}

func newAPI(t *testing.T) *apiHarness {
	t.Helper()
	clk := clock.NewFakeClockAt(time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC))
	fakeEngine := enginetest.New(clk.Now)
	t.Cleanup(fakeEngine.Close)
	host := jobhosttest.New()
	t.Cleanup(host.Close)
	_, port := host.Address()
	kindConfig := config.Kind{
		Namespace: "sandbox-runs", PodTemplate: "job-host", Command: kind,
		MaxActive: 1, MaxActivePerCaller: 1, MaxQueuedPerCaller: 2,
		QueueTimeout: 15 * time.Minute, RunTimeout: 660 * time.Second,
	}
	withArgs := kindConfig
	withArgs.Args = []string{"mode", "target"}
	cfg := &config.Config{
		Callers: map[string]config.Caller{
			"assistant": {ServiceAccount: "a", Kinds: []string{kind, argsKind}},
			"designer":  {ServiceAccount: "d"},
		},
		Kinds: map[string]config.Kind{kind: kindConfig, argsKind: withArgs},
	}
	k8s := fake.NewClientBuilder().WithScheme(clientgoscheme.Scheme).WithObjects(&corev1.PodTemplate{}).Build()
	service := runs.NewService(cfg, runs.NewQueue(clk), engine.NewClient(fakeEngine.URL(), http.DefaultClient),
		jobhost.NewClient(http.DefaultClient, port), &runs.Kube{Client: k8s, Reader: k8s}, clk)
	return &apiHarness{clock: clk, engine: fakeEngine, host: host, handler: New(service).Handler()}
}

func gzipped(t *testing.T, content string) []byte {
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

func createBody(kindName, repo, args string) []byte {
	body := `{"kind":"` + kindName + `","source":{"org":"ttd","app":"` + repo + `","repoOwner":"ttd","repo":"` + repo +
		`","commit":"` + commit + `"}`
	if args != "" {
		body += `,"args":` + args
	}
	return []byte(body + "}")
}

func (h *apiHarness) createRun(t *testing.T, caller string, body []byte) *httptest.ResponseRecorder {
	t.Helper()
	return h.request(t, caller, http.MethodPost, "/api/v1/runs", "application/json", body)
}

func decodeRun(t *testing.T, res *httptest.ResponseRecorder) runs.Run {
	t.Helper()
	var run runs.Run
	if err := json.Unmarshal(res.Body.Bytes(), &run); err != nil {
		t.Fatalf("%v: %s", err, res.Body.String())
	}
	return run
}

// workflowOf returns the id of a run's workflow in the fake engine.
func (h *apiHarness) workflowOf(t *testing.T, runID string) string {
	t.Helper()
	for _, workflow := range h.engine.Workflows() {
		if workflow.State.Labels["runId"] == runID {
			return workflow.State.DatabaseID
		}
	}
	t.Fatalf("no workflow for run %s", runID)
	return ""
}

// awaitArchive moves a run's workflow to run.await-archive, with the fake job host as its pod, as the engine would
// once the pod is ready.
func (h *apiHarness) awaitArchive(t *testing.T, runID string) {
	t.Helper()
	workflowID := h.workflowOf(t, runID)
	stored, _ := h.engine.Workflow(workflowID)
	var state map[string]any
	if err := json.Unmarshal([]byte(*stored.State.InitialState), &state); err != nil {
		t.Fatal(err)
	}
	ip, _ := h.host.Address()
	state["podIP"] = ip
	encoded, err := json.Marshal(state)
	if err != nil {
		t.Fatal(err)
	}
	text := string(encoded)
	h.engine.Reach(workflowID, runs.StepAwaitArchive, engine.StatusWaiting)
	h.engine.Update(workflowID, func(w *engine.Workflow) {
		for i := range w.Steps {
			if w.Steps[i].OperationID == runs.StepAwaitPod {
				w.Steps[i].StateOut = &text
			}
		}
	})
}

// complete moves a run's workflow to run.cleanup, with the outcome completed in run.await-result's state.
func (h *apiHarness) complete(t *testing.T, runID string) {
	t.Helper()
	workflowID := h.workflowOf(t, runID)
	stored, _ := h.engine.Workflow(workflowID)
	var podState *string
	for _, step := range stored.State.Steps {
		if step.OperationID == runs.StepAwaitPod {
			podState = step.StateOut
		}
	}
	var state map[string]any
	if err := json.Unmarshal([]byte(*podState), &state); err != nil {
		t.Fatal(err)
	}
	state["outcome"] = jobhost.StatusCompleted
	encoded, err := json.Marshal(state)
	if err != nil {
		t.Fatal(err)
	}
	text := string(encoded)
	h.engine.Reach(workflowID, runs.StepCleanup, engine.StatusWaiting)
	h.engine.Update(workflowID, func(w *engine.Workflow) {
		for i := range w.Steps {
			if w.Steps[i].OperationID == runs.StepAwaitResult {
				w.Steps[i].StateOut = &text
				w.Steps[i].UpdatedAt = w.UpdatedAt
			}
		}
	})
}

func TestCreateRunStatusCodes(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)

	res := h.createRun(t, "assistant", createBody(kind, "app", ""))
	Expect(res.Code).To(Equal(http.StatusAccepted), res.Body.String())
	Expect(res.Header().Get("Content-Type")).To(Equal("application/json"))
	created := decodeRun(t, res)
	Expect(created.Status).To(Equal(runs.StatusQueued))
	Expect(*created.QueuePosition).To(Equal(1))
	Expect(created.Source).To(Equal(runs.Source{
		Org: "ttd", App: "app", RepoOwner: "ttd", Repo: "app", Commit: commit,
	}))
	Expect(res.Body.String()).To(ContainSubstring(`"finishedAt":null`))
	Expect(res.Body.String()).To(ContainSubstring(`"resultExpiresAt":null`))
	Expect(res.Body.String()).To(ContainSubstring(`"error":null`))

	// The same kind and source finds the run in progress.
	res = h.createRun(t, "assistant", createBody(kind, "APP", ""))
	Expect(res.Code).To(Equal(http.StatusOK), res.Body.String())
	Expect(decodeRun(t, res).ID).To(Equal(created.ID))

	Expect(h.createRun(t, "assistant", createBody("upgrade-v10", "app", "")).Code).To(Equal(http.StatusNotFound))
	Expect(h.createRun(t, "designer", createBody(kind, "app", "")).Code).To(Equal(http.StatusForbidden))

	h.engine.AtCapacity = true
	res = h.createRun(t, "assistant", createBody(kind, "busy", ""))
	Expect(res.Code).To(Equal(http.StatusServiceUnavailable))
	Expect(res.Header().Get("Retry-After")).To(Equal("5"))
	h.engine.AtCapacity = false

	// maxQueuedPerCaller is 2.
	Expect(h.createRun(t, "assistant", createBody(kind, "busy", "")).Code).To(Equal(http.StatusAccepted))
	res = h.createRun(t, "assistant", createBody(kind, "third", ""))
	Expect(res.Code).To(Equal(http.StatusTooManyRequests))
}

func TestCreateRunRefusesBadRequests(t *testing.T) {
	h := newAPI(t)
	source := `"source":{"org":"ttd","app":"app","repoOwner":"ttd","repo":"app","commit":"` + commit + `"}`
	cases := map[string]string{
		"bad kind":        `{"kind":"Upgrade V9",` + source + `}`,
		"unknown field":   `{"kind":"upgrade-v9","command":"sh",` + source + `}`,
		"not JSON":        `kind=upgrade-v9`,
		"no source":       `{"kind":"upgrade-v9"}`,
		"short commit":    `{"kind":"upgrade-v9","source":{"org":"ttd","app":"app","repoOwner":"ttd","repo":"app","commit":"abc"}}`,
		"bad repo":        `{"kind":"upgrade-v9","source":{"org":"ttd","app":"app","repoOwner":"ttd","repo":"../x","commit":"` + commit + `"}}`,
		"unknown in body": `{"kind":"upgrade-v9","source":{"org":"ttd","app":"app","repoOwner":"ttd","repo":"app","commit":"` + commit + `","branch":"main"}}`,
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
			createBody(kind, "app", ""),
		)
		Expect(res.Code).To(Equal(http.StatusUnsupportedMediaType))
	})
}

func TestCreateRunWithArgs(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)

	res := h.createRun(t, "assistant", createBody(argsKind, "app", `{"target":"v9","mode":"dry-run"}`))
	Expect(res.Code).To(Equal(http.StatusAccepted), res.Body.String())

	// The same arguments in another order find the run.
	res = h.createRun(t, "assistant", createBody(argsKind, "app", `{"mode":"dry-run","target":"v9"}`))
	Expect(res.Code).To(Equal(http.StatusOK), res.Body.String())

	res = h.createRun(t, "assistant", createBody(argsKind, "app", `{"mode":"apply","target":"v9"}`))
	Expect(res.Code).To(Equal(http.StatusConflict), "other arguments while the run is in progress")

	res = h.createRun(t, "assistant", createBody(argsKind, "app", `{"command":"sh"}`))
	Expect(res.Code).To(Equal(http.StatusBadRequest))
	Expect(res.Body.String()).To(ContainSubstring("does not accept the argument command"))
	res = h.createRun(t, "assistant", createBody(kind, "app", `{"mode":"x"}`))
	Expect(res.Code).To(Equal(http.StatusBadRequest), "a kind without arguments")
	long := strings.Repeat("x", runs.MaxArgLength+1)
	res = h.createRun(t, "assistant", createBody(argsKind, "app", `{"mode":"`+long+`"}`))
	Expect(res.Code).To(Equal(http.StatusBadRequest))
}

func TestFindRuns(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)
	created := decodeRun(t, h.createRun(t, "assistant", createBody(kind, "app", "")))
	h.clock.Advance(time.Second)
	other := decodeRun(t, h.createRun(t, "assistant", createBody(kind, "other", "")))

	res := h.request(t, "assistant", http.MethodGet, "/api/v1/runs?repoOwner=TTD&repo=app&commit="+commit, "", nil)
	Expect(res.Code).To(Equal(http.StatusOK), res.Body.String())
	var found struct {
		Runs []runs.Run `json:"runs"`
	}
	Expect(json.Unmarshal(res.Body.Bytes(), &found)).To(Succeed())
	Expect(found.Runs).To(HaveLen(1))
	Expect(found.Runs[0].ID).To(Equal(created.ID))

	res = h.request(t, "assistant", http.MethodGet, "/api/v1/runs?org=ttd", "", nil)
	Expect(json.Unmarshal(res.Body.Bytes(), &found)).To(Succeed())
	Expect(found.Runs).To(HaveLen(2), "both runs of the org")
	Expect(found.Runs[0].ID).To(Equal(other.ID), "the newest first")

	res = h.request(t, "designer", http.MethodGet, "/api/v1/runs?org=ttd", "", nil)
	Expect(res.Body.String()).To(MatchJSON(`{"runs":[]}`), "another caller's runs")

	for _, query := range []string{"", "?commit=abc", "?repo=../x", "?kind=Upgrade"} {
		res = h.request(t, "assistant", http.MethodGet, "/api/v1/runs"+query, "", nil)
		Expect(res.Code).To(Equal(http.StatusBadRequest), query)
	}
}

func TestUploadArchive(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)
	created := decodeRun(t, h.createRun(t, "assistant", createBody(kind, "app", "")))
	archive := gzipped(t, "app")
	path := "/api/v1/runs/" + created.ID + "/archive"

	res := h.request(t, "assistant", http.MethodPut, path, "application/gzip", archive)
	Expect(res.Code).To(Equal(http.StatusConflict), "the run is queued: %s", res.Body.String())
	Expect(res.Body.String()).To(ContainSubstring("queued"))

	h.awaitArchive(t, created.ID)
	res = h.request(t, "assistant", http.MethodPut, path, "application/json", archive)
	Expect(res.Code).To(Equal(http.StatusUnsupportedMediaType))
	res = h.request(t, "assistant", http.MethodPut, path, "application/gzip", []byte("PK\x03\x04"))
	Expect(res.Code).To(Equal(http.StatusBadRequest), "the job host's refusal of a body that is not gzip")
	Expect(res.Body.String()).To(ContainSubstring("not a gzip archive"))
	res = h.request(t, "designer", http.MethodPut, path, "application/gzip", archive)
	Expect(res.Code).To(Equal(http.StatusNotFound), "another caller's run")

	res = h.request(t, "assistant", http.MethodPut, path, "Application/GZIP; x=y", archive)
	Expect(res.Code).To(Equal(http.StatusAccepted), res.Body.String())
	Expect(decodeRun(t, res).ID).To(Equal(created.ID))
	runID, command, received, _ := h.host.Snapshot()
	Expect(runID).To(Equal(created.ID))
	Expect(command).To(Equal(kind))
	Expect(received).To(Equal(archive))

	res = h.request(t, "assistant", http.MethodPut, path, "application/gzip", gzipped(t, "again"))
	Expect(res.Code).To(Equal(http.StatusAccepted), "an upload that comes again")
	_, _, received, starts := h.host.Snapshot()
	Expect(received).To(Equal(archive), "the job host keeps the first archive")
	Expect(starts).To(Equal(2))
}

func TestUploadRefusesALargeArchive(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)
	created := decodeRun(t, h.createRun(t, "assistant", createBody(kind, "app", "")))
	h.awaitArchive(t, created.ID)
	path := "/api/v1/runs/" + created.ID + "/archive"

	large := make([]byte, runs.MaxArchiveBytes+1)
	res := h.request(t, "assistant", http.MethodPut, path, "application/gzip", large)
	Expect(res.Code).To(Equal(http.StatusRequestEntityTooLarge), "from its length")

	// Without a length, the operator stops reading at the limit.
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPut, path, io.MultiReader(bytes.NewReader(large)))
	req.ContentLength = -1
	req.Header.Set("Content-Type", "application/gzip")
	Expect(h.do(t, "assistant", req).Code).To(Equal(http.StatusRequestEntityTooLarge), "from its chunks")
	Expect(h.host.Claimed()).To(BeEmpty())
}

func TestGetResultPassesOnTheJobHostsResult(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)
	created := decodeRun(t, h.createRun(t, "assistant", createBody(kind, "app", "")))
	path := "/api/v1/runs/" + created.ID + "/result"

	res := h.request(t, "assistant", http.MethodGet, path, "", nil)
	Expect(res.Code).To(Equal(http.StatusConflict), "the run has not finished")

	h.awaitArchive(t, created.ID)
	h.request(t, "assistant", http.MethodPut, "/api/v1/runs/"+created.ID+"/archive", "application/gzip",
		gzipped(t, "app"))
	result := `{"status":"completed","exitCode":0,"timedOut":false,"stdout":"upgraded","stderr":"","report":null,` +
		`"patch":null}`
	h.host.Finish(jobhost.Status{Status: jobhost.StatusCompleted, ExitCode: new(0)}, result)
	h.complete(t, created.ID)

	run := decodeRun(t, h.request(t, "assistant", http.MethodGet, "/api/v1/runs/"+created.ID, "", nil))
	Expect(run.Status).To(Equal(runs.StatusCompleted))
	Expect(run.ResultExpiresAt).NotTo(BeNil())

	res = h.request(t, "assistant", http.MethodGet, path, "", nil)
	Expect(res.Code).To(Equal(http.StatusOK))
	Expect(res.Header().Get("Content-Type")).To(Equal("application/json"))
	Expect(res.Body.String()).To(MatchJSON(result))
	Expect(h.host.FetchCount()).To(Equal(1))

	h.engine.Reach(h.workflowOf(t, created.ID), runs.StepCleanup, engine.StatusCompleted)
	res = h.request(t, "assistant", http.MethodGet, path, "", nil)
	Expect(res.Code).To(Equal(http.StatusGone), "run.cleanup deleted the Job")
}

func TestGetAndCancelRun(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)
	created := decodeRun(t, h.createRun(t, "assistant", createBody(kind, "app", "")))

	res := h.request(t, "assistant", http.MethodGet, "/api/v1/runs/"+created.ID+"?wait=0", "", nil)
	Expect(res.Code).To(Equal(http.StatusOK))
	Expect(decodeRun(t, res).Status).To(Equal(runs.StatusQueued))

	res = h.request(t, "designer", http.MethodGet, "/api/v1/runs/"+created.ID, "", nil)
	Expect(res.Code).To(Equal(http.StatusNotFound), "another caller's run")
	res = h.request(t, "assistant", http.MethodGet, "/api/v1/runs/nope", "", nil)
	Expect(res.Code).To(Equal(http.StatusNotFound))
	res = h.request(t, "assistant", http.MethodGet, "/api/v1/runs/"+created.ID+"?wait=-1", "", nil)
	Expect(res.Code).To(Equal(http.StatusBadRequest))

	res = h.request(t, "assistant", http.MethodPost, "/api/v1/runs/"+created.ID+"/cancel", "", nil)
	Expect(res.Code).To(Equal(http.StatusAccepted))
	Expect(decodeRun(t, res).Status).To(Equal(runs.StatusCanceled))

	for _, workflow := range h.engine.Workflows() {
		h.engine.Update(workflow.State.DatabaseID, func(w *engine.Workflow) { w.OverallStatus = engine.StatusCanceled })
	}
	res = h.request(t, "assistant", http.MethodPost, "/api/v1/runs/"+created.ID+"/cancel", "", nil)
	Expect(res.Code).To(Equal(http.StatusOK))
	res = h.request(t, "assistant", http.MethodGet, "/api/v1/runs/"+created.ID+"/result", "", nil)
	Expect(res.Code).To(Equal(http.StatusConflict), "a canceled run has no result")

	// A create after the run has ended starts a new run.
	res = h.createRun(t, "assistant", createBody(kind, "app", ""))
	Expect(res.Code).To(Equal(http.StatusAccepted))
	Expect(decodeRun(t, res).ID).NotTo(Equal(created.ID))
}

func TestListKinds(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)

	res := h.request(t, "assistant", http.MethodGet, "/api/v1/kinds", "", nil)
	Expect(res.Code).To(Equal(http.StatusOK))
	Expect(res.Body.String()).To(MatchJSON(`{"kinds":[
		{"name":"upgrade-v9","args":[],"queueTimeoutSeconds":900,"uploadTimeoutSeconds":300,"runTimeoutSeconds":660,
			"resultTimeoutSeconds":300,"maxDurationSeconds":4380},
		{"name":"with-args","args":["mode","target"],"queueTimeoutSeconds":900,"uploadTimeoutSeconds":300,
			"runTimeoutSeconds":660,"resultTimeoutSeconds":300,"maxDurationSeconds":4380}
	]}`))

	res = h.request(t, "designer", http.MethodGet, "/api/v1/kinds", "", nil)
	Expect(res.Body.String()).To(MatchJSON(`{"kinds":[]}`))
}
