package main

import (
	"net"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	authenticationv1 "k8s.io/api/authentication/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"

	"altinn.studio/core-operator/internal/runapi"
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
