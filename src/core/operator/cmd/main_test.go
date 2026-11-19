package main

import (
	"bytes"
	"context"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
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
	"altinn.studio/core-operator/internal/runapi"
	"altinn.studio/core-operator/internal/runner"
)

func TestSpanNameIsTheRouteWithoutIDs(t *testing.T) {
	routes := runapi.New(nil).Routes()
	run := "/api/v1/runs/0b6f5a52-5f0b-5d3e-9a4b-2c7d8e9f0a1b"
	for request, want := range map[string]string{
		"GET /api/v1/kinds":          "GET /api/v1/kinds",
		"POST " + run + "/cancel":    "POST /api/v1/runs/{runId}/cancel",
		"GET " + run + "/result/x":   "GET",
		"X-RUN-ID " + run + "/value": "HTTP",
	} {
		method, target, _ := strings.Cut(request, " ")
		if got := spanName(routes, httptest.NewRequestWithContext(t.Context(), method, target, nil)); got != want {
			t.Errorf("spanName(%q) = %q, want %q", request, got, want)
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

// tokenFor requests a projected ServiceAccount token from the API server, as the kubelet mounts it in the pod of a
// caller.
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

// servedOperator is the operator process against a real API server and a fake engine, with the caller assistant and the
// kind x. Callers and the engine send ServiceAccount tokens from the API server, and the operator reviews them.
type servedOperator struct {
	runAPI    string
	callback  string
	readiness string
	// Tokens with the operator audience for the caller, the engine and a ServiceAccount that is neither. forAPIServer
	// is the token of the caller with the API server audience.
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
		Namespace: "core-operator-runners", PodTemplate: "operator-runner", Command: "x",
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
	// The run API starts to listen after the cache sync. The probes answer before that.
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
		Expect(body).To(MatchJSON(`{"kinds":[{"name":"x","labels":[],"queueTimeoutSeconds":60,` +
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
