package kind

import (
	"context"
	_ "embed"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"altinn.studio/runtime-fixture/pkg/cache"
	"altinn.studio/runtime-fixture/pkg/container"
	"altinn.studio/runtime-fixture/pkg/flux"
	"altinn.studio/runtime-fixture/pkg/kindcli"
	"altinn.studio/runtime-fixture/pkg/kubernetes"
	"altinn.studio/runtime-fixture/pkg/runtimes"
	"altinn.studio/runtime-fixture/pkg/tools"
)

//go:embed config/kind.config.standard.yaml
var kindConfigStandard []byte

//go:embed config/kind.config.minimal.yaml
var kindConfigMinimal []byte

//go:embed config/certs/ca.crt
var certCACrt []byte

//go:embed config/certs/ca.key
var certCAKey []byte

//go:embed config/certs/issuer.crt
var certIssuerCrt []byte

//go:embed config/certs/issuer.key
var certIssuerKey []byte

//go:embed config/testserver.yaml
var testserverManifest []byte

//go:embed config/base-infrastructure.yaml
var baseInfrastructureManifest []byte

type KindContainerRuntimeVariant int

const (
	KindContainerRuntimeVariantStandard KindContainerRuntimeVariant = iota
	KindContainerRuntimeVariantMinimal
)

type KindContainerRuntime struct {
	variant        KindContainerRuntimeVariant
	cachePath      string
	clusterName    string
	configPath     string
	certsPath      string
	testserverPath string

	Installer *tools.Installer

	ContainerClient  container.ContainerClient
	FluxClient       *flux.FluxClient
	KindClient       *kindcli.KindClient
	KubernetesClient *kubernetes.KubernetesClient

	RegistryStartedEvent chan<- struct{}
}

// logDuration logs the duration of an operation
// Usage: defer logDuration("Operation name", time.Now())
func logDuration(stepName string, start time.Time) {
	fmt.Printf("  [%s took %s]\n", stepName, time.Since(start))
}

// New creates a new KindContainerRuntime instance
func New(variant KindContainerRuntimeVariant, cachePath string) (*KindContainerRuntime, error) {
	r, err := newInternal(variant, cachePath, false)
	if err != nil {
		return nil, err
	}

	var configContent []byte

	switch variant {
	case KindContainerRuntimeVariantStandard:
		configContent = kindConfigStandard
	case KindContainerRuntimeVariantMinimal:
		configContent = kindConfigMinimal
	default:
		return nil, fmt.Errorf("unknown variant: %d", variant)
	}

	// Write embedded config to disk
	if err := os.WriteFile(r.configPath, configContent, 0644); err != nil {
		return nil, fmt.Errorf("failed to write kind config: %w", err)
	}

	// Write embedded certificates to disk
	if err := r.writeCertificates(); err != nil {
		return nil, fmt.Errorf("failed to write certificates: %w", err)
	}

	// Write testserver manifest to disk
	if err := os.WriteFile(r.testserverPath, testserverManifest, 0644); err != nil {
		return nil, fmt.Errorf("failed to write testserver manifest: %w", err)
	}

	return r, nil
}

func Load(variant KindContainerRuntimeVariant, cachePath string) (*KindContainerRuntime, error) {
	r, err := newInternal(variant, cachePath, true)
	if err != nil {
		return nil, err
	}

	return r, nil
}

func newInternal(variant KindContainerRuntimeVariant, cachePath string, isLoad bool) (*KindContainerRuntime, error) {
	// Validate and create cachePath
	if isLoad {
		if _, err := os.Stat(cachePath); err != nil {
			return nil, fmt.Errorf("cache directory stat error: %w", err)
		}
	} else {
		if err := cache.EnsureCache(cachePath); err != nil {
			return nil, fmt.Errorf("failed to ensure cache directory: %w", err)
		}
	}

	var clusterName string
	var configDir string

	switch variant {
	case KindContainerRuntimeVariantStandard:
		clusterName = "runtime-fixture-kind-standard"
		configDir = filepath.Join(cachePath, "config", "kind-standard")
	case KindContainerRuntimeVariantMinimal:
		clusterName = "runtime-fixture-kind-minimal"
		configDir = filepath.Join(cachePath, "config", "kind-minimal")
	default:
		return nil, fmt.Errorf("unknown variant: %d", variant)
	}

	if isLoad {
		if _, err := os.Stat(configDir); err != nil {
			return nil, fmt.Errorf("cache config directory stat error: %w", err)
		}
	} else {
		err := cache.EnsureDirExists(configDir)
		if err != nil {
			return nil, err
		}
	}

	configPath := filepath.Join(configDir, "kind.config.yaml")
	certsPath := filepath.Join(configDir, "certs")
	testserverPath := filepath.Join(configDir, "testserver.yaml")

	// Initialiize clients
	containerClient, err := container.Detect()
	if err != nil {
		return nil, fmt.Errorf("failed to detect container runtime: %w", err)
	}
	installer, err := tools.NewInstaller(cachePath, false, true)
	if err != nil {
		return nil, err
	}

	if _, err := installer.Install(context.Background(), ""); err != nil {
		return nil, fmt.Errorf("failed to ensure CLIs: %w", err)
	}

	fluxClient, err := installer.GetFluxClient()
	if err != nil {
		return nil, err
	}

	kubernetesClient, err := installer.GetKubernetesClient()
	if err != nil {
		return nil, err
	}

	kindClient, err := installer.GetKindClient()
	if err != nil {
		return nil, err
	}

	r := &KindContainerRuntime{
		variant:        variant,
		cachePath:      cachePath,
		clusterName:    clusterName,
		configPath:     configPath,
		certsPath:      certsPath,
		testserverPath: testserverPath,

		Installer: installer,

		ContainerClient:  containerClient,
		FluxClient:       fluxClient,
		KindClient:       kindClient,
		KubernetesClient: kubernetesClient,
	}

	return r, nil
}

// writeCertificates writes embedded certificates to the certs directory
func (r *KindContainerRuntime) writeCertificates() error {
	// Create certs directory
	if err := os.MkdirAll(r.certsPath, 0755); err != nil {
		return fmt.Errorf("failed to create certs directory: %w", err)
	}

	// Write certificates
	certs := map[string][]byte{
		"ca.crt":     certCACrt,
		"ca.key":     certCAKey,
		"issuer.crt": certIssuerCrt,
		"issuer.key": certIssuerKey,
	}

	for filename, content := range certs {
		path := filepath.Join(r.certsPath, filename)
		if err := os.WriteFile(path, content, 0644); err != nil {
			return fmt.Errorf("failed to write %s: %w", filename, err)
		}
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
			timeout := 5 * time.Second
			deadline := time.Now().Add(timeout)

			httpClient := &http.Client{
				Timeout: 1 * time.Second,
			}

			for !time.Now().After(deadline) {

				resp, err := httpClient.Get("http://localhost:5001/v2/")
				if err != nil {
					continue
				}
				status := resp.StatusCode
				_ = resp.Body.Close()
				if status == http.StatusOK {
					break
				}
			}
			close(r.RegistryStartedEvent)
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

	// Step 4: Set kubectl context
	fmt.Println("\n4. Setting kubectl context...")
	start = time.Now()
	if err := r.setKubectlContext(); err != nil {
		return fmt.Errorf("failed to set kubectl context: %w", err)
	}
	fmt.Println("✓ Kubectl context set")
	logDuration("Set kubectl context", start)

	// Step 5: Configure registry
	fmt.Println("\n5. Configuring up container registry...")
	start = time.Now()
	if err := r.configureRegistry(); err != nil {
		return fmt.Errorf("failed to configure registry: %w", err)
	}
	fmt.Println("✓ Container registry configured")
	logDuration("Configure container registry", start)

	// Only install components for Standard variant
	if r.variant == KindContainerRuntimeVariantStandard {
		if err := r.setupStandardVariant(); err != nil {
			return err
		}
	}

	fmt.Println("\n=== Kind Container Runtime Ready ===")
	return nil
}

// setupStandardVariant sets up all components for the Standard variant
func (r *KindContainerRuntime) setupStandardVariant() error {
	// Step 6: Install Flux
	fmt.Println("\n6. Installing Flux...")
	start := time.Now()
	if err := r.installFluxToCluster(); err != nil {
		return fmt.Errorf("failed to install flux: %w", err)
	}
	fmt.Println("✓ Flux installed")
	logDuration("Install Flux", start)

	// Step 7: Deploy base infrastructure
	fmt.Println("\n7. Deploying base infrastructure...")
	start = time.Now()
	if err := r.applyBaseInfrastructure(); err != nil {
		return fmt.Errorf("failed to deploy base infrastructure: %w", err)
	}
	fmt.Println("✓ Base infrastructure deployed")
	logDuration("Deploy base infrastructure", start)

	// Step 8: Wait for Flux controllers
	fmt.Println("\n8. Waiting for Flux controllers...")
	start = time.Now()
	if err := r.waitForFluxControllers(); err != nil {
		return fmt.Errorf("failed waiting for flux controllers: %w", err)
	}
	fmt.Println("✓ Flux controllers ready")
	logDuration("Wait for Flux controllers", start)

	// Step 9: Reconcile Traefik to ensure CRDs are available
	fmt.Println("\n9. Reconciling Traefik...")
	start = time.Now()
	if err := r.reconcileTraefik(); err != nil {
		return fmt.Errorf("failed to reconcile traefik: %w", err)
	}
	fmt.Println("✓ Traefik ready")
	logDuration("Reconcile Traefik", start)

	// Step 10: Apply testserver manifest
	fmt.Println("\n10. Applying testserver manifest...")
	start = time.Now()
	if err := r.applyManifestFromString(string(testserverManifest)); err != nil {
		return fmt.Errorf("failed to apply testserver manifest: %w", err)
	}
	fmt.Println("✓ Testserver manifest applied")
	logDuration("Apply testserver manifest", start)

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

var _ runtimes.ContainerRuntime = (*KindContainerRuntime)(nil)
