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
	namespace  = "sandbox-runs"
	// timeScale cuts the operator's rechecks and its upload timeout to a hundredth. The upload timeout is 3 seconds.
	timeScale = 0.01
)

// TestRunsAgainstTheEngine runs the operator with its real wiring against the engine host, built from its source.
// The sandbox and the operator runner are in memory. It checks what only the real engine does, as the operator's
// README lists under Develop.
func TestRunsAgainstTheEngine(t *testing.T) {
	RegisterTestingT(t)
	postgres := os.Getenv(postgresEnv)
	assets := envtestAssets()
	if postgres == "" || assets == "" {
		t.Skipf("run make test-integration, which sets %s and installs envtest", postgresEnv)
	}
	environment := &envtest.Environment{BinaryAssetsDirectory: assets}
	restConfig, err := environment.Start()
	Expect(err).NotTo(HaveOccurred())
	t.Cleanup(func() { Expect(environment.Stop()).To(Succeed()) })
	clientset, err := kubernetes.NewForConfig(restConfig)
	Expect(err).NotTo(HaveOccurred())

	cfg, err := config.LoadFrom(t.TempDir())
	Expect(err).NotTo(HaveOccurred())
	cfg.TimeScale = timeScale
	cfg.APIAddress, cfg.CallbackAddress, cfg.ProbeAddress = freeAddress(t), freeAddress(t), freeAddress(t)
	engine := "core-operator-workflow-engine"
	engineToken := tokenFor(t, clientset, engine, engine, "core-operator")
	cfg.EngineURL = "http://" + startEngine(t, postgres, cfg.CallbackAddress, engineToken)
	upgrade := config.Kind{
		Namespace: namespace, PodTemplate: "operator-runner", Command: "upgrade-v9", RequiresArchive: true,
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
		"designer": {ServiceAccount: "system:serviceaccount:default:designer", Kinds: []string{"upgrade"}},
	}

	box := sandboxtest.New()
	box.SlotCount = 10
	hosts := &runners{byRun: map[string]*runnertest.Runner{}}
	mux := http.NewServeMux()
	mux.Handle("/runs/{id}/", hosts)
	mux.Handle("/runs/{id}", hosts)
	hostServer := httptest.NewServer(mux)
	t.Cleanup(hostServer.Close)
	t.Cleanup(hosts.close)
	hostAddress, ok := hostServer.Listener.Addr().(*net.TCPAddr)
	Expect(ok).To(BeTrue())
	hostClient := runner.NewClient(http.DefaultClient, hostAddress.Port, box)
	stop := startOperator(t, restConfig, cfg, box, hostClient)
	t.Cleanup(func() { stop() })

	c := &client{
		api: "http://" + cfg.APIAddress, engine: cfg.EngineURL,
		token: tokenFor(t, clientset, "default", "assistant", "core-operator"),
	}
	designer := &client{api: c.api, token: tokenFor(t, clientset, "default", "designer", "core-operator")}
	// Only a caller's token for the operator opens the run API, and only the engine's token opens the callbacks.
	for token, want := range map[string]int{
		"":          http.StatusUnauthorized,
		engineToken: http.StatusForbidden,
		tokenFor(t, clientset, "default", "someone-else", "core-operator"):               http.StatusForbidden,
		tokenFor(t, clientset, "default", "assistant", "https://kubernetes.default.svc"): http.StatusUnauthorized,
	} {
		Expect((&client{api: c.api, token: token}).call(http.MethodGet, "/api/v1/kinds", "", nil)).To(Equal(want))
	}
	callbacks := &client{api: "http://" + cfg.CallbackAddress, token: c.token}
	Expect(callbacks.call(http.MethodPost, "/workflow-engine-callbacks/run.admit", "", []byte(`{}`))).
		To(Equal(http.StatusForbidden), "a caller's token")
	// The labels are new for each test, so a Postgres that a test used before has no runs of them.
	app := func(name string) map[string]string {
		return map[string]string{"app": fmt.Sprintf("%s-%x", name, time.Now().UnixNano())}
	}
	ready := func(runID string) {
		Eventually(func() bool { _, ok := box.Job(namespace, runID); return ok }).Should(BeTrue())
		box.SetPod(namespace, runID, sandbox.Pod{Status: sandbox.PodReady, IP: "127.0.0.1"})
	}
	archive := gzipped(t, "app")

	t.Run("a run completes, and a create after its end makes a new run", func(t *testing.T) {
		RegisterTestingT(t)
		labels := app("app")
		created := c.create("upgrade", labels, http.StatusAccepted)
		Expect(created.Status).To(Equal(runs.StatusQueued))
		again := c.create("upgrade", map[string]string{"app": strings.ToUpper(labels["app"])}, http.StatusOK)
		Expect(again.ID).To(Equal(created.ID), "label values are compared without case")
		path := "/api/v1/runs/" + created.ID
		Expect(c.call(http.MethodPut, path+"/archive", "application/gzip", archive)).To(Equal(http.StatusConflict))

		ready(created.ID)
		c.await(created.ID, runs.StatusAwaitingArchive)
		job, _ := box.Job(namespace, created.ID)
		Expect(job).To(Equal(sandbox.Job{
			RunID: created.ID, Kind: "upgrade", Caller: "assistant", Namespace: namespace,
			Template: "operator-runner", Deadline: config.JobDeadline(time.Minute),
		}))
		Expect(c.call(http.MethodPut, path+"/archive", "application/json", archive)).
			To(Equal(http.StatusUnsupportedMediaType))
		Expect(c.call(http.MethodPut, path+"/archive", "application/gzip", []byte("PK\x03\x04"))).
			To(Equal(http.StatusBadRequest), "the operator runner refuses a body that is not gzip")
		Expect(designer.call(http.MethodPut, path+"/archive", "application/gzip", archive)).
			To(Equal(http.StatusNotFound), "another caller's run")
		large := make([]byte, runs.MaxArchiveBytes+1)
		Expect(c.call(http.MethodPut, path+"/archive", "application/gzip", large)).
			To(Equal(http.StatusRequestEntityTooLarge), "from its length")
		Expect(c.call(http.MethodPut, path+"/archive", "application/gzip", io.MultiReader(bytes.NewReader(large)))).
			To(Equal(http.StatusRequestEntityTooLarge), "from its chunks")
		Expect(hosts.of(created.ID).Claimed()).To(BeEmpty())
		Expect(c.call(http.MethodPut, path+"/archive", "Application/GZIP; x=y", archive)).To(Equal(http.StatusAccepted))
		Expect(c.call(http.MethodPut, path+"/archive", "application/gzip", gzipped(t, "again"))).
			To(Equal(http.StatusAccepted), "an upload that comes again")
		runID, command, received, starts := hosts.of(created.ID).Snapshot()
		Expect([]any{runID, command, received, starts}).To(Equal([]any{created.ID, "upgrade-v9", archive, 2}))

		Expect(c.call(http.MethodGet, path+"/result", "", nil)).To(Equal(http.StatusConflict), "the run runs")
		result := `{"status":"completed","exitCode":0,"report":{"exitCode":0,"steps":[]},"patch":"cGF0Y2g="}`
		hosts.of(created.ID).Finish(runner.Status{Status: runner.StatusCompleted, ExitCode: new(0)}, result)
		completed := c.await(created.ID, runs.StatusCompleted)
		Expect(completed.ResultExpiresAt).NotTo(BeNil())
		Expect(completed.Error).To(BeNil())
		Expect(c.read(path + "/result")).To(MatchJSON(result))
		Expect(hosts.of(created.ID).FetchCount()).To(Equal(1), "the steps read the status, which is no fetch")

		// The operator runner exits after the grace, and run.cleanup deletes the Job with the result.
		box.SetPod(namespace, created.ID, sandbox.Pod{Status: sandbox.PodEnded, IP: "127.0.0.1"})
		Eventually(func() bool { _, ok := box.Job(namespace, created.ID); return ok }, 10*time.Second).Should(BeFalse())
		Eventually(func() int { return c.call(http.MethodGet, path+"/result", "", nil) }).
			Should(Equal(http.StatusGone), "once the engine has ended the workflow")
		Expect(c.await(created.ID, runs.StatusCompleted).ResultExpiresAt).To(BeNil(), "the result is gone")

		next := c.create("upgrade", labels, http.StatusAccepted)
		Expect(next.ID).NotTo(Equal(created.ID))
		var found struct {
			Runs []runs.Run `json:"runs"`
		}
		Expect(json.Unmarshal([]byte(c.read("/api/v1/runs?labelSelector=app="+labels["app"])), &found)).To(Succeed())
		Expect(
			[]string{found.Runs[0].ID, found.Runs[1].ID},
		).To(Equal([]string{next.ID, created.ID}), "the newest first")
		c.cancel(next.ID)
	})

	t.Run("a queued run expires", func(t *testing.T) {
		RegisterTestingT(t)
		// The pod of the first run never gets ready, so the run keeps the kind's one place.
		first := c.create("one-at-a-time", app("first"), http.StatusAccepted)
		c.await(first.ID, runs.StatusStarting)
		queued := c.create("one-at-a-time", app("queued"), http.StatusAccepted)
		Expect(*queued.QueuePosition).To(Equal(1))
		expired := c.await(queued.ID, runs.StatusExpired)
		Expect(expired.Error).To(Equal(&runs.RunError{
			Reason: runs.ReasonQueueTimeout, Detail: "The run waited in the queue longer than its kind allows.",
		}))
		c.cancel(first.ID)
	})

	t.Run("a run fails when no archive arrives", func(t *testing.T) {
		RegisterTestingT(t)
		run := c.create("upgrade", app("silent"), http.StatusAccepted)
		ready(run.ID)
		failed := c.await(run.ID, runs.StatusFailed)
		Expect(failed.Error).To(Equal(&runs.RunError{
			Reason: runs.ReasonArchiveTimeout, Detail: "No archive arrived within the upload timeout of the kind.",
		}))
	})

	t.Run("a run fails when a step fails", func(t *testing.T) {
		RegisterTestingT(t)
		run := c.create("upgrade", app("broken"), http.StatusAccepted)
		ready(run.ID)
		box.SetPod(namespace, run.ID, sandbox.Pod{Status: sandbox.PodEnded, Detail: "run-x is Failed"})
		failed := c.await(run.ID, runs.StatusFailed)
		Expect(failed.Error).To(Equal(&runs.RunError{
			Reason: runs.ReasonStartFailed, Detail: "The pod stopped before it was ready: run-x is Failed",
		}))
	})

	t.Run("a cancel deletes the Job", func(t *testing.T) {
		RegisterTestingT(t)
		run := c.create("upgrade", app("canceled"), http.StatusAccepted)
		ready(run.ID)
		c.await(run.ID, runs.StatusAwaitingArchive)
		c.cancel(run.ID)
		_, ok := box.Job(namespace, run.ID)
		Expect(ok).To(BeFalse())
		Eventually(func() int { return c.call(http.MethodPost, "/api/v1/runs/"+run.ID+"/cancel", "", nil) }).
			Should(Equal(http.StatusOK), "the engine has canceled the workflow")
		Expect(c.call(http.MethodGet, "/api/v1/runs/"+run.ID+"/result", "", nil)).To(Equal(http.StatusConflict))
	})

	t.Run("a run outlives a restart of the operator", func(t *testing.T) {
		RegisterTestingT(t)
		run := c.create("upgrade", app("restart"), http.StatusAccepted)
		ready(run.ID)
		c.await(run.ID, runs.StatusAwaitingArchive)
		stop()
		stop = startOperator(t, restConfig, cfg, box, hostClient)
		Expect(c.call(http.MethodPut, "/api/v1/runs/"+run.ID+"/archive", "application/gzip", archive)).
			To(Equal(http.StatusAccepted))
		hosts.of(run.ID).Finish(runner.Status{Status: runner.StatusCompleted, ExitCode: new(0)}, `{}`)
		c.await(run.ID, runs.StatusCompleted)
	})
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
