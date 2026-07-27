package fluxbackend

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/flux"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"

	"k8s.io/apimachinery/pkg/runtime/schema"
)

var errTestKubeFailed = errors.New("kube failed")

func TestApplyFluxInstallationInstallsAndWaitsForControllers(t *testing.T) {
	t.Parallel()

	fluxClient := &fakeFlux{}
	kube := &fakeKube{}
	backend := newTestBackend(kube, fluxClient)
	cluster := &resource.KindCluster{Name: "cluster"}
	installation := &resource.FluxInstallation{
		Cluster:    resource.Ref(cluster),
		Components: []string{"source-controller"},
	}

	if _, err := backend.Apply(t.Context(), executor.BackendContext{GraphID: "test"}, installation); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	if got := strings.Join(fluxClient.installed, ","); got != "source-controller" {
		t.Fatalf("installed components = %q", got)
	}
	if got := strings.Join(kube.rollouts, ","); got != "flux-system/source-controller" {
		t.Fatalf("rollouts = %q", got)
	}
}

func TestObserveFluxInstallationReportsDestroyedWhenClusterClientIsUnavailable(t *testing.T) {
	t.Parallel()

	backend := &Backend{
		newKube: func(string) (kubernetesOperations, error) {
			return nil, errTestKubeFailed
		},
		clusters: make(map[resource.ResourceID]clusterClients),
	}
	installation := &resource.FluxInstallation{Cluster: resource.Ref(&resource.KindCluster{Name: "cluster"})}

	observed, err := backend.Observe(t.Context(), executor.BackendContext{GraphID: "test"}, installation)
	if err != nil {
		t.Fatalf("Observe() error = %v", err)
	}
	if observed.Status != executor.StatusDestroyed {
		t.Fatalf("Observe() status = %v, want %v", observed.Status, executor.StatusDestroyed)
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
	rollouts []string
}

func (f *fakeKube) Get(context.Context, schema.GroupVersionResource, string, string) error {
	return nil
}

func (f *fakeKube) RolloutStatus(
	_ context.Context,
	deployment,
	namespace string,
	_ time.Duration,
) error {
	f.rollouts = append(f.rollouts, namespace+"/"+deployment)
	return nil
}

type fakeFlux struct {
	installed []string
}

func (f *fakeFlux) Install(_ context.Context, components []string, _ flux.InstallOptions) error {
	f.installed = append(f.installed, components...)
	return nil
}
