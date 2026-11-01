package appinventory

import (
	"maps"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestCountByState(t *testing.T) {
	t.Parallel()

	deployments := []appsv1.Deployment{
		deployment("ttd-app-a", "ttd-app-a", 2),
		deployment("ttd-app-b", "ttd-app-b", 0),
		deployment("ttd-app-c", "ttd-app-c", 1),
		// Not the service owner's apps: another service owner's, and one without the release label.
		deployment("skd-app", "skd-app", 1),
		deployment("ttd-tool", "", 1),
	}

	got := countByState("ttd", deployments)

	want := map[string]int64{stateRunning: 2, stateNotRunning: 1}
	if !maps.Equal(got, want) {
		t.Errorf("countByState() = %v, want %v", got, want)
	}
}

func TestCountByStateWithoutApps(t *testing.T) {
	t.Parallel()

	got := countByState("ttd", nil)

	want := map[string]int64{stateRunning: 0, stateNotRunning: 0}
	if !maps.Equal(got, want) {
		t.Errorf("countByState() = %v, want %v", got, want)
	}
}

func deployment(name, release string, readyReplicas int32) appsv1.Deployment {
	labels := map[string]string{}
	if release != "" {
		labels[releaseLabel] = release
	}
	return appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: Namespace, Labels: labels},
		Status:     appsv1.DeploymentStatus{ReadyReplicas: readyReplicas},
	}
}
