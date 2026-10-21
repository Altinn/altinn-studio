package kubernetes_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"

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

func TestPruneContextsPreservesSharedEntriesAndNewCredentials(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config")
	writeTestKubeconfig(t, path)
	candidates, err := kubernetes.ListContexts(path)
	if err != nil {
		t.Fatal(err)
	}
	// Simulate credentials added after initial discovery, including a shared user/cluster.
	config, err := clientcmd.LoadFromFile(path)
	if err != nil {
		t.Fatal(err)
	}
	config.Contexts["alias"] = &api.Context{Cluster: "custom-cluster", AuthInfo: "custom-user", Namespace: "keep"}
	config.Contexts["new-context"] = &api.Context{Cluster: "new-cluster", AuthInfo: "new-user"}
	config.Clusters["new-cluster"] = &api.Cluster{Server: "https://new.example.test"}
	config.AuthInfos["new-user"] = &api.AuthInfo{Token: "new-token"}
	config.CurrentContext = "new-context"
	if writeErr := clientcmd.WriteToFile(*config, path); writeErr != nil {
		t.Fatal(writeErr)
	}
	before, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	backup, err := kubernetes.PruneContexts(path, candidates)
	if err != nil {
		t.Fatal(err)
	}
	got, err := clientcmd.LoadFromFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Contexts) != 2 || got.Contexts["custom-context"] != nil || got.Contexts["alias"].Namespace != "keep" ||
		len(got.Clusters) != 2 || len(got.AuthInfos) != 2 || got.CurrentContext != "new-context" {
		t.Fatalf("pruning changed retained entries: %#v", got)
	}
	backedUp, err := os.ReadFile(backup)
	if err != nil {
		t.Fatal(err)
	}
	if string(backedUp) != string(before) {
		t.Fatal("backup differs from original bytes")
	}
	assertPrivateFiles(t, path, backup)
}

func assertPrivateFiles(t *testing.T, paths ...string) {
	t.Helper()
	for _, path := range paths {
		info, err := os.Stat(path)
		if err != nil {
			t.Fatal(err)
		}
		if info.Mode().Perm() != 0o600 {
			t.Fatalf("%s permissions = %o, want 600", path, info.Mode().Perm())
		}
	}
}

func TestPruneContextsRejectsChangedReferences(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config")
	writeTestKubeconfig(t, path)
	candidates := []kubernetes.ContextInfo{{Name: "custom-context", Cluster: "different-cluster", User: "custom-user"}}
	if _, err := kubernetes.PruneContexts(path, candidates); err == nil {
		t.Fatal("expected error for changed references")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != testKubeconfig {
		t.Fatal("modified config despite changed references")
	}
}

func TestResolveKubeconfigPathPreservesSymlink(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config")
	link := filepath.Join(dir, "link")
	writeTestKubeconfig(t, path)
	if err := os.Symlink(path, link); err != nil {
		t.Fatal(err)
	}
	resolved, err := kubernetes.ResolveKubeconfigPath(link)
	if err != nil {
		t.Fatal(err)
	}
	if resolved != path {
		t.Fatalf("resolved = %q, want %q", resolved, path)
	}
	candidates, err := kubernetes.ListContexts(resolved)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := kubernetes.PruneContexts(resolved, candidates); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Readlink(link); err != nil {
		t.Fatalf("pruning replaced symlink: %v", err)
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
	want := kubernetes.ContextInfo{
		Name:    "custom-context",
		User:    "custom-user",
		Cluster: "custom-cluster",
		Current: true,
	}
	if len(contexts) != 1 || contexts[0] != want {
		t.Fatalf("ListContexts() = %#v, want %#v", contexts, []kubernetes.ContextInfo{want})
	}
}
