package main

import (
	"bytes"
	"context"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	. "github.com/onsi/gomega"
	authenticationv1 "k8s.io/api/authentication/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine/enginetest"
	"altinn.studio/core-operator/internal/kube"
	"altinn.studio/core-operator/internal/runner"
)

func TestRouteLeavesOutIDs(t *testing.T) {
	cases := map[string]string{
		"/api/v1/kinds": "/api/v1/kinds",
		"/api/v1/runs":  "/api/v1/runs",
		"/api/v1/runs/0b6f5a52-5f0b-5d3e-9a4b-2c7d8e9f0a1b":          "/api/v1/runs/{runId}",
		"/api/v1/runs/0b6f5a52-5f0b-5d3e-9a4b-2c7d8e9f0a1b/cancel":   "/api/v1/runs/{runId}/cancel",
		"/workflow-engine-callbacks/run.admit":                       "/workflow-engine-callbacks/{commandKey}",
		"/api/v1/runs/0b6f5a52-5f0b-5d3e-9a4b-2c7d8e9f0a1b/result/x": "",
		"/private/value": "",
	}
	for path, want := range cases {
		if got := route(path); got != want {
			t.Errorf("route(%q) = %q, want %q", path, got, want)
		}
	}
}

func TestSpanNameLeavesOutUnknownMethods(t *testing.T) {
	for method, want := range map[string]string{"GET": "GET /api/v1/kinds", "X-RUN-ID": "HTTP /api/v1/kinds"} {
		if got := spanName(method, "/api/v1/kinds"); got != want {
			t.Errorf("spanName(%q) = %q, want %q", method, got, want)
		}
	}
}

func envtestAssets() string {
	if dir := os.Getenv("KUBEBUILDER_ASSETS"); dir != "" {
		return dir
	}
	entries, err := os.ReadDir(filepath.Join("..", "bin", "k8s"))
	if err != nil {
		return ""
	}
	for _, entry := range entries {
		if entry.IsDir() {
			return filepath.Join("..", "bin", "k8s", entry.Name())
		}
	}
	return ""
}

func freeAddress(t *testing.T) string {
	t.Helper()
	var listenConfig net.ListenConfig
	listener, err := listenConfig.Listen(t.Context(), "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	address := listener.Addr().String()
	if err := listener.Close(); err != nil {
		t.Fatal(err)
	}
	return address
}

// tokenFor asks the API server for a projected ServiceAccount token, as the kubelet mounts it in a caller's pod.
func tokenFor(t *testing.T, clientset kubernetes.Interface, namespace, name, audience string) string {
	t.Helper()
	ctx := t.Context()
	_, err := clientset.CoreV1().Namespaces().Create(ctx,
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}}, metav1.CreateOptions{})
	if err != nil && !strings.Contains(err.Error(), "already exists") {
		t.Fatal(err)
	}
	_, err = clientset.CoreV1().ServiceAccounts(namespace).Create(ctx,
		&corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: name}}, metav1.CreateOptions{})
	if err != nil && !strings.Contains(err.Error(), "already exists") {
		t.Fatal(err)
	}
	request := &authenticationv1.TokenRequest{Spec: authenticationv1.TokenRequestSpec{Audiences: []string{audience}}}
	response, err := clientset.CoreV1().
		ServiceAccounts(namespace).
		CreateToken(ctx, name, request, metav1.CreateOptions{})
	if err != nil {
		t.Fatal(err)
	}
	return response.Status.Token
}

func call(t *testing.T, method, url, token string, body []byte) (int, string) {
	t.Helper()
	req, err := http.NewRequestWithContext(t.Context(), method, url, bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, err.Error()
	}
	defer func() {
		if closeErr := res.Body.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	}()
	data, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}
	return res.StatusCode, string(data)
}

// startAPIServer starts a Kubernetes API server with envtest, until the test ends.
func startAPIServer(t *testing.T, assets string) (*rest.Config, kubernetes.Interface) {
	t.Helper()
	environment := &envtest.Environment{BinaryAssetsDirectory: assets}
	restConfig, err := environment.Start()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if stopErr := environment.Stop(); stopErr != nil {
			t.Error(stopErr)
		}
	})
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		t.Fatal(err)
	}
	return restConfig, clientset
}

// servedOperator is the operator's process against a real API server and a fake engine, with the caller assistant
// and a kind x. Callers and the engine send ServiceAccount tokens that the API server issued, and the operator reviews
// them.
type servedOperator struct {
	runAPI    string
	callback  string
	readiness string
	// The tokens for the operator's audience of the caller, of the engine and of a ServiceAccount that is neither,
	// and the caller's token for the API server's audience.
	assistant, engine, stranger, forAPIServer string
}

func serveOperator(t *testing.T) *servedOperator {
	t.Helper()
	assets := envtestAssets()
	if assets == "" {
		t.Skip("envtest binaries not found: run make test, or make setup-envtest first")
	}
	restConfig, clientset := startAPIServer(t, assets)
	fakeEngine := enginetest.New(time.Now)
	t.Cleanup(fakeEngine.Close)

	cfg, err := config.LoadFrom(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	cfg.EngineURL = fakeEngine.URL()
	cfg.APIAddress = freeAddress(t)
	cfg.CallbackAddress = freeAddress(t)
	cfg.ProbeAddress = freeAddress(t)
	cfg.Callers = map[string]config.Caller{
		"assistant": {ServiceAccount: "system:serviceaccount:default:altinn-altinity-agents-sa", Kinds: []string{"x"}},
	}
	cfg.Kinds = map[string]config.Kind{"x": {
		Namespace: "core-operator-runners", PodTemplate: "operator-runner", Command: "x", RequiresArchive: true,
		MaxActivePerCaller: 1, MaxQueuedPerCaller: 1, QueueTimeout: time.Minute, RunTimeout: time.Minute,
	}}

	cluster, err := newCluster(cfg, kube.Options{RESTConfig: restConfig})
	if err != nil {
		t.Fatal(err)
	}
	host := runner.NewClient(http.DefaultClient, runner.Port, cluster.Sandbox())
	if err := setup(cluster, cfg, clock.NewRealClock(), cluster.Sandbox(), host); err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	stopped := make(chan error)
	go func() { stopped <- cluster.Start(ctx) }()
	t.Cleanup(func() {
		cancel()
		if stopErr := <-stopped; stopErr != nil {
			t.Error(stopErr)
		}
	})

	engine := "operator-workflow-engine"
	operator := &servedOperator{
		runAPI:       "http://" + cfg.APIAddress + "/api/v1",
		callback:     "http://" + cfg.CallbackAddress + "/workflow-engine-callbacks/run.admit",
		readiness:    "http://" + cfg.ProbeAddress + "/readyz",
		assistant:    tokenFor(t, clientset, "default", "altinn-altinity-agents-sa", "operator"),
		engine:       tokenFor(t, clientset, engine, engine, "operator"),
		stranger:     tokenFor(t, clientset, "default", "someone-else", "operator"),
		forAPIServer: tokenFor(t, clientset, "default", "altinn-altinity-agents-sa", "https://kubernetes.default.svc"),
	}
	// The run API listens once the cache has synced, which is after the probes answer.
	Eventually(func() int {
		status, _ := call(t, http.MethodGet, operator.runAPI+"/kinds", operator.assistant, nil)
		return status
	}, 10*time.Second, 100*time.Millisecond).Should(Equal(http.StatusOK))
	return operator
}

func TestTheOperatorServesItsAPIs(t *testing.T) {
	RegisterTestingT(t)
	operator := serveOperator(t)

	t.Run("the readiness probe answers", func(t *testing.T) {
		RegisterTestingT(t)
		status, _ := call(t, http.MethodGet, operator.readiness, "", nil)
		Expect(status).To(Equal(http.StatusOK))
	})
	t.Run("the run API lists the caller's kinds", func(t *testing.T) {
		RegisterTestingT(t)
		status, body := call(t, http.MethodGet, operator.runAPI+"/kinds", operator.assistant, nil)
		Expect(status).To(Equal(http.StatusOK))
		Expect(body).To(MatchJSON(`{"kinds":[{"name":"x","labels":[],"requiresArchive":true,"queueTimeoutSeconds":60,` +
			`"uploadTimeoutSeconds":300,"runTimeoutSeconds":60,"resultTimeoutSeconds":300,"maxDurationSeconds":2940}]}`))
	})
	t.Run("the run API refuses every token but a caller's", func(t *testing.T) {
		RegisterTestingT(t)
		for name, want := range map[string]struct {
			token  string
			status int
		}{
			"no token":                           {token: "", status: http.StatusUnauthorized},
			"a token for the API server":         {token: operator.forAPIServer, status: http.StatusUnauthorized},
			"a ServiceAccount that is no caller": {token: operator.stranger, status: http.StatusForbidden},
			"the engine's token":                 {token: operator.engine, status: http.StatusForbidden},
		} {
			status, _ := call(t, http.MethodGet, operator.runAPI+"/kinds", want.token, nil)
			Expect(status).To(Equal(want.status), name)
		}
	})
	t.Run("the callbacks refuse a caller's token", func(t *testing.T) {
		RegisterTestingT(t)
		status, _ := call(t, http.MethodPost, operator.callback, operator.assistant, []byte(`{}`))
		Expect(status).To(Equal(http.StatusForbidden))
	})
	t.Run("the callbacks take the engine's token", func(t *testing.T) {
		RegisterTestingT(t)
		payload := []byte(`{"commandKey":"run.admit","context":{"domain":"runs","caller":"assistant",` +
			`"subjectId":"4e1f6a52-5f0b-5d3e-9a4b-2c7d8e9f0a1b"}}`)
		status, body := call(t, http.MethodPost, operator.callback, operator.engine, payload)
		Expect(status).To(Equal(http.StatusUnprocessableEntity), "a run that the operator does not know: %s", body)
	})
}
