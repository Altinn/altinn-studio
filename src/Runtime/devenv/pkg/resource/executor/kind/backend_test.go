package kindbackend

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"

	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/kind/pkg/apis/config/v1alpha4"
)

func TestApplyKindClusterCreatesClusterAndConfiguresCABundleAndRegistryMirrors(t *testing.T) {
	t.Parallel()

	caPath := t.TempDir() + "/ca.pem"
	writeFile(t, caPath, "test-ca")
	var copied []string
	container := mock.New()
	container.ContainerNetworksFunc = func(_ context.Context, nameOrID string) ([]string, error) {
		if nameOrID != "kind-registry" {
			t.Fatalf("ContainerNetworks(%q)", nameOrID)
		}
		return []string{"bridge"}, nil
	}
	container.ExecWithIOFunc = func(
		_ context.Context,
		_ string,
		_ []string,
		stdin io.Reader,
		_, _ io.Writer,
	) error {
		data, err := io.ReadAll(stdin)
		if err != nil {
			return fmt.Errorf("read test stdin: %w", err)
		}
		copied = append(copied, string(data))
		return nil
	}

	kindClient := &fakeKind{nodes: []string{"cluster-control-plane"}}
	kube := &fakeKube{}
	backend := newTestBackend(container, kindClient, kube)
	registry := &resource.Container{Name: "kind-registry"}
	cluster := &resource.KindCluster{
		Name:                "runtime-fixture-kind-minimal",
		TrustedCABundlePath: caPath,
		RegistryMirrors: []resource.KindRegistryMirror{{
			Host:     "localhost:5001",
			Endpoint: resource.Ref(registry),
		}},
	}

	if _, err := backend.Apply(t.Context(), testBackendContext(), cluster); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	if kindClient.created != cluster.Name {
		t.Fatalf("created cluster = %q, want %q", kindClient.created, cluster.Name)
	}
	if len(kube.appliedObjects) != 1 {
		t.Fatalf("applied objects = %d, want local registry configmap", len(kube.appliedObjects))
	}
	assertContainerCall(t, container, "NetworkConnect")
	assertStringContains(t, copied, "test-ca")
	assertStringContains(t, copied, "[host.\"http://kind-registry:5000\"]")
}

func newTestBackend(
	container *mock.Client,
	kindClient *fakeKind,
	kube *fakeKube,
) *Backend {
	return &Backend{
		container: container,
		kind:      kindClient,
		newKube: func(string) (kubernetesOperations, error) {
			return kube, nil
		},
		clusters: make(map[resource.ResourceID]kubernetesOperations),
	}
}

func testBackendContext() executor.BackendContext {
	return executor.BackendContext{GraphID: "test"}
}

type fakeKind struct {
	created  string
	deleted  string
	clusters []string
	nodes    []string
}

func (f *fakeKind) GetClusters() ([]string, error) {
	return f.clusters, nil
}

func (f *fakeKind) CreateCluster(name string, _ *v1alpha4.Cluster) error {
	f.created = name
	f.clusters = append(f.clusters, name)
	return nil
}

func (f *fakeKind) DeleteCluster(name string) error {
	f.deleted = name
	return nil
}

func (f *fakeKind) GetNodes(string) ([]string, error) {
	return f.nodes, nil
}

type fakeKube struct {
	appliedObjects []runtime.Object
}

func (f *fakeKube) ApplyObjects(_ context.Context, objs ...runtime.Object) (string, error) {
	f.appliedObjects = append(f.appliedObjects, objs...)
	return "applied", nil
}

func (f *fakeKube) Get(context.Context, schema.GroupVersionResource, string, string) error {
	return nil
}

func assertContainerCall(t *testing.T, client *mock.Client, method string) {
	t.Helper()
	for _, call := range client.Calls {
		if call.Method == method {
			return
		}
	}
	t.Fatalf("container call %s not found in %#v", method, client.Calls)
}

func assertStringContains(t *testing.T, values []string, want string) {
	t.Helper()
	for _, value := range values {
		if strings.Contains(value, want) {
			return
		}
	}
	t.Fatalf("string containing %q not found in %#v", want, values)
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}
