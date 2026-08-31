package resource

import (
	"errors"
	"testing"
)

func TestKindClusterResourceDependencies(t *testing.T) {
	t.Parallel()

	registryImage := &PulledImage{Ref: "registry:2"}
	registry := &Container{
		Name:  "kind-registry",
		Image: Ref(registryImage),
	}
	cluster := &KindCluster{
		Name:                "runtime-fixture-kind-minimal",
		TrustedCABundlePath: "/var/lib/agentdp/ca/ca-bundle.pem",
		RegistryMirrors: []KindRegistryMirror{{
			Host:     "localhost:5001",
			Endpoint: Ref(registry),
		}},
	}
	flux := &FluxInstallation{Name: "cluster", Cluster: Ref(cluster)}
	baseObjects := &KubernetesObjectSet{
		Name:      "base-infra",
		Cluster:   Ref(cluster),
		Path:      "base.yaml",
		DependsOn: Deps(flux),
		Readiness: []KubernetesReadinessCheck{
			{
				Kind:      KubernetesReadinessFluxHelmRelease,
				Namespace: "traefik",
				Name:      "traefik",
			},
			{
				Kind:      KubernetesReadinessDeploymentAvailable,
				Namespace: "traefik",
				Name:      "traefik",
			},
		},
	}
	builtImage := &BuiltImage{ContextPath: "/repo", Tag: "gateway:dev"}
	publishedImage := &PublishedImage{Ref: "localhost:5001/gateway:latest", Source: Ref(builtImage)}
	artifact := &OCIArtifact{
		Name:      "gateway-kustomize",
		URL:       "oci://localhost:5001/gateway:local",
		Path:      "infra/kustomize",
		DependsOn: Deps(registry),
	}
	appObjects := &KubernetesObjectSet{
		Name:      "gateway",
		Cluster:   Ref(cluster),
		Path:      "local-syncroot",
		DependsOn: Deps(baseObjects, artifact, publishedImage),
		Readiness: []KubernetesReadinessCheck{
			{
				Kind:      KubernetesReadinessFluxKustomization,
				Namespace: "runtime-gateway",
				Name:      "gateway",
			},
			{
				Kind:      KubernetesReadinessDeploymentAvailable,
				Namespace: "runtime-gateway",
				Name:      "gateway",
			},
		},
	}

	graph := NewGraph(testGraphID)
	for _, resource := range []Resource{
		registryImage,
		registry,
		cluster,
		flux,
		baseObjects,
		builtImage,
		publishedImage,
		artifact,
		appObjects,
	} {
		if err := graph.Add(resource); err != nil {
			t.Fatalf("Add(%s) error = %v", resource.ID(), err)
		}
	}

	if err := graph.Validate(); err != nil {
		t.Fatalf("Validate() error = %v", err)
	}

	levels, err := graph.TopologicalOrder()
	if err != nil {
		t.Fatalf("TopologicalOrder() error = %v", err)
	}
	assertBefore(t, levels, registryImage.ID(), registry.ID())
	assertBefore(t, levels, registry.ID(), cluster.ID())
	assertBefore(t, levels, cluster.ID(), flux.ID())
	assertBefore(t, levels, flux.ID(), baseObjects.ID())
	assertBefore(t, levels, builtImage.ID(), publishedImage.ID())
	assertBefore(t, levels, baseObjects.ID(), appObjects.ID())
	assertBefore(t, levels, artifact.ID(), appObjects.ID())
	assertBefore(t, levels, publishedImage.ID(), appObjects.ID())
}

func TestKindClusterResourceValidation(t *testing.T) {
	t.Parallel()

	tests := []struct {
		resource Resource
		want     error
		name     string
	}{
		{name: "kind cluster requires name", resource: &KindCluster{}, want: errResourceNameRequired},
		{
			name: "kind cluster registry mirror requires host",
			resource: &KindCluster{
				Name: "cluster",
				RegistryMirrors: []KindRegistryMirror{{
					Endpoint: RefID(ContainerID("kind-registry")),
				}},
			},
			want: errRegistryMirrorHostRequired,
		},
		{
			name: "kind cluster registry mirror requires endpoint",
			resource: &KindCluster{
				Name: "cluster",
				RegistryMirrors: []KindRegistryMirror{{
					Host: "localhost:5001",
				}},
			},
			want: errRegistryMirrorEndpointRequired,
		},
		{
			name:     "flux requires cluster",
			resource: &FluxInstallation{Name: "cluster"},
			want:     errClusterReferenceRequired,
		},
		{
			name:     "oci artifact requires url",
			resource: &OCIArtifact{Name: "kustomize", Path: "infra"},
			want:     errURLRequired,
		},
		{
			name: "oci artifact rejects unknown format",
			resource: &OCIArtifact{
				Name:   "kustomize",
				URL:    "oci://localhost:5001/gateway:local",
				Path:   "infra",
				Format: "unknown",
			},
			want: errOCIArtifactFormatUnknown,
		},
		{
			name:     "kubernetes object set requires path",
			resource: &KubernetesObjectSet{Name: "gateway", Cluster: RefID("kind-cluster:c")},
			want:     errPathRequired,
		},
		{
			name: "kubernetes object set rejects both path and manifest",
			resource: &KubernetesObjectSet{
				Name:     "gateway",
				Cluster:  RefID("kind-cluster:c"),
				Path:     "gateway.yaml",
				Manifest: "apiVersion: v1\nkind: Namespace\n",
			},
			want: errKubernetesObjectSourceAmbiguous,
		},
		{
			name:     "local file requires path",
			resource: &LocalFile{Name: "registry-config"},
			want:     errPathRequired,
		},
		{
			name:     "git checkout requires repository url",
			resource: &GitCheckout{Name: "deployment-chart", Ref: "main", Path: ".cache/chart"},
			want:     errGitRepositoryURLRequired,
		},
		{
			name: "git checkout requires ref",
			resource: &GitCheckout{
				Name:    "deployment-chart",
				RepoURL: "https://github.com/Altinn/altinn-studio-charts.git",
				Path:    ".cache/chart",
			},
			want: errGitReferenceRequired,
		},
		{
			name: "kubernetes object set readiness requires kind",
			resource: &KubernetesObjectSet{
				Name:    "gateway",
				Cluster: RefID("kind-cluster:c"),
				Path:    "gateway.yaml",
				Readiness: []KubernetesReadinessCheck{{
					Namespace: "runtime-gateway",
					Name:      "gateway",
				}},
			},
			want: errKubernetesReadinessKindUnknown,
		},
		{
			name: "kubernetes object set readiness requires namespace",
			resource: &KubernetesObjectSet{
				Name:    "gateway",
				Cluster: RefID("kind-cluster:c"),
				Path:    "gateway.yaml",
				Readiness: []KubernetesReadinessCheck{{
					Kind: KubernetesReadinessDeploymentAvailable,
					Name: "gateway",
				}},
			},
			want: errNamespaceRequired,
		},
		{
			name: "kubernetes object set readiness rejects negative timeout",
			resource: &KubernetesObjectSet{
				Name:    "gateway",
				Cluster: RefID("kind-cluster:c"),
				Path:    "gateway.yaml",
				Readiness: []KubernetesReadinessCheck{{
					Kind:      KubernetesReadinessDeploymentAvailable,
					Namespace: "runtime-gateway",
					Name:      "gateway",
					Timeout:   -1,
				}},
			},
			want: errTimeoutInvalid,
		},
		{
			name: "kubernetes object set readiness rejects negative reconcile timeout",
			resource: &KubernetesObjectSet{
				Name:    "gateway",
				Cluster: RefID("kind-cluster:c"),
				Path:    "gateway.yaml",
				Readiness: []KubernetesReadinessCheck{{
					Kind:      KubernetesReadinessFluxKustomization,
					Namespace: "runtime-gateway",
					Name:      "gateway",
					Reconcile: &KubernetesFluxReconcileOptions{
						Timeout: -1,
					},
				}},
			},
			want: errTimeoutInvalid,
		},
		{
			name: "kubernetes object set rejects whitespace name",
			resource: &KubernetesObjectSet{
				Name:    "   ",
				Cluster: RefID("kind-cluster:c"),
				Path:    "gateway.yaml",
			},
			want: errResourceNameRequired,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			validator, ok := tt.resource.(Validator)
			if !ok {
				t.Fatalf("%T does not implement Validator", tt.resource)
			}
			if err := validator.Validate(); !errors.Is(err, tt.want) {
				t.Fatalf("Validate() error = %v, want %v", err, tt.want)
			}
		})
	}
}

func TestKubernetesResourceIDs(t *testing.T) {
	t.Parallel()

	objects := &KubernetesObjectSet{Name: "runtime-pdf3"}
	if got := objects.ID(); got != KubernetesObjectSetID("runtime-pdf3") {
		t.Fatalf("KubernetesObjectSet.ID() = %q", got)
	}
}

func TestKindClusterIDHelpers(t *testing.T) {
	t.Parallel()

	cluster := &KindCluster{Name: "runtime-fixture-kind-minimal"}
	if got := cluster.ID(); got != KindClusterID(cluster.Name) {
		t.Fatalf("KindCluster.ID() = %q", got)
	}

	name, ok := KindClusterNameFromRef(Ref(cluster))
	if !ok || name != cluster.Name {
		t.Fatalf("KindClusterNameFromRef(resource) = %q, %v", name, ok)
	}

	name, ok = KindClusterNameFromRef(RefID(cluster.ID()))
	if !ok || name != cluster.Name {
		t.Fatalf("KindClusterNameFromRef(id) = %q, %v", name, ok)
	}

	if name, ok := KindClusterNameFromID("container:kind-registry"); ok || name != "" {
		t.Fatalf("KindClusterNameFromID(non-kind) = %q, %v", name, ok)
	}
}

func TestLocalResourceDependencies(t *testing.T) {
	t.Parallel()

	file := &LocalFile{Name: "registry-config", Path: ".cache/config.yml"}
	checkout := &GitCheckout{
		Name:      "deployment-chart",
		RepoURL:   "https://github.com/Altinn/altinn-studio-charts.git",
		Ref:       "main",
		Path:      ".cache/charts/deployment",
		DependsOn: Deps(file),
	}

	if got := file.ID(); got != "local-file:registry-config" {
		t.Fatalf("LocalFile.ID() = %q", got)
	}
	if got := checkout.ID(); got != "git-checkout:deployment-chart" {
		t.Fatalf("GitCheckout.ID() = %q", got)
	}
	if deps := checkout.Dependencies(); len(deps) != 1 || deps[0].ID() != file.ID() {
		t.Fatalf("GitCheckout.Dependencies() = %v", deps)
	}
}

func assertBefore(t *testing.T, levels [][]Resource, before, after ResourceID) {
	t.Helper()

	positions := map[ResourceID]int{}
	for i, level := range levels {
		for _, resource := range level {
			positions[resource.ID()] = i
		}
	}

	beforeLevel, ok := positions[before]
	if !ok {
		t.Fatalf("resource %q not found in topological levels", before)
	}
	afterLevel, ok := positions[after]
	if !ok {
		t.Fatalf("resource %q not found in topological levels", after)
	}
	if beforeLevel >= afterLevel {
		t.Fatalf("resource %q level = %d, want before %q level = %d", before, beforeLevel, after, afterLevel)
	}
}
