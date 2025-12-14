package kind

import (
	_ "embed"
	"fmt"
	"net/http"
	"os"
	"time"

	"altinn.studio/runtime-fixture/pkg/cache"
	"altinn.studio/runtime-fixture/pkg/container"
	"altinn.studio/runtime-fixture/pkg/flux"
	"altinn.studio/runtime-fixture/pkg/helm"
	"altinn.studio/runtime-fixture/pkg/kindclient"
	"altinn.studio/runtime-fixture/pkg/kubernetes"
	"altinn.studio/runtime-fixture/pkg/oci"
	"altinn.studio/runtime-fixture/pkg/runtimes"
	"altinn.studio/runtime-fixture/pkg/runtimes/kind/manifests"
	"sigs.k8s.io/kind/pkg/apis/config/v1alpha4"
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

type KindContainerRuntimeVariant int

const (
	KindContainerRuntimeVariantStandard KindContainerRuntimeVariant = iota
	KindContainerRuntimeVariantMinimal
)

// KindContainerRuntimeOptions holds configuration options for the Kind runtime
type KindContainerRuntimeOptions struct {
	// IncludeMonitoring controls whether the Prometheus/Grafana stack is deployed.
	// When false (default), only prometheus-operator-crds are installed for CRD support.
	// When true, the full kube-prometheus-stack is deployed.
	IncludeMonitoring bool

	// IncludeTestserver controls whether the testserver deployment is deployed.
	// When false (default), no testserver is deployed.
	// When true, the testserver (nginx with test pages) is deployed for integration testing.
	IncludeTestserver bool
}

// DefaultOptions returns the default options for the Kind runtime
func DefaultOptions() KindContainerRuntimeOptions {
	return KindContainerRuntimeOptions{
		IncludeMonitoring: false,
		IncludeTestserver: false,
	}
}

type KindContainerRuntime struct {
	variant     KindContainerRuntimeVariant
	options     KindContainerRuntimeOptions
	cachePath   string
	clusterName string
	kindConfig  *v1alpha4.Cluster

	ContainerClient  container.ContainerClient
	FluxClient       *flux.FluxClient
	HelmClient       *helm.Client
	KindClient       *kindclient.KindClient
	KubernetesClient *kubernetes.KubernetesClient
	OCIClient        *oci.Client

	RegistryStartedEvent chan<- error
	IngressReadyEvent    chan<- error
}

// logDuration logs the duration of an operation
// Usage: defer logDuration("Operation name", time.Now())
func logDuration(stepName string, start time.Time) {
	fmt.Printf("  [%s took %s]\n", stepName, time.Since(start))
}

// New creates a new KindContainerRuntime instance
func New(variant KindContainerRuntimeVariant, cachePath string, options KindContainerRuntimeOptions) (*KindContainerRuntime, error) {
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

func Load(variant KindContainerRuntimeVariant, cachePath string, options KindContainerRuntimeOptions) (*KindContainerRuntime, error) {
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
	var variant *KindContainerRuntimeVariant = nil
	for _, cluster := range clusters {
		if cluster == "runtime-fixture-kind-standard" {
			v := KindContainerRuntimeVariantStandard
			variant = &v
			break
		} else if cluster == "runtime-fixture-kind-minimal" {
			v := KindContainerRuntimeVariantMinimal
			variant = &v
			break
		}
	}

	if variant == nil {
		return nil, fmt.Errorf("no KindContainerRuntime cluster is currently running")
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
	containerClient, err := container.Detect()
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

func newInternal(r *KindContainerRuntime, clusters []string, variant KindContainerRuntimeVariant, _ string, isLoad bool) error {
	var clusterName string

	switch variant {
	case KindContainerRuntimeVariantStandard:
		clusterName = "runtime-fixture-kind-standard"
	case KindContainerRuntimeVariantMinimal:
		clusterName = "runtime-fixture-kind-minimal"
	default:
		return fmt.Errorf("unknown variant: %d", variant)
	}

	foundCluster := false
	for _, cluster := range clusters {
		if cluster != clusterName {
			return fmt.Errorf("another KindContainerRuntime cluster variant is already running: %s", cluster)
		} else {
			foundCluster = true
		}
	}

	if isLoad && !foundCluster {
		return fmt.Errorf("KindContainerRuntime cluster variant wasn't found running")
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

// Run ensures the container runtime is running
// This function is idempotent - it can be called multiple times safely
func (r *KindContainerRuntime) Run() error {
	fmt.Println("=== Starting Kind Container Runtime ===")

	// Step 1: Setup container registry
	fmt.Println("\n1. Setting up container registry...")
	start := time.Now()
	if err := r.startRegistry(); err != nil {
		return fmt.Errorf("failed to setup registry: %w", err)
	}
	fmt.Println("✓ Container registry ready")
	logDuration("Setup container registry", start)

	if r.RegistryStartedEvent != nil {
		go func() {
			succeeded := false
			defer func() { fmt.Printf("Done waiting for registry. Succeeded=%t\n", succeeded) }()
			timeout := 30 * time.Second
			deadline := time.Now().Add(timeout)

			httpClient := &http.Client{
				Timeout: 1 * time.Second,
			}

			for !time.Now().After(deadline) {
				resp, err := httpClient.Get("http://localhost:5001/v2/")
				if err == nil && resp.StatusCode == http.StatusOK {
					_ = resp.Body.Close()
					succeeded = true
					break
				} else if resp != nil {
					_ = resp.Body.Close()
				}
				time.Sleep(250 * time.Millisecond)
			}
			if succeeded {
				r.RegistryStartedEvent <- nil
			} else {
				r.RegistryStartedEvent <- fmt.Errorf("timed out waiting for registry")
			}
		}()
	}

	// Step 3: Check if cluster exists, create if not
	fmt.Println("\n3. Checking Kind cluster...")
	exists, err := r.clusterExists()
	if err != nil {
		return fmt.Errorf("failed to check cluster: %w", err)
	}

	if !exists {
		start = time.Now()
		if err := r.createCluster(); err != nil {
			return fmt.Errorf("failed to create cluster: %w", err)
		}
		logDuration("Create cluster", start)
	} else {
		fmt.Printf("✓ Cluster %s already exists\n", r.clusterName)
	}

	// Initialize kubernetes/flux clients now that cluster exists
	if r.KubernetesClient == nil {
		if err := r.initializeClients(); err != nil {
			return fmt.Errorf("failed to initialize clients: %w", err)
		}
	}

	// Step 4: Configure registry
	fmt.Println("\n4. Configuring container registry...")
	start = time.Now()
	if err := r.configureRegistry(); err != nil {
		return fmt.Errorf("failed to configure registry: %w", err)
	}
	fmt.Println("✓ Container registry configured")
	logDuration("Configure container registry", start)

	if err := r.installInfra(); err != nil {
		return err
	}

	fmt.Println("\n=== Kind Container Runtime Ready ===")
	return nil
}

// installInfra sets up all components for the Standard variant
func (r *KindContainerRuntime) installInfra() error {
	// Step 5: Install Flux
	fmt.Println("\n5. Installing Flux...")
	start := time.Now()
	// TODO: find a way to customize controllers for vertical scaling
	// e.g. concurrency and requeueuing
	if err := r.installFluxToCluster(); err != nil {
		return fmt.Errorf("failed to install flux: %w", err)
	}
	r.KubernetesClient.ResetMapper() // Flux installed new CRDs
	fmt.Println("✓ Flux installed")
	logDuration("Install Flux", start)

	// Step 6: Deploy base infrastructure
	fmt.Println("\n6. Deploying base infrastructure...")
	start = time.Now()
	if err := r.applyBaseInfrastructure(); err != nil {
		return fmt.Errorf("failed to deploy base infrastructure: %w", err)
	}
	fmt.Println("✓ Base infrastructure deployed")
	logDuration("Deploy base infrastructure", start)

	// Step 7: Wait for Flux controllers
	fmt.Println("\n7. Waiting for Flux controllers...")
	start = time.Now()
	if err := r.waitForFluxControllers(); err != nil {
		return fmt.Errorf("failed waiting for flux controllers: %w", err)
	}
	r.KubernetesClient.ResetMapper() // CRDs fully available now
	fmt.Println("✓ Flux controllers ready")
	logDuration("Wait for Flux controllers", start)

	// Step 8: Reconcile base infra
	fmt.Println("\n8. Reconciling base infra...")
	start = time.Now()
	if err := r.reconcileBaseInfra(); err != nil {
		return fmt.Errorf("failed to reconcile base infra: %w", err)
	}
	fmt.Println("✓ Base infra ready")
	logDuration("Reconcile base infra", start)

	// Step 9: Apply testserver manifest (only if enabled)
	if r.options.IncludeTestserver {
		fmt.Println("\n9. Applying testserver manifest...")
		start = time.Now()
		replicas := int32(3)
		if r.variant == KindContainerRuntimeVariantMinimal {
			replicas = 1
		}
		testserverObjs := manifests.BuildTestserver(
			testserverNginxConf,
			testserverIndexHtml,
			testserverEur1Html,
			jumpboxNginxConf,
			replicas,
		)
		if _, err := r.KubernetesClient.ApplyObjects(testserverObjs...); err != nil {
			return fmt.Errorf("failed to apply testserver manifest: %w", err)
		}
		fmt.Println("✓ Testserver manifest applied")
		logDuration("Apply testserver manifest", start)
	}

	return nil
}

// Stop ensures the container runtime is stopped
// This function is idempotent - it returns nil if the cluster doesn't exist
func (r *KindContainerRuntime) Stop() error {
	fmt.Printf("=== Stopping Kind Container Runtime (%s) ===\n", r.clusterName)

	// Check if cluster exists
	exists, err := r.clusterExists()
	if err != nil {
		return fmt.Errorf("failed to check cluster existence: %w", err)
	}

	if !exists {
		fmt.Printf("Cluster %s does not exist, nothing to stop\n", r.clusterName)
		return nil
	}

	// Delete the cluster
	fmt.Printf("Deleting cluster %s...\n", r.clusterName)
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

	fmt.Printf("✓ Cluster %s deleted successfully\n", r.clusterName)
	return nil
}

// GetContextName returns the kubectl context name for this cluster
func (r *KindContainerRuntime) GetContextName() string {
	return fmt.Sprintf("kind-%s", r.clusterName)
}

var _ runtimes.ContainerRuntime = (*KindContainerRuntime)(nil)
