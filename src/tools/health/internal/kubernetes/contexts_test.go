package kubernetes_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/runtime-health/internal/kubernetes"
)

const testKubeconfig = `apiVersion: v1
kind: Config
clusters:
- name: custom-cluster
  cluster:
    server: https://example.test
users:
- name: custom-user
  user:
    token: test
contexts:
- name: custom-context
  context:
    cluster: custom-cluster
    user: custom-user
current-context: custom-context
`

func TestListContextsUsesDefaultKubeconfig(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	writeTestKubeconfig(t, filepath.Join(home, ".kube", "config"))

	contexts, err := kubernetes.ListContexts("")
	if err != nil {
		t.Fatalf("ListContexts() error = %v", err)
	}
	assertCustomContext(t, contexts)
}

func TestListContextsUsesCustomKubeconfig(t *testing.T) {
	path := filepath.Join(t.TempDir(), "selected-config")
	writeTestKubeconfig(t, path)

	contexts, err := kubernetes.ListContexts(path)
	if err != nil {
		t.Fatalf("ListContexts() error = %v", err)
	}
	assertCustomContext(t, contexts)
}

func TestListContextsAllowsMissingCustomKubeconfig(t *testing.T) {
	path := filepath.Join(t.TempDir(), "new-config")

	contexts, err := kubernetes.ListContexts(path)
	if err != nil {
		t.Fatalf("ListContexts() error = %v", err)
	}
	if len(contexts) != 0 {
		t.Fatalf("ListContexts() = %#v, want no contexts", contexts)
	}
}

func TestListContextsRejectsMissingCustomKubeconfigParent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "missing", "new-config")

	_, err := kubernetes.ListContexts(path)
	if err == nil || !strings.Contains(err.Error(), "parent directory") {
		t.Fatalf("ListContexts() error = %v, want clear parent directory error", err)
	}
}

func writeTestKubeconfig(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("create kubeconfig directory: %v", err)
	}
	if err := os.WriteFile(path, []byte(testKubeconfig), 0o600); err != nil {
		t.Fatalf("write kubeconfig: %v", err)
	}
}

func assertCustomContext(t *testing.T, contexts []kubernetes.ContextInfo) {
	t.Helper()
	want := kubernetes.ContextInfo{Name: "custom-context", User: "custom-user", Cluster: "custom-cluster"}
	if len(contexts) != 1 || contexts[0] != want {
		t.Fatalf("ListContexts() = %#v, want %#v", contexts, []kubernetes.ContextInfo{want})
	}
}
