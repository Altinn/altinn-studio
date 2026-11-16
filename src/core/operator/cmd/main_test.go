package main

import (
	"net"
	"os"
	"path/filepath"
	"strings"
	"testing"

	authenticationv1 "k8s.io/api/authentication/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
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
