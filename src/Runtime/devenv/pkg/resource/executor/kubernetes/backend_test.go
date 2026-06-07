package kubernetesbackend

import (
	"context"
	"errors"
	"os"
	"strings"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/flux"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
)

const (
	appsApp          = "apps/app"
	testContextValue = "expected"
)

var errFluxUnavailable = errors.New("flux unavailable")

type testContextKey struct{}

func TestApplyKubernetesObjectSetAppliesManifestAndReadiness(t *testing.T) {
	t.Parallel()

	manifestPath := t.TempDir() + "/manifest.yaml"
	writeNamespaceManifest(t, manifestPath)
	fluxClient := &fakeFlux{}
	kube := &fakeKube{}
	backend := newTestBackend(kube, fluxClient)
	cluster := &resource.KindCluster{Name: "cluster"}
	objects := &resource.KubernetesObjectSet{
		Name:    "app",
		Cluster: resource.Ref(cluster),
		Path:    manifestPath,
		Readiness: []resource.KubernetesReadinessCheck{
			{Kind: resource.KubernetesReadinessFluxKustomization, Namespace: "apps", Name: "app"},
			{Kind: resource.KubernetesReadinessDeploymentAvailable, Namespace: "apps", Name: "app"},
		},
	}

	if _, err := backend.Apply(t.Context(), executor.BackendContext{GraphID: "test"}, objects); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	if !strings.Contains(kube.appliedManifest, "kind: Namespace") {
		t.Fatalf("applied manifest = %q", kube.appliedManifest)
	}
	if got := strings.Join(fluxClient.kustomizations, ","); got != appsApp {
		t.Fatalf("kustomizations = %q", got)
	}
	if got := strings.Join(kube.rollouts, ","); got != appsApp {
		t.Fatalf("rollouts = %q", got)
	}
	if got := fluxClient.kustomizationOpts[0]; got.ShouldWait != true || got.Timeout != defaultReadinessTimeout {
		t.Fatalf("kustomization opts = %+v, want wait with default timeout", got)
	}
}

func TestApplyKubernetesObjectSetPassesContextToApplyAndReadiness(t *testing.T) {
	t.Parallel()

	ctx := context.WithValue(t.Context(), testContextKey{}, testContextValue)
	manifestPath := t.TempDir() + "/manifest.yaml"
	writeNamespaceManifest(t, manifestPath)
	fluxClient := &fakeFlux{}
	kube := &fakeKube{}
	backend := newTestBackend(kube, fluxClient)
	cluster := &resource.KindCluster{Name: "cluster"}
	objects := &resource.KubernetesObjectSet{
		Name:    "app",
		Cluster: resource.Ref(cluster),
		Path:    manifestPath,
		Readiness: []resource.KubernetesReadinessCheck{
			{Kind: resource.KubernetesReadinessFluxHelmRelease, Namespace: "apps", Name: "app"},
			{Kind: resource.KubernetesReadinessDeploymentAvailable, Namespace: "apps", Name: "app"},
		},
	}

	if _, err := backend.Apply(ctx, executor.BackendContext{GraphID: "test"}, objects); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	for name, got := range map[string]bool{
		"apply":               kube.applyContextMatched,
		"rollout":             kube.rolloutContextMatched,
		"helm reconciliation": fluxClient.helmReleaseContextMatched[0],
	} {
		if !got {
			t.Fatalf("%s context did not preserve test value", name)
		}
	}
}

func TestApplyKubernetesObjectSetPreservesFluxReconcileOptions(t *testing.T) {
	t.Parallel()

	manifestPath := t.TempDir() + "/manifest.yaml"
	writeNamespaceManifest(t, manifestPath)
	fluxClient := &fakeFlux{}
	backend := newTestBackend(&fakeKube{}, fluxClient)
	cluster := &resource.KindCluster{Name: "cluster"}
	objects := &resource.KubernetesObjectSet{
		Name:    "app",
		Cluster: resource.Ref(cluster),
		Path:    manifestPath,
		Readiness: []resource.KubernetesReadinessCheck{
			{
				Kind:      resource.KubernetesReadinessFluxHelmRelease,
				Namespace: "apps",
				Name:      "app",
				Reconcile: &resource.KubernetesFluxReconcileOptions{
					ShouldWait: false,
					Timeout:    5 * time.Second,
				},
			},
		},
	}

	if _, err := backend.Apply(t.Context(), executor.BackendContext{GraphID: "test"}, objects); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	if got := strings.Join(fluxClient.helmReleases, ","); got != appsApp {
		t.Fatalf("helmReleases = %q", got)
	}
	if got := fluxClient.helmReleaseOpts[0]; got.ShouldWait != false || got.Timeout != 5*time.Second {
		t.Fatalf("helm release opts = %+v, want async with 5s timeout", got)
	}
}

func TestApplyKubernetesObjectSetUsesReadinessTimeoutForFluxDefaults(t *testing.T) {
	t.Parallel()

	manifestPath := t.TempDir() + "/manifest.yaml"
	writeNamespaceManifest(t, manifestPath)
	fluxClient := &fakeFlux{}
	backend := newTestBackend(&fakeKube{}, fluxClient)
	cluster := &resource.KindCluster{Name: "cluster"}
	objects := &resource.KubernetesObjectSet{
		Name:    "app",
		Cluster: resource.Ref(cluster),
		Path:    manifestPath,
		Readiness: []resource.KubernetesReadinessCheck{
			{
				Kind:      resource.KubernetesReadinessFluxKustomization,
				Namespace: "apps",
				Name:      "app",
				Timeout:   7 * time.Second,
			},
		},
	}

	if _, err := backend.Apply(t.Context(), executor.BackendContext{GraphID: "test"}, objects); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	if got := fluxClient.kustomizationOpts[0]; got.ShouldWait != true || got.Timeout != 7*time.Second {
		t.Fatalf("kustomization opts = %+v, want wait with 7s timeout", got)
	}
}

func TestApplyKubernetesObjectSetRendersKustomizeDirectories(t *testing.T) {
	t.Parallel()

	kube := &fakeKube{}
	backend := newTestBackend(kube, &fakeFlux{})
	cluster := &resource.KindCluster{Name: "cluster"}
	objects := &resource.KubernetesObjectSet{
		Name:    "app",
		Cluster: resource.Ref(cluster),
		Path:    t.TempDir(),
	}

	if _, err := backend.Apply(t.Context(), executor.BackendContext{GraphID: "test"}, objects); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	if !strings.HasPrefix(kube.appliedManifest, "rendered:") {
		t.Fatalf("applied manifest = %q, want rendered kustomize output", kube.appliedManifest)
	}
}

func TestApplyKubernetesObjectSetUsesInlineManifest(t *testing.T) {
	t.Parallel()

	kube := &fakeKube{}
	backend := newTestBackend(kube, &fakeFlux{})
	cluster := &resource.KindCluster{Name: "cluster"}
	objects := &resource.KubernetesObjectSet{
		Name:     "app",
		Cluster:  resource.Ref(cluster),
		Manifest: "apiVersion: v1\nkind: Namespace\nmetadata:\n  name: inline\n",
	}

	if _, err := backend.Apply(t.Context(), executor.BackendContext{GraphID: "test"}, objects); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	if !strings.Contains(kube.appliedManifest, "name: inline") {
		t.Fatalf("applied manifest = %q", kube.appliedManifest)
	}
}

func TestApplyKubernetesObjectSetIgnoresFluxFactoryErrorWhenNoFluxReadiness(t *testing.T) {
	t.Parallel()

	manifestPath := t.TempDir() + "/manifest.yaml"
	writeNamespaceManifest(t, manifestPath)
	kube := &fakeKube{}
	backend := newTestBackend(kube, &fakeFlux{})
	backend.newFlux = func(kubernetesOperations) (fluxOperations, error) {
		return nil, errFluxUnavailable
	}
	cluster := &resource.KindCluster{Name: "cluster"}
	objects := &resource.KubernetesObjectSet{
		Name:    "app",
		Cluster: resource.Ref(cluster),
		Path:    manifestPath,
		Readiness: []resource.KubernetesReadinessCheck{
			{Kind: resource.KubernetesReadinessDeploymentAvailable, Namespace: "apps", Name: "app"},
		},
	}

	if _, err := backend.Apply(t.Context(), executor.BackendContext{GraphID: "test"}, objects); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}
	if !strings.Contains(kube.appliedManifest, "kind: Namespace") {
		t.Fatalf("applied manifest = %q", kube.appliedManifest)
	}
}

func newTestBackend(kube *fakeKube, fluxClient *fakeFlux) *Backend {
	return &Backend{
		newKube: func(string) (kubernetesOperations, error) {
			return kube, nil
		},
		newFlux: func(kubernetesOperations) (fluxOperations, error) {
			return fluxClient, nil
		},
		clusters: make(map[resource.ResourceID]clusterClients),
	}
}

type fakeKube struct {
	appliedManifest       string
	rollouts              []string
	applyContextMatched   bool
	rolloutContextMatched bool
}

func (f *fakeKube) ApplyManifestContext(ctx context.Context, yamlContent string) (string, error) {
	f.applyContextMatched = ctx.Value(testContextKey{}) == testContextValue
	f.appliedManifest = yamlContent
	return "applied", nil
}

func (f *fakeKube) KustomizeRender(path string) (string, error) {
	return "rendered:" + path, nil
}

func (f *fakeKube) RolloutStatusContext(
	ctx context.Context,
	deployment,
	namespace string,
	_ time.Duration,
) error {
	f.rolloutContextMatched = ctx.Value(testContextKey{}) == testContextValue
	f.rollouts = append(f.rollouts, namespace+"/"+deployment)
	return nil
}

type fakeFlux struct {
	kustomizations              []string
	kustomizationOpts           []flux.ReconcileOptions
	kustomizationContextMatched []bool
	helmReleases                []string
	helmReleaseOpts             []flux.ReconcileOptions
	helmReleaseContextMatched   []bool
}

func (f *fakeFlux) ReconcileHelmReleaseContext(
	ctx context.Context,
	name,
	namespace string,
	_ bool,
	opts flux.ReconcileOptions,
) error {
	f.helmReleases = append(f.helmReleases, namespace+"/"+name)
	f.helmReleaseOpts = append(f.helmReleaseOpts, opts)
	f.helmReleaseContextMatched = append(f.helmReleaseContextMatched, ctx.Value(testContextKey{}) == testContextValue)
	return nil
}

func (f *fakeFlux) ReconcileKustomizationContext(
	ctx context.Context,
	name,
	namespace string,
	_ bool,
	opts flux.ReconcileOptions,
) error {
	f.kustomizations = append(f.kustomizations, namespace+"/"+name)
	f.kustomizationOpts = append(f.kustomizationOpts, opts)
	f.kustomizationContextMatched = append(
		f.kustomizationContextMatched,
		ctx.Value(testContextKey{}) == testContextValue,
	)
	return nil
}

func writeNamespaceManifest(t *testing.T, path string) {
	t.Helper()
	if err := os.WriteFile(
		path,
		[]byte("apiVersion: v1\nkind: Namespace\nmetadata:\n  name: test\n"),
		0o600,
	); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}
