//nolint:revive // Public Kind runtime names intentionally preserve the external API terminology.
package kind

import (
	"context"
	_ "embed"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"sigs.k8s.io/kind/pkg/apis/config/v1alpha4"

	"altinn.studio/devenv/pkg/cache"
	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/flux"
	"altinn.studio/devenv/pkg/helm"
	"altinn.studio/devenv/pkg/kindclient"
	"altinn.studio/devenv/pkg/kubernetes"
	"altinn.studio/devenv/pkg/oci"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
	containerbackend "altinn.studio/devenv/pkg/resource/executor/container"
	fluxbackend "altinn.studio/devenv/pkg/resource/executor/flux"
	kindbackend "altinn.studio/devenv/pkg/resource/executor/kind"
	kubernetesbackend "altinn.studio/devenv/pkg/resource/executor/kubernetes"
	localbackend "altinn.studio/devenv/pkg/resource/executor/local"
	ocibackend "altinn.studio/devenv/pkg/resource/executor/oci"
	"altinn.studio/devenv/pkg/runtimes/kind/manifests"
)

//go:embed config/certs/ca.crt
var certCACrt []byte

//go:embed config/certs/issuer.crt
var certIssuerCrt []byte

//go:embed config/certs/issuer.key
var certIssuerKey []byte

//go:embed config/testserver/nginx.conf
var testserverNginxConf []byte

//go:embed config/testserver/jumpbox-nginx.conf
var jumpboxNginxConf []byte

//go:embed config/testserver/index.html
var testserverIndexHtml []byte

//go:embed config/testserver/eur1.html
var testserverEur1Html []byte

var (
	errNoCurrentCluster       = errors.New("no KindContainerRuntime cluster is currently running")
	errUnknownVariant         = errors.New("unknown variant")
	errConflictingVariant     = errors.New("another KindContainerRuntime cluster variant is already running")
	errClusterVariantNotFound = errors.New("KindContainerRuntime cluster variant wasn't found running")
)

const (
	standardClusterName        = "runtime-fixture-kind-standard"
	minimalClusterName         = "runtime-fixture-kind-minimal"
	baseInfrastructureName     = "kind-base-infrastructure"
	defaultTestserverReplicas  = int32(3)
	minimalTestserverReplicas  = int32(1)
	defaultRegistryImage       = "registry:2"
	traefikRolloutTimeout      = 2 * time.Minute
	registryHealthCheckRetries = 30
)

type KindContainerRuntimeVariant int

const (
	KindContainerRuntimeVariantStandard KindContainerRuntimeVariant = iota
	KindContainerRuntimeVariantMinimal
)

func (v KindContainerRuntimeVariant) String() string {
	switch v {
	case KindContainerRuntimeVariantStandard:
		return "standard"
	case KindContainerRuntimeVariantMinimal:
		return "minimal"
	default:
		return "unknown"
	}
}

// KindContainerRuntimeOptions holds configuration options for the Kind runtime.
type KindContainerRuntimeOptions struct {
	// IncludeMonitoring is currently a no-op (reserved for future lightweight monitoring).
	IncludeMonitoring bool

	// IncludeTestserver controls whether the testserver deployment is deployed.
	// When false (default), no testserver is deployed.
	// When true, the testserver (nginx with test pages) is deployed for integration testing.
	IncludeTestserver bool

	// IncludeLinkerd controls whether Linkerd service mesh is deployed.
	// When false (default), no linkerd resources are provisioned.
	// When true, linkerd-crds and linkerd-control-plane are deployed.
	IncludeLinkerd bool

	// IncludeFluxNotificationController controls whether the Flux notification-controller is installed.
	// When false (default), notification-controller is not deployed (saves startup time).
	// When true, notification-controller is deployed (needed for Gateway alerts).
	IncludeFluxNotificationController bool
}

// DefaultOptions returns the default options for the Kind runtime.
func DefaultOptions() KindContainerRuntimeOptions {
	return KindContainerRuntimeOptions{
		IncludeMonitoring: false,
		IncludeTestserver: false,
		IncludeLinkerd:    false,
	}
}

type KindContainerRuntime struct {
	ContainerClient      container.ContainerClient
	KubernetesClient     *kubernetes.KubernetesClient
	kindConfig           *v1alpha4.Cluster
	FluxClient           *flux.FluxClient
	HelmClient           *helm.Client
	KindClient           *kindclient.KindClient
	OCIClient            *oci.Client
	RegistryStartedEvent chan<- error
	IngressReadyEvent    chan<- error
	cachePath            string
	clusterName          string
	variant              KindContainerRuntimeVariant
	options              KindContainerRuntimeOptions
}

// Graph returns the desired resource graph for the kind fixture itself.
func (r *KindContainerRuntime) Graph() (*resource.Graph, error) {
	graph := resource.NewGraph(resource.GraphID("kind-runtime:" + r.clusterName))

	registryImage := &resource.PulledImage{
		Ref:        defaultRegistryImage,
		PullPolicy: resource.PullIfNotPresent,
	}
	if err := addRuntimeResource(graph, registryImage); err != nil {
		return nil, err
	}

	registry := registryContainer(registryImage)
	if err := addRuntimeResource(graph, registry); err != nil {
		return nil, err
	}

	proxyEnabled := !isCI
	proxyMirrors, err := addProxyRegistries(graph, r.cachePath, registryImage, &proxyEnabled)
	if err != nil {
		return nil, fmt.Errorf("add proxy registries: %w", err)
	}
	mirrors := make([]resource.KindRegistryMirror, 0, 1+len(proxyMirrors))
	mirrors = append(mirrors, resource.KindRegistryMirror{
		Host:     "localhost:" + registryPort,
		Endpoint: resource.Ref(registry),
	})
	mirrors = append(mirrors, proxyMirrors...)

	cluster := &resource.KindCluster{
		Name:            r.clusterName,
		Variant:         r.variant.String(),
		CachePath:       r.cachePath,
		RegistryMirrors: mirrors,
	}
	if addErr := addRuntimeResource(graph, cluster); addErr != nil {
		return nil, addErr
	}

	fluxInstall := &resource.FluxInstallation{
		Name:       r.clusterName,
		Cluster:    resource.Ref(cluster),
		Components: fluxComponents(r.options),
	}
	if addErr := addRuntimeResource(graph, fluxInstall); addErr != nil {
		return nil, addErr
	}

	baseInfra, err := baseInfrastructureObjectSet(r.options, cluster, fluxInstall)
	if err != nil {
		return nil, err
	}
	if addErr := addRuntimeResource(graph, baseInfra); addErr != nil {
		return nil, addErr
	}

	testserverEnabled := r.options.IncludeTestserver
	testserver, err := testserverObjectSet(
		r.variant,
		cluster,
		baseInfra,
		&testserverEnabled,
	)
	if err != nil {
		return nil, err
	}
	if addErr := addRuntimeResource(graph, testserver); addErr != nil {
		return nil, addErr
	}

	return graph, nil
}

func addProxyRegistries(
	graph *resource.Graph,
	cachePath string,
	image *resource.PulledImage,
	proxyEnabled *bool,
) ([]resource.KindRegistryMirror, error) {
	proxies := []struct {
		name      string
		host      string
		hostPort  string
		remoteURL string
	}{
		{registryDockerName, "docker.io", registryDockerPort, "https://registry-1.docker.io"},
		{registryK8sName, "registry.k8s.io", registryK8sPort, "https://registry.k8s.io"},
		{registryGhcrName, "ghcr.io", registryGhcrPort, "https://ghcr.io"},
	}

	mirrors := make([]resource.KindRegistryMirror, 0, len(proxies))
	for _, proxy := range proxies {
		config := proxyRegistryConfigFile(cachePath, proxy.name, proxy.remoteURL, proxyEnabled)
		if err := addRuntimeResource(graph, config); err != nil {
			return nil, fmt.Errorf("add proxy registry config %s: %w", proxy.name, err)
		}
		container := proxyRegistryContainer(image, config, proxy.name, proxy.hostPort, proxyEnabled)
		if err := addRuntimeResource(graph, container); err != nil {
			return nil, fmt.Errorf("add proxy registry container %s: %w", proxy.name, err)
		}
		mirrors = append(mirrors, resource.KindRegistryMirror{
			Enabled:  proxyEnabled,
			Host:     proxy.host,
			Endpoint: resource.Ref(container),
			Upstream: proxy.remoteURL,
		})
	}
	return mirrors, nil
}

func addRuntimeResource(graph *resource.Graph, res resource.Resource) error {
	if err := graph.Add(res); err != nil {
		return fmt.Errorf("add resource %s: %w", res.ID(), err)
	}
	return nil
}

func registryContainer(image *resource.PulledImage) *resource.Container {
	return &resource.Container{
		Name:          registryName,
		Image:         resource.Ref(image),
		RestartPolicy: "always",
		Ports: []types.PortMapping{
			{
				HostIP:        "127.0.0.1",
				HostPort:      registryPort,
				ContainerPort: "5000",
			},
		},
		HealthCheck: registryHealthCheck(),
		Lifecycle: resource.ContainerLifecycleOptions{
			WaitForReady: true,
		},
	}
}

func proxyRegistryConfigFile(cachePath, name, remoteURL string, proxyEnabled *bool) *resource.LocalFile {
	return &resource.LocalFile{
		Enabled: proxyEnabled,
		Name:    "registry-config-" + name,
		Path:    filepath.Join(cachePath, "registry-configs", name, "config.yml"),
		Content: []byte(getRegistryProxyConfig(remoteURL)),
		Mode:    configFilePerm,
	}
}

func proxyRegistryContainer(
	image *resource.PulledImage,
	config *resource.LocalFile,
	name string,
	hostPort string,
	proxyEnabled *bool,
) *resource.Container {
	return &resource.Container{
		Enabled:       proxyEnabled,
		Name:          name,
		Image:         resource.Ref(image),
		RestartPolicy: "always",
		DependsOn:     resource.Deps(config),
		Ports: []types.PortMapping{
			{
				HostIP:        "127.0.0.1",
				HostPort:      hostPort,
				ContainerPort: "5000",
			},
		},
		Volumes: []types.VolumeMount{
			{
				HostPath:      config.Path,
				ContainerPath: "/etc/docker/registry/config.yml",
				Type:          types.VolumeMountTypeBind,
			},
		},
		HealthCheck: registryHealthCheck(),
		Lifecycle: resource.ContainerLifecycleOptions{
			WaitForReady: true,
		},
	}
}

func registryHealthCheck() *types.HealthCheck {
	return &types.HealthCheck{
		Test:        []string{"CMD-SHELL", "wget -q -O- http://localhost:5000/v2/ >/dev/null"},
		Interval:    1 * time.Second,
		Timeout:     1 * time.Second,
		Retries:     registryHealthCheckRetries,
		StartPeriod: 1 * time.Second,
	}
}

func baseInfrastructureObjectSet(
	options KindContainerRuntimeOptions,
	cluster *resource.KindCluster,
	fluxInstall *resource.FluxInstallation,
) (*resource.KubernetesObjectSet, error) {
	manifest, err := kubernetes.ObjectsManifest(
		manifests.BuildBaseInfrastructure(certCACrt, certIssuerCrt, certIssuerKey, options.IncludeLinkerd),
	)
	if err != nil {
		return nil, fmt.Errorf("render base infrastructure manifest: %w", err)
	}
	return &resource.KubernetesObjectSet{
		Name:      baseInfrastructureName,
		Cluster:   resource.Ref(cluster),
		Manifest:  manifest,
		DependsOn: resource.Deps(fluxInstall),
		Readiness: baseInfrastructureReadiness(options),
	}, nil
}

func baseInfrastructureReadiness(options KindContainerRuntimeOptions) []resource.KubernetesReadinessCheck {
	checks := make([]resource.KubernetesReadinessCheck, 0, 5)
	if options.IncludeLinkerd {
		checks = append(checks, resource.KubernetesReadinessCheck{
			Kind:      resource.KubernetesReadinessFluxHelmRelease,
			Namespace: "linkerd",
			Name:      "linkerd-crds",
		})
	}
	checks = append(checks, resource.KubernetesReadinessCheck{
		Kind:      resource.KubernetesReadinessFluxHelmRelease,
		Namespace: "traefik",
		Name:      "traefik-crds",
	})
	if options.IncludeLinkerd {
		checks = append(checks, resource.KubernetesReadinessCheck{
			Kind:      resource.KubernetesReadinessFluxHelmRelease,
			Namespace: "linkerd",
			Name:      "linkerd-control-plane",
		})
	}
	checks = append(checks,
		resource.KubernetesReadinessCheck{
			Kind:      resource.KubernetesReadinessFluxHelmRelease,
			Namespace: "traefik",
			Name:      "traefik",
			Timeout:   traefikRolloutTimeout,
		},
		resource.KubernetesReadinessCheck{
			Kind:      resource.KubernetesReadinessDeploymentAvailable,
			Namespace: "traefik",
			Name:      "traefik",
			Timeout:   traefikRolloutTimeout,
		},
	)
	return checks
}

func testserverObjectSet(
	variant KindContainerRuntimeVariant,
	cluster *resource.KindCluster,
	baseInfra *resource.KubernetesObjectSet,
	testserverEnabled *bool,
) (*resource.KubernetesObjectSet, error) {
	replicas := defaultTestserverReplicas
	if variant == KindContainerRuntimeVariantMinimal {
		replicas = minimalTestserverReplicas
	}
	manifest, err := kubernetes.ObjectsManifest(
		manifests.BuildTestserver(
			testserverNginxConf,
			testserverIndexHtml,
			testserverEur1Html,
			jumpboxNginxConf,
			replicas,
		),
	)
	if err != nil {
		return nil, fmt.Errorf("render testserver manifest: %w", err)
	}
	return &resource.KubernetesObjectSet{
		Enabled:   testserverEnabled,
		Name:      "kind-testserver",
		Cluster:   resource.Ref(cluster),
		Manifest:  manifest,
		DependsOn: resource.Deps(baseInfra),
		Readiness: []resource.KubernetesReadinessCheck{
			{
				Kind:      resource.KubernetesReadinessDeploymentAvailable,
				Namespace: "default",
				Name:      "testserver",
			},
			{
				Kind:      resource.KubernetesReadinessDeploymentAvailable,
				Namespace: "default",
				Name:      "jumpbox",
			},
		},
	}, nil
}

func fluxComponents(options KindContainerRuntimeOptions) []string {
	components := []string{
		"source-controller",
		"helm-controller",
		"kustomize-controller",
	}
	if options.IncludeFluxNotificationController {
		components = append(components, "notification-controller")
	}
	return components
}

// Executor returns an executor with the backends needed for the kind fixture graph.
func (r *KindContainerRuntime) Executor() (*executor.Executor, error) {
	exec := executor.New()
	if err := exec.RegisterBackend(localbackend.New()); err != nil {
		return nil, fmt.Errorf("register local backend: %w", err)
	}
	if err := exec.RegisterBackend(containerbackend.New(r.ContainerClient)); err != nil {
		return nil, fmt.Errorf("register container backend: %w", err)
	}
	kindBackend, err := kindbackend.New(r.ContainerClient)
	if err != nil {
		return nil, fmt.Errorf("create kind backend: %w", err)
	}
	if registerErr := exec.RegisterBackend(kindBackend); registerErr != nil {
		return nil, fmt.Errorf("register kind backend: %w", registerErr)
	}
	if registerErr := exec.RegisterBackend(fluxbackend.New()); registerErr != nil {
		return nil, fmt.Errorf("register flux backend: %w", registerErr)
	}
	if registerErr := exec.RegisterBackend(kubernetesbackend.New()); registerErr != nil {
		return nil, fmt.Errorf("register Kubernetes backend: %w", registerErr)
	}
	ociBackend, err := ocibackend.New()
	if err != nil {
		return nil, fmt.Errorf("create OCI backend: %w", err)
	}
	if registerErr := exec.RegisterBackend(ociBackend); registerErr != nil {
		return nil, fmt.Errorf("register OCI backend: %w", registerErr)
	}
	exec.SetObserver(graphObserver(r))
	return exec, nil
}

func graphObserver(r *KindContainerRuntime) executor.Observer {
	return executor.ObserverFunc(func(event executor.Event) {
		if event.Type != executor.EventApplyDone && event.Type != executor.EventApplyFailed {
			return
		}
		switch event.Resource {
		case resource.ContainerID(registryName):
			notifyRegistryStarted(r, event.Error)
		case r.BaseInfrastructureRef().ID():
			notifyIngressReady(r, event.Error)
		}
	})
}

func notifyRegistryStarted(r *KindContainerRuntime, err error) {
	if r.RegistryStartedEvent == nil {
		return
	}
	notifyNonBlocking(r.RegistryStartedEvent, err)
}

func notifyIngressReady(r *KindContainerRuntime, err error) {
	if r.IngressReadyEvent == nil {
		return
	}
	notifyNonBlocking(r.IngressReadyEvent, err)
}

func notifyNonBlocking(ch chan<- error, err error) {
	select {
	case ch <- err:
	default:
	}
}

// New creates a new KindContainerRuntime instance.
func New(
	variant KindContainerRuntimeVariant,
	cachePath string,
	options KindContainerRuntimeOptions,
) (*KindContainerRuntime, error) {
	r, clusters, err := initialize(cachePath, false)
	if err != nil {
		return nil, err
	}
	r.options = options
	err = newInternal(r, clusters, variant, cachePath, false)
	if err != nil {
		return nil, err
	}

	// Note: kubernetes/flux clients are initialized in Run() after cluster creation
	return r, nil
}

func Load(
	variant KindContainerRuntimeVariant,
	cachePath string,
	options KindContainerRuntimeOptions,
) (*KindContainerRuntime, error) {
	r, clusters, err := initialize(cachePath, true)
	if err != nil {
		return nil, err
	}
	r.options = options
	err = newInternal(r, clusters, variant, cachePath, true)
	if err != nil {
		return nil, err
	}

	// Initialize kubernetes/flux clients now that we know the cluster name
	if err := r.initializeClients(); err != nil {
		return nil, err
	}

	return r, nil
}

func LoadCurrent(cachePath string) (*KindContainerRuntime, error) {
	r, clusters, err := initialize(cachePath, true)
	if err != nil {
		return nil, err
	}
	var variant *KindContainerRuntimeVariant
	for _, cluster := range clusters {
		if cluster == standardClusterName {
			v := KindContainerRuntimeVariantStandard
			variant = &v
			break
		} else if cluster == minimalClusterName {
			v := KindContainerRuntimeVariantMinimal
			variant = &v
			break
		}
	}

	if variant == nil {
		return nil, errNoCurrentCluster
	}

	err = newInternal(r, clusters, *variant, cachePath, true)
	if err != nil {
		return nil, err
	}

	// Initialize kubernetes/flux clients now that we know the cluster name
	if err := r.initializeClients(); err != nil {
		return nil, err
	}

	return r, nil
}

func initialize(cachePath string, isLoad bool) (*KindContainerRuntime, []string, error) {
	// Validate and create cachePath
	if isLoad {
		if _, err := os.Stat(cachePath); err != nil {
			return nil, nil, fmt.Errorf("cache directory stat error: %w", err)
		}
	} else {
		if err := cache.EnsureCache(cachePath); err != nil {
			return nil, nil, fmt.Errorf("failed to ensure cache directory: %w", err)
		}
	}

	// Initialize clients
	containerClient, err := container.Detect(context.Background())
	if err != nil {
		return nil, nil, fmt.Errorf("failed to detect container runtime: %w", err)
	}

	kindClient := kindclient.New()
	clusters, err := kindClient.GetClusters()
	if err != nil {
		return nil, nil, fmt.Errorf("couldn't get current clusters: %w", err)
	}

	// plainHTTP for local registry without TLS
	helmClient, err := helm.NewClient(true)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create helm client: %w", err)
	}

	ociClient := oci.NewClient()

	return &KindContainerRuntime{
		cachePath: cachePath,

		ContainerClient: containerClient,
		HelmClient:      helmClient,
		KindClient:      kindClient,
		OCIClient:       ociClient,
	}, clusters, nil
}

// initializeClients creates the KubernetesClient and FluxClient for the runtime.
// Must be called after clusterName is set.
//
//nolint:funcorder // Initialization helpers are grouped with constructor/setup logic rather than exported accessors.
func (r *KindContainerRuntime) initializeClients() error {
	contextName := r.GetContextName()

	kubernetesClient, err := kubernetes.New(contextName)
	if err != nil {
		return fmt.Errorf("failed to create kubernetes client: %w", err)
	}

	fluxClient, err := flux.New(kubernetesClient)
	if err != nil {
		return fmt.Errorf("failed to create flux client: %w", err)
	}

	r.KubernetesClient = kubernetesClient
	r.FluxClient = fluxClient
	return nil
}

// InitializeClients initializes Kubernetes and Flux clients for the current cluster.
func (r *KindContainerRuntime) InitializeClients() error {
	return r.initializeClients()
}

func newInternal(
	r *KindContainerRuntime,
	clusters []string,
	variant KindContainerRuntimeVariant,
	_ string,
	isLoad bool,
) error {
	var clusterName string

	switch variant {
	case KindContainerRuntimeVariantStandard:
		clusterName = standardClusterName
	case KindContainerRuntimeVariantMinimal:
		clusterName = minimalClusterName
	default:
		return fmt.Errorf("%w: %d", errUnknownVariant, variant)
	}

	foundCluster := false
	for _, cluster := range clusters {
		if cluster == clusterName {
			foundCluster = true
		} else if strings.HasPrefix(cluster, "runtime-fixture-kind-") {
			// Only reject conflicting fixture variants
			return fmt.Errorf("%w: %s", errConflictingVariant, cluster)
		}
		// else: ignore unrelated user clusters
	}

	if isLoad && !foundCluster {
		return errClusterVariantNotFound
	}

	r.variant = variant
	r.clusterName = clusterName

	switch variant {
	case KindContainerRuntimeVariantStandard:
		r.kindConfig = manifests.BuildStandardConfig(clusterName)
	case KindContainerRuntimeVariantMinimal:
		r.kindConfig = manifests.BuildMinimalConfig(clusterName)
	}

	return nil
}

// Stop ensures the container runtime is stopped
// This function is idempotent - it returns nil if the cluster doesn't exist.
func (r *KindContainerRuntime) Stop() error {
	writeKindStdoutf("=== Stopping Kind Container Runtime (%s) ===\n", r.clusterName)

	// Check if cluster exists
	exists, err := r.clusterExists()
	if err != nil {
		return fmt.Errorf("failed to check cluster existence: %w", err)
	}

	if !exists {
		writeKindStdoutf("Cluster %s does not exist, nothing to stop\n", r.clusterName)
		return nil
	}

	// Delete the cluster
	writeKindStdoutf("Deleting cluster %s...\n", r.clusterName)
	if err := r.KindClient.DeleteCluster(r.clusterName); err != nil {
		return fmt.Errorf("failed to delete cluster: %w", err)
	}

	// Let's not stop the registry, it's fairly lightweight
	// The pdf3 solution uses checksumming to avoid rebuilding/pushing images and artifacts
	// unless necessary, so this way we don't accidentally ruin that..

	// err = r.stopRegistry()
	// if err != nil {
	// 	return fmt.Errorf("failed to delete cluster: %w", err)
	// }

	writeKindStdoutf("✓ Cluster %s deleted successfully\n", r.clusterName)
	return nil
}

// Close releases resources held by the runtime (e.g., container client connections).
// This should be called when the runtime is no longer needed.
func (r *KindContainerRuntime) Close() error {
	if r.ContainerClient != nil {
		if err := r.ContainerClient.Close(); err != nil {
			return fmt.Errorf("close container client: %w", err)
		}
	}
	return nil
}

// GetContextName returns the kubectl context name for this cluster.
func (r *KindContainerRuntime) GetContextName() string {
	return "kind-" + r.clusterName
}

// ClusterName returns the kind cluster name managed by this runtime.
func (r *KindContainerRuntime) ClusterName() string {
	return r.clusterName
}

// ClusterRef returns a reference to the kind cluster resource managed by this runtime.
func (r *KindContainerRuntime) ClusterRef() resource.ResourceRef {
	return resource.RefID(resource.KindClusterID(r.clusterName))
}

// RegistryRef returns a reference to the local registry container resource managed by this runtime.
func (r *KindContainerRuntime) RegistryRef() resource.ResourceRef {
	return resource.RefID(resource.ContainerID(registryName))
}

// BaseInfrastructureRef returns a reference to the base Kubernetes object set managed by this runtime.
func (r *KindContainerRuntime) BaseInfrastructureRef() resource.ResourceRef {
	return resource.RefID(resource.KubernetesObjectSetID(baseInfrastructureName))
}
