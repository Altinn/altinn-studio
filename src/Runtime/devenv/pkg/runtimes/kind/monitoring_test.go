package kind

import (
	"errors"
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
		KindContainerRuntimeOptions{IncludeMonitoring: true, DashboardsRepository: testDashboardsRepository},
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
	grafana := mustObjectSet(t, graph, monitoringGrafana)
	assertDependsOn(t, grafana, resource.KubernetesObjectSetID(monitoringStackName))
	assertDependsOn(t, grafana, resource.KubernetesObjectSetID(monitoringGrafanaOperator))
	content := mustObjectSet(t, graph, monitoringGrafanaContent)
	assertDependsOn(t, content, resource.KubernetesObjectSetID(monitoringGrafana))
	for _, set := range []*resource.KubernetesObjectSet{operators, stack} {
		if _, err := os.Stat(filepath.Join(set.Path, "kustomization.yaml")); err != nil {
			t.Errorf("%s: kustomization not found at %s: %v", set.Name, set.Path, err)
		}
	}
	assertDependsOn(t, operators, runtime.BaseInfrastructureRef().ID())
	assertDependsOn(t, stack, resource.KubernetesObjectSetID(monitoringOperatorsName))
	assertDependsOn(t, stack, (&resource.PublishedImage{Ref: ObservabilityProxyImage}).ID())
}

func TestGraph_FullMonitoringProfile(t *testing.T) {
	runtime, err := New(
		KindContainerRuntimeVariantStandard,
		filepath.Join(t.TempDir(), ".cache"),
		KindContainerRuntimeOptions{
			IncludeMonitoring:    true,
			MonitoringProfile:    MonitoringProfileFull,
			DashboardsRepository: testDashboardsRepository,
		},
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
	stack := mustObjectSet(t, graph, monitoringStackName)
	if filepath.Base(stack.Path) != "syncroot-full" {
		t.Errorf("stack path = %s, want the full profile's syncroot", stack.Path)
	}
	var statefulSets, deployments []string
	for _, check := range stack.Readiness {
		switch check.Kind {
		case resource.KubernetesReadinessStatefulSetReady:
			statefulSets = append(statefulSets, check.Name)
		case resource.KubernetesReadinessDeploymentAvailable:
			deployments = append(deployments, check.Name)
		case resource.KubernetesReadinessFluxKustomization, resource.KubernetesReadinessFluxHelmRelease:
		}
	}
	for _, name := range []string{"vmagent-metrics", "vlagent-logs", "vtagent-traces"} {
		if !slices.Contains(statefulSets, name) {
			t.Errorf("readiness lacks StatefulSet %s: %v", name, statefulSets)
		}
	}
	for _, name := range []string{"vmsingle-metrics-b", "vtsingle-traces-b", "vlsingle-logs-b", "vmagent-self"} {
		if !slices.Contains(deployments, name) {
			t.Errorf("readiness lacks Deployment %s: %v", name, deployments)
		}
	}
	if manifest := mustObjectSet(
		t,
		graph,
		monitoringGrafana,
	).Manifest; !strings.Contains(
		manifest,
		"name: alert-recorder",
	) {
		t.Error("the full profile does not deploy the alert recorder")
	}
}

func TestGraph_LightMonitoringProfileHasNoAlerting(t *testing.T) {
	runtime, err := New(
		KindContainerRuntimeVariantStandard,
		filepath.Join(t.TempDir(), ".cache"),
		KindContainerRuntimeOptions{IncludeMonitoring: true, DashboardsRepository: testDashboardsRepository},
	)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	graph, err := runtime.Graph()
	if err != nil {
		t.Fatalf("Graph() error = %v", err)
	}
	if path := mustObjectSet(t, graph, monitoringStackName).Path; filepath.Base(path) != "syncroot" {
		t.Errorf("stack path = %s, want the light syncroot", path)
	}
	if manifest := mustObjectSet(t, graph, monitoringGrafana).Manifest; strings.Contains(manifest, "alert-recorder") {
		t.Error("the light profile deploys the alert recorder")
	}
}

func TestNew_FullMonitoringNeedsStandardVariant(t *testing.T) {
	_, err := New(
		KindContainerRuntimeVariantMinimal,
		filepath.Join(t.TempDir(), ".cache"),
		KindContainerRuntimeOptions{IncludeMonitoring: true, MonitoringProfile: MonitoringProfileFull},
	)
	if !errors.Is(err, errFullMonitoringVariant) {
		t.Errorf("New() error = %v, want %v", err, errFullMonitoringVariant)
	}
}

func TestParseMonitoringProfile(t *testing.T) {
	for name, want := range map[string]MonitoringProfile{"": MonitoringProfileLight, "light": MonitoringProfileLight, "full": MonitoringProfileFull} {
		if got, err := ParseMonitoringProfile(name); err != nil || got != want {
			t.Errorf("ParseMonitoringProfile(%q) = %q, %v; want %q", name, got, err, want)
		}
	}
	if _, err := ParseMonitoringProfile("heavy"); !errors.Is(err, errUnknownMonitoringProfile) {
		t.Errorf("ParseMonitoringProfile(heavy) error = %v", err)
	}
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
	for _, name := range []string{monitoringOperatorsName, monitoringStackName, monitoringGrafana} {
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
		required  []string
	}{
		{dir: "operators", forbidden: []string{"${", "provider: azure"}},
		{dir: "syncroot", forbidden: []string{"${", "provider: azure"}},
		{dir: "runtime", forbidden: []string{"azure_monitor", "https://altinn.studio"}},
		{dir: "studio", forbidden: []string{"kind: OpenTelemetryCollector"}},
		{dir: "victoria", forbidden: []string{"kind: VMAgent", "metrics-b", "studio-observability-premium-v2"}},
		{dir: "studio-full", forbidden: []string{"kind: OpenTelemetryCollector", "ObservabilityProxy__Downstreams"}},
		{
			dir:       "victoria-full",
			forbidden: []string{"studio-observability-premium-v2", "nodeSelector", "maxDiskUsagePerURL: 20GiB"},
			required: []string{
				"name: metrics-b",
				"name: self",
				"kind: VLAgent",
				"kind: VTAgent",
				"topology.kubernetes.io/zone",
			},
		},
		{
			dir:       "syncroot-full",
			forbidden: []string{"${", "provider: azure"},
			required:  []string{"path: ./local/studio-full", "path: ./local/victoria-full"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.dir, func(t *testing.T) {
			rendered := renderKustomization(t, filepath.Join(local, tt.dir))
			for _, text := range tt.forbidden {
				if strings.Contains(rendered, text) {
					t.Errorf("rendered %s contains %q", tt.dir, text)
				}
			}
			for _, text := range tt.required {
				if !strings.Contains(rendered, text) {
					t.Errorf("rendered %s lacks %q", tt.dir, text)
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
