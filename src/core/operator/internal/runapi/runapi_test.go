package runapi

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/auth"
	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/engine/enginetest"
	"altinn.studio/core-operator/internal/runner"
	"altinn.studio/core-operator/internal/runs"
	"altinn.studio/core-operator/internal/sandbox/sandboxtest"
)

const (
	kind   = "upgrade-v9"
	commit = "0123456789abcdef0123456789abcdef01234567"
)

type apiHarness struct {
	clock   *clock.FakeClock
	engine  *enginetest.Engine
	handler http.Handler
}

func newAPI(t *testing.T) *apiHarness {
	t.Helper()
	clk := clock.NewFakeClockAt(time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC))
	fakeEngine := enginetest.New(clk.Now)
	t.Cleanup(fakeEngine.Close)
	kindConfig := config.Kind{
		Namespace: "sandbox-runs", PodTemplate: "operator-runner", Command: kind, RequiresArchive: true,
		Labels:             []string{"org", "app", "repoOwner", "repo", "commit"},
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
	service := runs.NewService(cfg, queue, engine.NewClient(fakeEngine.URL(), http.DefaultClient),
		runner.NewClient(http.DefaultClient, runner.Port, box), box, clk)
	return &apiHarness{clock: clk, engine: fakeEngine, handler: New(service).Handler()}
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
	body := `{"kind":"` + kindName + `","labels":{"org":"ttd","app":"` + repo + `","repoOwner":"ttd","repo":"` + repo +
		`","commit":"` + commit + `"}`
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

func TestCreateRunStatusCodes(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)

	res := h.createRun(t, "assistant", createBody(kind, "app"))
	Expect(res.Code).To(Equal(http.StatusAccepted), res.Body.String())
	Expect(res.Header().Get("Content-Type")).To(Equal("application/json"))
	created := decodeRun(t, res)
	Expect(created.Status).To(Equal(runs.StatusQueued))
	Expect(*created.QueuePosition).To(Equal(1))
	Expect(created.Labels).To(Equal(map[string]string{
		"org": "ttd", "app": "app", "repoOwner": "ttd", "repo": "app", "commit": commit,
	}))
	Expect(res.Body.String()).To(ContainSubstring(`"finishedAt":null`))
	Expect(res.Body.String()).To(ContainSubstring(`"resultExpiresAt":null`))
	Expect(res.Body.String()).To(ContainSubstring(`"error":null`))

	// The same kind and labels find the run in progress.
	res = h.createRun(t, "assistant", createBody(kind, "APP"))
	Expect(res.Code).To(Equal(http.StatusOK), res.Body.String())
	Expect(decodeRun(t, res).ID).To(Equal(created.ID))

	Expect(h.createRun(t, "assistant", createBody("upgrade-v10", "app")).Code).To(Equal(http.StatusNotFound))
	Expect(h.createRun(t, "designer", createBody(kind, "app")).Code).To(Equal(http.StatusForbidden))

	h.engine.AtCapacity = true
	res = h.createRun(t, "assistant", createBody(kind, "busy"))
	Expect(res.Code).To(Equal(http.StatusServiceUnavailable))
	Expect(res.Header().Get("Retry-After")).To(Equal("5"))
	h.engine.AtCapacity = false

	// maxQueuedPerCaller is 2.
	Expect(h.createRun(t, "assistant", createBody(kind, "busy")).Code).To(Equal(http.StatusAccepted))
	res = h.createRun(t, "assistant", createBody(kind, "third"))
	Expect(res.Code).To(Equal(http.StatusTooManyRequests))
}

func TestCreateRunRefusesBadRequests(t *testing.T) {
	h := newAPI(t)
	labels := `"labels":{"org":"ttd","app":"app","repoOwner":"ttd","repo":"app","commit":"` + commit + `"}`
	cases := map[string]string{
		"bad kind":       `{"kind":"Upgrade V9",` + labels + `}`,
		"unknown field":  `{"kind":"upgrade-v9","command":"sh",` + labels + `}`,
		"not JSON":       `kind=upgrade-v9`,
		"no labels":      `{"kind":"upgrade-v9"}`,
		"the old source": `{"kind":"upgrade-v9","source":{"org":"ttd"}}`,
		"missing label":  `{"kind":"upgrade-v9","labels":{"org":"ttd","app":"app","repoOwner":"ttd","repo":"app"}}`,
		"bad repo":       `{"kind":"upgrade-v9","labels":{"org":"ttd","app":"app","repoOwner":"ttd","repo":"../x","commit":"` + commit + `"}}`,
		"unknown label":  `{"kind":"upgrade-v9","labels":{"org":"ttd","app":"app","repoOwner":"ttd","repo":"app","commit":"` + commit + `","branch":"main"}}`,
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
		"?kind=Upgrade",
	} {
		res = h.request(t, "assistant", http.MethodGet, "/api/v1/runs"+query, "", nil)
		Expect(res.Code).To(Equal(http.StatusBadRequest), query)
	}
}

func TestGetAndCancelRun(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)
	created := decodeRun(t, h.createRun(t, "assistant", createBody(kind, "app")))

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
	res = h.createRun(t, "assistant", createBody(kind, "app"))
	Expect(res.Code).To(Equal(http.StatusAccepted))
	Expect(decodeRun(t, res).ID).NotTo(Equal(created.ID))
}

func TestListKinds(t *testing.T) {
	RegisterTestingT(t)
	h := newAPI(t)

	res := h.request(t, "assistant", http.MethodGet, "/api/v1/kinds", "", nil)
	Expect(res.Code).To(Equal(http.StatusOK))
	Expect(res.Body.String()).To(MatchJSON(`{"kinds":[
		{"name":"upgrade-v9","labels":["org","app","repoOwner","repo","commit"],"requiresArchive":true,
			"queueTimeoutSeconds":900,"uploadTimeoutSeconds":300,"runTimeoutSeconds":660,"resultTimeoutSeconds":300,
			"maxDurationSeconds":4380}
	]}`))

	res = h.request(t, "designer", http.MethodGet, "/api/v1/kinds", "", nil)
	Expect(res.Body.String()).To(MatchJSON(`{"kinds":[]}`))
}
