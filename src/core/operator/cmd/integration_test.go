package main

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"testing"
	"time"

	. "github.com/onsi/gomega"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/kube"
	"altinn.studio/core-operator/internal/runner"
	"altinn.studio/core-operator/internal/runner/runnertest"
	"altinn.studio/core-operator/internal/runs"
	"altinn.studio/core-operator/internal/sandbox"
	"altinn.studio/core-operator/internal/sandbox/sandboxtest"
)

// postgresEnv holds the connection string of the engine host's Postgres, which make test-integration starts.
const postgresEnv = "OPERATOR_ENGINE_POSTGRES"

const (
	engineHost = "../../operator-workflow-engine/src/WorkflowEngine.Operator"
	namespace  = "core-operator-runners"
	// timeScale cuts the operator's rechecks and its upload timeout to a hundredth. The upload timeout is 3 seconds.
	timeScale = 0.01
)

// TestRunsAgainstTheEngine runs the operator with its real wiring against the engine host, built from its source.
// The sandbox and the operator runner are in memory. It checks what only the real engine does, as the operator's
// README lists under Develop.
func TestRunsAgainstTheEngine(t *testing.T) {
	it := newIntegration(t)
	t.Run("only a caller's token opens the run API, and only the engine's token the callbacks", it.tokens)
	t.Run("a run completes with its Job and its result", it.runCompletes)
	t.Run("run.cleanup deletes the Job, and a create then makes a new run", it.cleanupDeletesTheJob)
	t.Run("a queued run expires", it.queuedRunExpires)
	t.Run("a run fails when no archive arrives", it.runFailsWithoutArchive)
	t.Run("a run fails when a step fails", it.runFailsWhenAStepFails)
	t.Run("a cancel deletes the Job", it.cancelDeletesTheJob)
	t.Run("a run outlives a restart of the operator", it.runOutlivesARestart)
}

// integration is the operator under test, with envtest's API server, the engine host and an in-memory sandbox and
// operator runners.
type integration struct {
	restConfig  *rest.Config
	clientset   kubernetes.Interface
	cfg         *config.Config
	box         *sandboxtest.Sandbox
	runners     *runners
	hostClient  *runner.Client
	stop        func()
	engineToken string
	// assistant calls the run API as the caller assistant.
	assistant *client
	archive   []byte
}

// newIntegration starts the API server, the engine host, the operator runners and the operator until the test ends.
func newIntegration(t *testing.T) *integration {
	t.Helper()
	RegisterTestingT(t)
	postgres := os.Getenv(postgresEnv)
	assets := envtestAssets()
	if postgres == "" || assets == "" {
		t.Skipf("run make test-integration, which sets %s and installs envtest", postgresEnv)
	}
	it := &integration{cfg: testConfig(t), box: sandboxtest.New(), archive: gzipped(t, "app")}
	it.restConfig, it.clientset = startAPIServer(t, assets)
	engine := "operator-workflow-engine"
	it.engineToken = tokenFor(t, it.clientset, engine, engine, "operator")
	it.cfg.EngineURL = "http://" + startEngine(t, postgres, it.cfg.CallbackAddress, it.engineToken)
	it.box.SlotCount = 10
	it.runners, it.hostClient = startRunners(t, it.box)
	it.stop = startOperator(t, it.restConfig, it.cfg, it.box, it.hostClient)
	t.Cleanup(func() { it.stop() })
	it.assistant = &client{
		api: "http://" + it.cfg.APIAddress, engine: it.cfg.EngineURL,
		token: tokenFor(t, it.clientset, "default", "assistant", "operator"),
	}
	return it
}

// testConfig has the kind upgrade, the kind one-at-a-time with one active run and a short queue timeout, and the
// caller assistant.
func testConfig(t *testing.T) *config.Config {
	t.Helper()
	cfg, err := config.LoadFrom(t.TempDir())
	Expect(err).NotTo(HaveOccurred())
	cfg.TimeScale = timeScale
	cfg.APIAddress, cfg.CallbackAddress, cfg.ProbeAddress = freeAddress(t), freeAddress(t), freeAddress(t)
	upgrade := config.Kind{
		Namespace: namespace, PodTemplate: "operator-runner", Command: "upgrade-v9",
		Labels: []string{"app"}, MaxQueuedPerCaller: 10,
		QueueTimeout: time.Minute, RunTimeout: time.Minute,
	}
	oneAtATime := upgrade
	oneAtATime.MaxActivePerCaller, oneAtATime.QueueTimeout = 1, 2*time.Second
	cfg.Kinds = map[string]config.Kind{"upgrade": upgrade, "one-at-a-time": oneAtATime}
	cfg.Callers = map[string]config.Caller{
		"assistant": {
			ServiceAccount: "system:serviceaccount:default:assistant",
			Kinds:          []string{"upgrade", "one-at-a-time"},
		},
	}
	return cfg
}

// startAPIServer starts envtest's API server, which reviews the tokens, until the test ends.
func startAPIServer(t *testing.T, assets string) (*rest.Config, kubernetes.Interface) {
	t.Helper()
	environment := &envtest.Environment{BinaryAssetsDirectory: assets}
	restConfig, err := environment.Start()
	Expect(err).NotTo(HaveOccurred())
	t.Cleanup(func() { Expect(environment.Stop()).To(Succeed()) })
	clientset, err := kubernetes.NewForConfig(restConfig)
	Expect(err).NotTo(HaveOccurred())
	return restConfig, clientset
}

// startRunners serves an in-memory operator runner for each run, behind the one address that the sandbox gives each
// pod, until the test ends. It returns the client that reaches them.
func startRunners(t *testing.T, box *sandboxtest.Sandbox) (*runners, *runner.Client) {
	t.Helper()
	hosts := &runners{byRun: map[string]*runnertest.Runner{}}
	mux := http.NewServeMux()
	mux.Handle("/runs/{id}/", hosts)
	mux.Handle("/runs/{id}", hosts)
	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)
	t.Cleanup(hosts.close)
	address, ok := server.Listener.Addr().(*net.TCPAddr)
	Expect(ok).To(BeTrue())
	return hosts, runner.NewClient(http.DefaultClient, address.Port, box)
}

func (it *integration) tokens(t *testing.T) {
	RegisterTestingT(t)
	for token, want := range map[string]int{
		"":             http.StatusUnauthorized,
		it.engineToken: http.StatusForbidden,
		tokenFor(t, it.clientset, "default", "someone-else", "operator"):                    http.StatusForbidden,
		tokenFor(t, it.clientset, "default", "assistant", "https://kubernetes.default.svc"): http.StatusUnauthorized,
	} {
		Expect((&client{api: it.assistant.api, token: token}).call(http.MethodGet, "/api/v1/kinds", "", nil)).
			To(Equal(want))
	}
	callbacks := &client{api: "http://" + it.cfg.CallbackAddress, token: it.assistant.token}
	Expect(callbacks.call(http.MethodPost, "/workflow-engine-callbacks/run.admit", "", []byte(`{}`))).
		To(Equal(http.StatusForbidden), "a caller's token")
}

func (it *integration) runCompletes(t *testing.T) {
	RegisterTestingT(t)
	assistant := it.assistant
	labels := it.app("app")
	created := assistant.create("upgrade", labels, http.StatusAccepted)
	Expect(created.Status).To(Equal(runs.StatusQueued))
	again := assistant.create("upgrade", map[string]string{"app": strings.ToUpper(labels["app"])}, http.StatusOK)
	Expect(again.ID).To(Equal(created.ID), "label values are compared without case")

	it.ready(created.ID)
	assistant.await(created.ID, runs.StatusAwaitingArchive)
	job, _ := it.box.Job(namespace, created.ID)
	Expect(job).To(Equal(sandbox.Job{
		RunID: created.ID, Kind: "upgrade", Caller: "assistant", Namespace: namespace,
		Template: "operator-runner", Deadline: config.JobDeadline(time.Minute),
	}))
	it.upload(created.ID)
	runID, command, received, starts := it.runners.of(created.ID).Snapshot()
	Expect([]any{runID, command, received, starts}).To(Equal([]any{created.ID, "upgrade-v9", it.archive, 1}))

	path := "/api/v1/runs/" + created.ID + "/result"
	Expect(assistant.call(http.MethodGet, path, "", nil)).To(Equal(http.StatusConflict), "the run runs")
	result := `{"status":"completed","exitCode":0,"report":{"exitCode":0,"steps":[]},"patch":"cGF0Y2g="}`
	it.finish(created.ID, result)
	completed := assistant.await(created.ID, runs.StatusCompleted)
	Expect(completed.ResultExpiresAt).NotTo(BeNil())
	Expect(completed.Error).To(BeNil())
	Expect(assistant.read(path)).To(MatchJSON(result))
	Expect(it.runners.of(created.ID).FetchCount()).To(Equal(1), "the steps read the status, which is no fetch")
}

func (it *integration) cleanupDeletesTheJob(t *testing.T) {
	RegisterTestingT(t)
	assistant := it.assistant
	labels := it.app("cleanup")
	done := assistant.create("upgrade", labels, http.StatusAccepted)
	it.ready(done.ID)
	assistant.await(done.ID, runs.StatusAwaitingArchive)
	it.upload(done.ID)
	it.finish(done.ID, `{}`)
	assistant.await(done.ID, runs.StatusCompleted)

	// The operator runner exits after the grace, and run.cleanup deletes the Job with the result.
	it.box.SetPod(namespace, done.ID, sandbox.Pod{Status: sandbox.PodEnded, IP: "127.0.0.1"})
	Eventually(func() bool { _, ok := it.box.Job(namespace, done.ID); return ok }, 10*time.Second).Should(BeFalse())
	Eventually(func() int { return assistant.call(http.MethodGet, "/api/v1/runs/"+done.ID+"/result", "", nil) }).
		Should(Equal(http.StatusGone), "once the engine has ended the workflow")
	Expect(assistant.await(done.ID, runs.StatusCompleted).ResultExpiresAt).To(BeNil(), "the result is gone")

	next := assistant.create("upgrade", labels, http.StatusAccepted)
	Expect(next.ID).NotTo(Equal(done.ID))
	var found struct {
		Runs []runs.Run `json:"runs"`
	}
	listed := assistant.read("/api/v1/runs?labelSelector=app=" + labels["app"])
	Expect(json.Unmarshal([]byte(listed), &found)).To(Succeed())
	Expect(found.Runs).To(HaveLen(2))
	Expect([]string{found.Runs[0].ID, found.Runs[1].ID}).To(Equal([]string{next.ID, done.ID}), "the newest first")
	assistant.cancel(next.ID)
}

func (it *integration) queuedRunExpires(t *testing.T) {
	RegisterTestingT(t)
	assistant := it.assistant
	// The pod of the first run never gets ready, so the run keeps the kind's one place.
	first := assistant.create("one-at-a-time", it.app("first"), http.StatusAccepted)
	assistant.await(first.ID, runs.StatusStarting)
	queued := assistant.create("one-at-a-time", it.app("queued"), http.StatusAccepted)
	Expect(*queued.QueuePosition).To(Equal(1))
	expired := assistant.await(queued.ID, runs.StatusExpired)
	Expect(expired.Error).To(Equal(&runs.RunError{
		Reason: runs.ReasonQueueTimeout, Detail: "The run waited in the queue longer than its kind allows.",
	}))
	assistant.cancel(first.ID)
}

func (it *integration) runFailsWithoutArchive(t *testing.T) {
	RegisterTestingT(t)
	run := it.assistant.create("upgrade", it.app("silent"), http.StatusAccepted)
	it.ready(run.ID)
	failed := it.assistant.await(run.ID, runs.StatusFailed)
	Expect(failed.Error).To(Equal(&runs.RunError{
		Reason: runs.ReasonArchiveTimeout, Detail: "No archive arrived within the upload timeout of the kind.",
	}))
}

func (it *integration) runFailsWhenAStepFails(t *testing.T) {
	RegisterTestingT(t)
	run := it.assistant.create("upgrade", it.app("broken"), http.StatusAccepted)
	it.ready(run.ID)
	it.box.SetPod(namespace, run.ID, sandbox.Pod{Status: sandbox.PodEnded, Detail: "run-x is Failed"})
	failed := it.assistant.await(run.ID, runs.StatusFailed)
	Expect(failed.Error).To(Equal(&runs.RunError{
		Reason: runs.ReasonStartFailed, Detail: "The pod stopped before it was ready: run-x is Failed",
	}))
}

func (it *integration) cancelDeletesTheJob(t *testing.T) {
	RegisterTestingT(t)
	assistant := it.assistant
	run := assistant.create("upgrade", it.app("canceled"), http.StatusAccepted)
	it.ready(run.ID)
	assistant.await(run.ID, runs.StatusAwaitingArchive)
	assistant.cancel(run.ID)
	_, ok := it.box.Job(namespace, run.ID)
	Expect(ok).To(BeFalse())
	Eventually(func() int { return assistant.call(http.MethodPost, "/api/v1/runs/"+run.ID+"/cancel", "", nil) }).
		Should(Equal(http.StatusOK), "the engine has canceled the workflow")
	Expect(assistant.call(http.MethodGet, "/api/v1/runs/"+run.ID+"/result", "", nil)).To(Equal(http.StatusConflict))
}

func (it *integration) runOutlivesARestart(t *testing.T) {
	RegisterTestingT(t)
	run := it.assistant.create("upgrade", it.app("restart"), http.StatusAccepted)
	it.ready(run.ID)
	it.assistant.await(run.ID, runs.StatusAwaitingArchive)
	it.stop()
	it.stop = startOperator(t, it.restConfig, it.cfg, it.box, it.hostClient)
	it.upload(run.ID)
	it.finish(run.ID, `{}`)
	it.assistant.await(run.ID, runs.StatusCompleted)
}

// app returns labels that are new for each test, so a Postgres that a test used before has no runs of them.
func (it *integration) app(name string) map[string]string {
	return map[string]string{"app": fmt.Sprintf("%s-%x", name, time.Now().UnixNano())}
}

// ready makes the pod of the run's Job ready, once the operator has created the Job.
func (it *integration) ready(runID string) {
	Eventually(func() bool { _, ok := it.box.Job(namespace, runID); return ok }).Should(BeTrue())
	it.box.SetPod(namespace, runID, sandbox.Pod{Status: sandbox.PodReady, IP: "127.0.0.1"})
}

// upload puts the archive of the assistant's run.
func (it *integration) upload(runID string) {
	Expect(it.assistant.call(http.MethodPut, "/api/v1/runs/"+runID+"/archive", "application/gzip", it.archive)).
		To(Equal(http.StatusAccepted))
}

// finish completes the command of the run at its operator runner, with the result.
func (it *integration) finish(runID, result string) {
	it.runners.of(runID).Finish(runner.Status{Status: runner.StatusCompleted, ExitCode: new(0)}, result)
}

// startEngine runs the engine host from its source until the test ends, and returns its address. It calls the
// operator's callbacks at callbackAddress with the engine's token.
func startEngine(t *testing.T, postgres, callbackAddress, token string) string {
	t.Helper()
	tokenFile := filepath.Join(t.TempDir(), "token")
	Expect(os.WriteFile(tokenFile, []byte(token), 0o600)).To(Succeed())
	address := freeAddress(t)
	// The host's folder has the global.json that picks its SDK.
	cmd := exec.CommandContext(context.WithoutCancel(t.Context()), "dotnet", "run", "--no-launch-profile")
	cmd.Dir = engineHost
	cmd.Env = append(os.Environ(),
		"ASPNETCORE_ENVIRONMENT=Development",
		"ASPNETCORE_URLS=http://"+address,
		"ConnectionStrings__WorkflowEngine="+postgres,
		"OperatorCommandSettings__CommandEndpoint=http://"+callbackAddress+"/workflow-engine-callbacks/",
		"OperatorCommandSettings__TokenPath="+tokenFile,
		// Let the engine run a deferred step as soon as the scaled rechecks ask.
		"EngineSettings__MinStepDeferDelay=00:00:00.010",
	)
	// The host writes to the file itself, and the test reads it when it fails.
	output, err := os.Create(filepath.Join(t.TempDir(), "engine.log"))
	Expect(err).NotTo(HaveOccurred())
	cmd.Stdout, cmd.Stderr = output, output
	logged := func() string {
		data, readErr := os.ReadFile(output.Name())
		Expect(readErr).NotTo(HaveOccurred())
		return string(data)
	}
	// dotnet run starts the host as its child, so the test stops the process group.
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	Expect(cmd.Start()).To(Succeed())
	exited := make(chan struct{})
	var exitErr error
	go func() {
		exitErr = cmd.Wait()
		close(exited)
	}()
	t.Cleanup(func() {
		if err := syscall.Kill(-cmd.Process.Pid, syscall.SIGTERM); err != nil {
			t.Error(err)
		}
		<-exited
		if t.Failed() {
			t.Logf("The engine host exited with %v. Its output:\n%s", exitErr, logged())
		}
	})
	Eventually(func() int {
		select {
		case <-exited:
			StopTrying("the engine host exited:\n" + logged()).Now()
		default:
		}
		return status("http://" + address + "/api/v1/health")
	}, 5*time.Minute, 200*time.Millisecond).Should(Equal(http.StatusOK), "the engine host builds and starts")
	return address
}

// startOperator runs the operator with its real wiring until stop or the end of the test.
func startOperator(
	t *testing.T,
	restConfig *rest.Config,
	cfg *config.Config,
	box sandbox.Sandbox,
	host *runner.Client,
) (stop func()) {
	t.Helper()
	cluster, err := newCluster(cfg, kube.Options{RESTConfig: restConfig})
	Expect(err).NotTo(HaveOccurred())
	Expect(setup(cluster, cfg, clock.NewRealClock(), box, host)).To(Succeed())
	ctx, cancel := context.WithCancel(context.WithoutCancel(t.Context()))
	stopped := make(chan error, 1)
	go func() { stopped <- cluster.Start(ctx) }()
	// The run API listens once the cache has synced, which is after the probes answer.
	Eventually(func() int {
		return status("http://" + cfg.APIAddress + "/api/v1/kinds")
	}, 10*time.Second, 50*time.Millisecond).Should(Equal(http.StatusUnauthorized))
	var once sync.Once
	return func() {
		once.Do(func() {
			cancel()
			Expect(<-stopped).To(Succeed())
		})
	}
}

// runners is an operator runner for each run, behind the one address that the in-memory sandbox gives each pod.
type runners struct {
	byRun map[string]*runnertest.Runner
	mu    sync.Mutex
}

func (r *runners) of(runID string) *runnertest.Runner {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.byRun[runID] == nil {
		r.byRun[runID] = runnertest.New()
	}
	return r.byRun[runID]
}

func (r *runners) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	r.of(req.PathValue("id")).Server.Config.Handler.ServeHTTP(w, req)
}

func (r *runners) close() {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, host := range r.byRun {
		host.Close()
	}
}

// client calls the run API as a caller.
type client struct {
	api    string
	engine string
	token  string
}

// do returns the status and the body of the answer. The body is bytes or a reader.
func (c *client) do(method, path, contentType string, body any) (int, string) {
	var reader io.Reader
	switch value := body.(type) {
	case []byte:
		reader = bytes.NewReader(value)
	case io.Reader:
		reader = value
	}
	req, err := http.NewRequestWithContext(context.Background(), method, c.api+path, reader)
	Expect(err).NotTo(HaveOccurred())
	req.Header.Set("Authorization", "Bearer "+c.token)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	res, err := http.DefaultClient.Do(req)
	Expect(err).NotTo(HaveOccurred())
	defer func() { Expect(res.Body.Close()).To(Succeed()) }()
	data, err := io.ReadAll(res.Body)
	Expect(err).NotTo(HaveOccurred())
	return res.StatusCode, string(data)
}

func (c *client) call(method, path, contentType string, body any) int {
	status, _ := c.do(method, path, contentType, body)
	return status
}

func (c *client) read(path string) string {
	status, body := c.do(http.MethodGet, path, "", nil)
	Expect(status).To(Equal(http.StatusOK), body)
	return body
}

func (c *client) create(kind string, labels map[string]string, want int) runs.Run {
	request, err := json.Marshal(runs.CreateRequest{Kind: kind, Labels: labels})
	Expect(err).NotTo(HaveOccurred())
	status, body := c.do(http.MethodPost, "/api/v1/runs", "application/json", request)
	Expect(status).To(Equal(want), body)
	return decode(body)
}

func (c *client) cancel(runID string) {
	status, body := c.do(http.MethodPost, "/api/v1/runs/"+runID+"/cancel", "", nil)
	Expect(status).To(Equal(http.StatusAccepted), body)
	Expect(decode(body).Status).To(Equal(runs.StatusCanceled))
}

// await reads the run until it has the status, and fails at once when the run has ended with another one.
func (c *client) await(runID string, status runs.Status) runs.Run {
	var run runs.Run
	Eventually(func() runs.Status {
		run = decode(c.read("/api/v1/runs/" + runID + "?wait=0"))
		if run.Status != status && run.Status.Final() {
			StopTrying(fmt.Sprintf("the run ended as %s, not %s: %+v\n%s", run.Status, status, run.Error,
				c.workflow(runID))).Now()
		}
		return run.Status
	}, 30*time.Second, 20*time.Millisecond).Should(Equal(status), func() string { return c.workflow(runID) })
	return run
}

// workflow reads the run's workflow from the engine, for a test that fails.
func (c *client) workflow(runID string) string {
	engine := &client{api: c.engine}
	_, body := engine.do(http.MethodGet, "/api/v1/runs-assistant/workflows?label=runId:"+runID, "", nil)
	return "The run's workflow in the engine: " + body
}

func decode(body string) runs.Run {
	var run runs.Run
	Expect(json.Unmarshal([]byte(body), &run)).To(Succeed(), body)
	return run
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

// status is the status code of a GET of url, or 0 when nothing answers yet.
func status(url string) int {
	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, url, nil)
	Expect(err).NotTo(HaveOccurred())
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0
	}
	Expect(res.Body.Close()).To(Succeed())
	return res.StatusCode
}
