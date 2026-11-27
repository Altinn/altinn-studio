package manifests

import (
	"maps"
	"slices"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

func TestBuildGrafana_MountsEachDashboardFromItsOwnConfigMapNamedAfterItsFile(t *testing.T) {
	dashboards := map[string]string{
		"gateway.json":         `{"title":"Gateway"}`,
		"workflow-engine.json": `{"title":"Workflow Engine"}`,
	}

	configMaps, grafana := grafanaObjects(t, BuildGrafana(GrafanaContent{Dashboards: dashboards}, nil))

	want := map[string]map[string]string{
		"grafana-dashboard-gateway":         {"gateway.json": `{"title":"Gateway"}`},
		"grafana-dashboard-workflow-engine": {"workflow-engine.json": `{"title":"Workflow Engine"}`},
	}
	if !maps.EqualFunc(configMaps, want, maps.Equal) {
		t.Errorf("dashboard ConfigMaps = %v, want %v", configMaps, want)
	}
	var mountPath string
	for _, mount := range grafana.Spec.Template.Spec.Containers[0].VolumeMounts {
		if mount.Name == "dashboards" {
			mountPath = mount.MountPath
		}
	}
	if mountPath != GrafanaDashboardsPath {
		t.Errorf("dashboards volume mounted at %q, want %q", mountPath, GrafanaDashboardsPath)
	}
	if got, wanted := projectedConfigMaps(t, grafana), slices.Sorted(maps.Keys(want)); !slices.Equal(got, wanted) {
		t.Errorf("dashboards volume projects %v, want %v", got, wanted)
	}
}

// grafanaObjects returns the data of the dashboard ConfigMaps by name, and the Grafana Deployment.
func grafanaObjects(t *testing.T, objects []runtime.Object) (map[string]map[string]string, *appsv1.Deployment) {
	t.Helper()
	configMaps := map[string]map[string]string{}
	var grafana *appsv1.Deployment
	for _, object := range objects {
		switch o := object.(type) {
		case *corev1.ConfigMap:
			if o.Name != "grafana-provisioning" {
				configMaps[o.Name] = o.Data
			}
		case *appsv1.Deployment:
			if o.Name == "grafana" {
				grafana = o
			}
		}
	}
	if grafana == nil {
		t.Fatal("no grafana Deployment")
	}
	return configMaps, grafana
}

func projectedConfigMaps(t *testing.T, grafana *appsv1.Deployment) []string {
	t.Helper()
	for _, volume := range grafana.Spec.Template.Spec.Volumes {
		if volume.Name != "dashboards" {
			continue
		}
		if volume.Projected == nil {
			t.Fatalf("dashboards volume = %+v, want a projected volume", volume.VolumeSource)
		}
		names := make([]string, 0, len(volume.Projected.Sources))
		for _, source := range volume.Projected.Sources {
			names = append(names, source.ConfigMap.Name)
		}
		return slices.Sorted(slices.Values(names))
	}
	t.Fatal("no dashboards volume")
	return nil
}
