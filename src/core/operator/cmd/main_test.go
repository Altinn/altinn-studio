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
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine/enginetest"
	"altinn.studio/core-operator/internal/kube"
)

func TestRouteLeavesOutIDs(t *testing.T) {
	cases := map[string]string{
		"/api/v1/kinds": "/api/v1/kinds",
		"/api/v1/runs":  "/api/v1/runs",
		"/api/v1/runs/0b6f5a52-5f0b-5d3e-9a4b-2c7d8e9f0a1b":        "/api/v1/runs/{runId}",
		"/api/v1/runs/0b6f5a52-5f0b-5d3e-9a4b-2c7d8e9f0a1b/cancel": "/api/v1/runs/{runId}/cancel",
		"/workflow-engine-callbacks/run.admit":                     "/workflow-engine-callbacks/{commandKey}",
	}
	for path, want := range cases {
		if got := route(path); got != want {
			t.Errorf("route(%q) = %q, want %q", path, got, want)
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

// The operator's manager, servers and token checks against a real API server: callers and the engine send
// ServiceAccount tokens that the API server issued, and the operator reviews them.
func TestTheOperatorServesItsAPIs(t *testing.T) {
	RegisterTestingT(t)
	assets := envtestAssets()
	if assets == "" {
		t.Skip("envtest binaries not found: run make test, or make setup-envtest first")
	}

	environment := &envtest.Environment{BinaryAssetsDirectory: assets}
	restConfig, err := environment.Start()
	Expect(err).NotTo(HaveOccurred())
	t.Cleanup(func() {
		if stopErr := environment.Stop(); stopErr != nil {
			t.Error(stopErr)
		}
	})
	clientset, err := kubernetes.NewForConfig(restConfig)
	Expect(err).NotTo(HaveOccurred())

	fakeEngine := enginetest.New(time.Now)
	t.Cleanup(fakeEngine.Close)
	cfg, err := config.LoadFrom(t.TempDir())
	Expect(err).NotTo(HaveOccurred())
	cfg.EngineURL = fakeEngine.URL()
	cfg.APIAddress = freeAddress(t)
	cfg.CallbackAddress = freeAddress(t)
	cfg.ProbeAddress = freeAddress(t)
	cfg.Callers = map[string]config.Caller{
		"assistant": {ServiceAccount: "system:serviceaccount:default:altinn-altinity-agents-sa", Kinds: []string{"x"}},
	}
	cfg.Kinds = map[string]config.Kind{"x": {
		Namespace: "sandbox-runs", PodTemplate: "operator-runner", Command: "x", RequiresArchive: true,
		MaxActive: 1, MaxActivePerCaller: 1, MaxQueuedPerCaller: 1, QueueTimeout: time.Minute, RunTimeout: time.Minute,
	}}

	cluster, err := newCluster(cfg, false, kube.Options{RESTConfig: restConfig})
	Expect(err).NotTo(HaveOccurred())
	Expect(setup(cluster, cfg, clock.NewRealClock())).To(Succeed())
	ctx, cancel := context.WithCancel(context.Background())
	stopped := make(chan error)
	go func() { stopped <- cluster.Start(ctx) }()
	t.Cleanup(func() {
		cancel()
		if stopErr := <-stopped; stopErr != nil {
			t.Error(stopErr)
		}
	})

	assistant := tokenFor(t, clientset, "default", "altinn-altinity-agents-sa", "core-operator")
	engineToken := tokenFor(t, clientset, "operator-workflow-engine", "operator-workflow-engine", "core-operator")
	stranger := tokenFor(t, clientset, "default", "someone-else", "core-operator")
	apiServerToken := tokenFor(t, clientset, "default", "altinn-altinity-agents-sa", "https://kubernetes.default.svc")

	api := "http://" + cfg.APIAddress
	callbacks := "http://" + cfg.CallbackAddress + "/workflow-engine-callbacks/run.admit"
	Eventually(func() int {
		status, _ := call(t, http.MethodGet, "http://"+cfg.ProbeAddress+"/readyz", "", nil)
		return status
	}, 10*time.Second, 100*time.Millisecond).Should(Equal(http.StatusOK))
	Eventually(func() int {
		status, _ := call(t, http.MethodGet, api+"/api/v1/kinds", assistant, nil)
		return status
	}, 10*time.Second, 100*time.Millisecond).Should(Equal(http.StatusOK))

	status, body := call(t, http.MethodGet, api+"/api/v1/kinds", assistant, nil)
	Expect(status).To(Equal(http.StatusOK))
	Expect(
		body,
	).To(MatchJSON(`{"kinds":[{"name":"x","labels":[],"requiresArchive":true,"queueTimeoutSeconds":60,` +
		`"uploadTimeoutSeconds":300,"runTimeoutSeconds":60,"resultTimeoutSeconds":300,"maxDurationSeconds":2940}]}`))

	status, _ = call(t, http.MethodGet, api+"/api/v1/kinds", "", nil)
	Expect(status).To(Equal(http.StatusUnauthorized))
	status, _ = call(t, http.MethodGet, api+"/api/v1/kinds", apiServerToken, nil)
	Expect(status).To(Equal(http.StatusUnauthorized), "a token for the API server")
	status, _ = call(t, http.MethodGet, api+"/api/v1/kinds", stranger, nil)
	Expect(status).To(Equal(http.StatusForbidden))
	status, _ = call(t, http.MethodGet, api+"/api/v1/kinds", engineToken, nil)
	Expect(status).To(Equal(http.StatusForbidden))

	status, _ = call(t, http.MethodPost, callbacks, assistant, []byte(`{}`))
	Expect(status).To(Equal(http.StatusForbidden))
	payload := []byte(`{"commandKey":"run.admit","context":{"domain":"runs","caller":"assistant",` +
		`"subjectId":"4e1f6a52-5f0b-5d3e-9a4b-2c7d8e9f0a1b"}}`)
	status, body = call(t, http.MethodPost, callbacks, engineToken, payload)
	Expect(status).To(Equal(http.StatusUnprocessableEntity), "a run the operator does not know: %s", body)
}
