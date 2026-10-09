package kind

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"sigs.k8s.io/kustomize/api/krusty"
	kustomizeTypes "sigs.k8s.io/kustomize/api/types"
	"sigs.k8s.io/kustomize/kyaml/filesys"

	"altinn.studio/devenv/pkg/projectroot"
	"altinn.studio/devenv/pkg/resource"
)

func TestGraph_IncludeMonitoring(t *testing.T) {
	runtime, err := New(
		KindContainerRuntimeVariantMinimal,
		filepath.Join(t.TempDir(), ".cache"),
		KindContainerRuntimeOptions{IncludeMonitoring: true},
	)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	graph, err := runtime.Graph()
	if err != nil {
		t.Fatalf("Graph() error = %v", err)
	}
	if err := graph.Validate(); err != nil {
		t.Fatalf("Validate() error = %v", err)
	}

	operators := mustObjectSet(t, graph, monitoringOperatorsName)
	stack := mustObjectSet(t, graph, monitoringStackName)
	for _, set := range []*resource.KubernetesObjectSet{operators, stack} {
		if _, err := os.Stat(filepath.Join(set.Path, "kustomization.yaml")); err != nil {
			t.Errorf("%s: kustomization not found at %s: %v", set.Name, set.Path, err)
		}
	}
	assertDependsOn(t, operators, runtime.BaseInfrastructureRef().ID())
	assertDependsOn(t, stack, resource.KubernetesObjectSetID(monitoringOperatorsName))
	assertDependsOn(t, stack, (&resource.PublishedImage{Ref: ObservabilityProxyImage}).ID())
}

func TestGraph_WithoutMonitoring(t *testing.T) {
	runtime, err := New(KindContainerRuntimeVariantMinimal, filepath.Join(t.TempDir(), ".cache"), DefaultOptions())
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	graph, err := runtime.Graph()
	if err != nil {
		t.Fatalf("Graph() error = %v", err)
	}
	for _, name := range []string{monitoringOperatorsName, monitoringStackName} {
		if graph.Get(resource.KubernetesObjectSetID(name)) != nil {
			t.Errorf("graph contains %s without IncludeMonitoring", name)
		}
	}
}

// The local overlays are only applied by this fixture, so render them here, the way
// devenv and Flux do, to catch a production change that breaks them.
func TestMonitoringOverlaysRender(t *testing.T) {
	root, err := projectroot.Find(projectroot.RepositoryMarker)
	if err != nil {
		t.Fatalf("find repository root: %v", err)
	}
	local := filepath.Join(root, "infra", "observability", "local")
	tests := []struct {
		dir       string
		forbidden []string
	}{
		{dir: "operators", forbidden: []string{"${", "provider: azure"}},
		{dir: "syncroot", forbidden: []string{"${", "provider: azure"}},
		{dir: "runtime", forbidden: []string{"azure_monitor", "https://altinn.studio"}},
		{dir: "studio", forbidden: []string{"kind: OpenTelemetryCollector"}},
		{dir: "victoria", forbidden: []string{"kind: VMAgent", "metrics-b", "studio-observability-premium-v2"}},
	}
	for _, tt := range tests {
		t.Run(tt.dir, func(t *testing.T) {
			rendered := renderKustomization(t, filepath.Join(local, tt.dir))
			for _, text := range tt.forbidden {
				if strings.Contains(rendered, text) {
					t.Errorf("rendered %s contains %q", tt.dir, text)
				}
			}
		})
	}
}

func renderKustomization(t *testing.T, path string) string {
	t.Helper()
	opts := krusty.MakeDefaultOptions()
	opts.LoadRestrictions = kustomizeTypes.LoadRestrictionsNone
	resources, err := krusty.MakeKustomizer(opts).Run(filesys.MakeFsOnDisk(), path)
	if err != nil {
		t.Fatalf("render %s: %v", path, err)
	}
	out, err := resources.AsYaml()
	if err != nil {
		t.Fatalf("render %s as YAML: %v", path, err)
	}
	return string(out)
}

func mustObjectSet(t *testing.T, graph *resource.Graph, name string) *resource.KubernetesObjectSet {
	t.Helper()
	set, ok := graph.Get(resource.KubernetesObjectSetID(name)).(*resource.KubernetesObjectSet)
	if !ok {
		t.Fatalf("graph has no object set %s", name)
	}
	return set
}

func assertDependsOn(t *testing.T, set *resource.KubernetesObjectSet, id resource.ResourceID) {
	t.Helper()
	ids := make([]resource.ResourceID, 0, len(set.DependsOn))
	for _, dep := range set.DependsOn {
		ids = append(ids, dep.ID())
	}
	if !slices.Contains(ids, id) {
		t.Errorf("%s does not depend on %s (depends on %v)", set.Name, id, ids)
	}
}
