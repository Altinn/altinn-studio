package harness

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"time"

	"altinn.studio/devenv/pkg/flux"
	"altinn.studio/devenv/pkg/runtimes/kind"
	"golang.org/x/sync/errgroup"
)

// Config describes the complete setup/deployment specification
type Config struct {
	// ProjectRoot is required - all relative paths resolve from here
	ProjectRoot string

	// CachePath relative to ProjectRoot, defaults to ".cache"
	CachePath string

	// Variant determines cluster size (minimal/standard)
	Variant kind.KindContainerRuntimeVariant

	// ClusterOptions for kind cluster
	ClusterOptions kind.KindContainerRuntimeOptions

	// Images to build and push (run in parallel once registry ready)
	Images []Image

	// Artifacts to push to OCI registry (run in parallel with image builds)
	Artifacts []Artifact

	// HelmCharts to download and push (run in parallel with other tasks)
	HelmCharts []HelmChart

	// Deployments to execute after all images/artifacts ready (sequential)
	Deployments []Deployment
}

// Image represents a container image to build and push
type Image struct {
	Name       string // descriptive name for logging
	Context    string // build context path (relative to ProjectRoot, or absolute). Defaults to ProjectRoot if empty
	Dockerfile string // dockerfile path (relative to context)
	Tag        string // full tag including registry, e.g., "localhost:5001/myapp:latest"
}

// Artifact represents an OCI artifact to push
type Artifact struct {
	Name     string // descriptive name for logging
	URL      string // OCI URL, e.g., "oci://localhost:5001/my-repo:local"
	Path     string // local path (relative to ProjectRoot, or absolute)
	Source   string // source identifier for flux, defaults to "local"
	Revision string // revision identifier for flux, defaults to "local"
}

// HelmChart represents a helm chart to download and push
type HelmChart struct {
	Name       string // descriptive name for logging
	RepoURL    string // git repo URL
	RepoBranch string // branch to clone
	ChartPath  string // path within repo to chart directory
	OCIRef     string // OCI registry reference, e.g., "oci://localhost:5001"
}

// Deployment represents a Flux-based deployment
type Deployment struct {
	Name string // descriptive name for logging

	// WaitForIngress blocks until ingress/CRDs are ready before deploying.
	// Use for deployments that depend on Traefik CRDs (e.g., IngressRoute).
	WaitForIngress bool

	// One of: Kustomize or Helm (mutually exclusive)
	Kustomize *KustomizeDeploy
	Helm      *HelmDeploy
}

// KustomizeDeploy deploys via Flux Kustomization
type KustomizeDeploy struct {
	// SyncRootDir is the kustomize overlay directory to render and apply (relative to ProjectRoot)
	SyncRootDir string

	// KustomizationName is the Flux Kustomization resource name
	KustomizationName string

	// Namespace is the namespace of the Kustomization
	Namespace string

	// Rollouts to wait for after reconciliation
	Rollouts []Rollout

	// ReconcileOpts for the Flux reconcile operation. Uses defaults if nil.
	ReconcileOpts *flux.ReconcileOptions
}

// HelmDeploy deploys via Flux HelmRelease
type HelmDeploy struct {
	// ManifestPath is the path to the HelmRelease manifest (relative to ProjectRoot)
	ManifestPath string

	// HelmRepositoryName for HelmRepository reconciliation
	HelmRepositoryName string

	// HelmRepositoryNamespace for HelmRepository reconciliation
	HelmRepositoryNamespace string

	// HelmReleaseName for HelmRelease reconciliation
	HelmReleaseName string

	// HelmReleaseNamespace for HelmRelease reconciliation
	HelmReleaseNamespace string

	// Rollouts to wait for
	Rollouts []Rollout

	// ReconcileOpts for the Flux reconcile operation. Uses defaults if nil.
	ReconcileOpts *flux.ReconcileOptions
}

// Rollout identifies a deployment to wait for
type Rollout struct {
	Deployment string
	Namespace  string
	Timeout    time.Duration // defaults to 2 minutes if zero
}

// Result from harness execution
type Result struct {
	Runtime *kind.KindContainerRuntime
}

// AsyncOptions for RunAsync to receive events during setup
type AsyncOptions struct {
	RegistryReady chan<- error // signaled when registry is accepting pushes
	IngressReady  chan<- error // signaled when ingress is configured
}

// Run executes the harness configuration synchronously
func Run(cfg Config) (*Result, error) {
	return run(cfg, nil)
}

// RunAsync executes with event channels for fine-grained coordination
func RunAsync(cfg Config, opts AsyncOptions) (*Result, error) {
	return run(cfg, &opts)
}

// LoadExisting loads a pre-existing runtime (for CI scenarios)
func LoadExisting(cachePath string) (*Result, error) {
	runtime, err := kind.LoadCurrent(cachePath)
	if err != nil {
		return nil, fmt.Errorf("failed to load existing runtime: %w", err)
	}
	return &Result{Runtime: runtime}, nil
}

func run(cfg Config, asyncOpts *AsyncOptions) (*Result, error) {
	if err := validateConfig(&cfg); err != nil {
		return nil, err
	}

	cachePath := cfg.CachePath
	if cachePath == "" {
		cachePath = ".cache"
	}
	absoluteCachePath := filepath.Join(cfg.ProjectRoot, cachePath)

	fmt.Println("=== Setting Up Runtime ===")

	// Step 1: Create the kind cluster runtime
	runtime, err := kind.New(cfg.Variant, absoluteCachePath, cfg.ClusterOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to create kind runtime: %w", err)
	}

	// Async mode: overlap cluster setup with build/push
	if asyncOpts != nil {
		return runAsync(cfg, runtime, asyncOpts)
	}

	// Sync mode: complete cluster setup first, then build/push
	return runSync(cfg, runtime)
}

// runSync runs cluster setup synchronously, then parallel build/push, then deploy
func runSync(cfg Config, runtime *kind.KindContainerRuntime) (*Result, error) {
	// Step 1: Run cluster setup (blocks until complete including infra)
	fmt.Println("Setting up cluster...")
	if err := runtime.Run(); err != nil {
		return nil, fmt.Errorf("cluster setup failed: %w", err)
	}

	// Step 2: Run parallel build/push tasks
	if len(cfg.Images) > 0 || len(cfg.Artifacts) > 0 || len(cfg.HelmCharts) > 0 {
		fmt.Println("Building images and pushing artifacts...")
		if err := runParallelTasks(cfg, runtime); err != nil {
			return nil, err
		}
	}

	// Step 3: Execute deployments sequentially
	for _, dep := range cfg.Deployments {
		if err := executeDeploy(cfg, runtime, dep); err != nil {
			return nil, fmt.Errorf("deployment %q failed: %w", dep.Name, err)
		}
	}

	fmt.Println("=== Runtime Setup Complete ===")
	return &Result{Runtime: runtime}, nil
}

// runAsync overlaps cluster setup with build/push using event channels
func runAsync(cfg Config, runtime *kind.KindContainerRuntime, asyncOpts *AsyncOptions) (*Result, error) {
	// Set up event channels for async signaling
	registryReady := make(chan error, 1)
	ingressReady := make(chan error, 1)
	runtime.RegistryStartedEvent = registryReady
	runtime.IngressReadyEvent = ingressReady

	// Start cluster in background
	clusterDone := make(chan error, 1)
	go func() {
		clusterDone <- runtime.Run()
	}()

	// Wait for registry to be ready
	fmt.Println("Waiting for registry...")
	select {
	case err := <-registryReady:
		if err != nil {
			return nil, fmt.Errorf("registry startup failed: %w", err)
		}
	case err := <-clusterDone:
		if err != nil {
			return nil, fmt.Errorf("cluster setup failed: %w", err)
		}
		return nil, errors.New("cluster completed but registry never signaled ready")
	case <-time.After(5 * time.Minute):
		return nil, errors.New("timeout waiting for registry")
	}

	// Signal registry ready to caller
	if asyncOpts.RegistryReady != nil {
		asyncOpts.RegistryReady <- nil
	}

	// Run parallel build/push tasks (overlapped with cluster setup)
	if len(cfg.Images) > 0 || len(cfg.Artifacts) > 0 || len(cfg.HelmCharts) > 0 {
		fmt.Println("Building images and pushing artifacts...")
		if err := runParallelTasks(cfg, runtime); err != nil {
			return nil, err
		}
	}

	// Wait for cluster setup to complete
	select {
	case err := <-clusterDone:
		if err != nil {
			return nil, fmt.Errorf("cluster setup failed: %w", err)
		}
	default:
		// Check if cluster already finished during parallel tasks
		select {
		case err := <-clusterDone:
			if err != nil {
				return nil, fmt.Errorf("cluster setup failed: %w", err)
			}
		case <-time.After(5 * time.Minute):
			return nil, errors.New("timeout waiting for cluster setup")
		}
	}

	// Execute deployments sequentially, respecting WaitForIngress flag
	var ingressWaiters []Deployment
	for _, dep := range cfg.Deployments {
		if dep.WaitForIngress {
			ingressWaiters = append(ingressWaiters, dep)
			continue
		}
		if err := executeDeploy(cfg, runtime, dep); err != nil {
			return nil, fmt.Errorf("deployment %q failed: %w", dep.Name, err)
		}
	}

	// Wait for ingress ready
	if len(ingressWaiters) > 0 || asyncOpts.IngressReady != nil {
		fmt.Println("Waiting for ingress...")
		select {
		case err := <-ingressReady:
			if err != nil {
				return nil, fmt.Errorf("ingress setup failed: %w", err)
			}
		case <-time.After(3 * time.Minute):
			return nil, errors.New("timeout waiting for ingress")
		}
	}

	if asyncOpts.IngressReady != nil {
		asyncOpts.IngressReady <- nil
	}

	// Execute deployments that were waiting for ingress
	for _, dep := range ingressWaiters {
		if err := executeDeploy(cfg, runtime, dep); err != nil {
			return nil, fmt.Errorf("deployment %q failed: %w", dep.Name, err)
		}
	}

	fmt.Println("=== Runtime Setup Complete ===")
	return &Result{Runtime: runtime}, nil
}

func validateConfig(cfg *Config) error {
	if cfg.ProjectRoot == "" {
		return errors.New("ProjectRoot is required")
	}
	return nil
}

func runParallelTasks(cfg Config, runtime *kind.KindContainerRuntime) error {
	g, ctx := errgroup.WithContext(context.Background())

	// Build and push images
	for _, img := range cfg.Images {
		g.Go(func() error {
			return buildAndPushImage(ctx, cfg, runtime, img)
		})
	}

	// Push artifacts
	for _, art := range cfg.Artifacts {
		g.Go(func() error {
			return pushArtifact(ctx, cfg, runtime, art)
		})
	}

	// Download and push helm charts
	for _, chart := range cfg.HelmCharts {
		g.Go(func() error {
			return downloadAndPushHelmChart(ctx, cfg, runtime, chart)
		})
	}

	return g.Wait()
}

func executeDeploy(cfg Config, runtime *kind.KindContainerRuntime, dep Deployment) error {
	fmt.Printf("Deploying %s...\n", dep.Name)
	start := time.Now()

	var err error
	if dep.Kustomize != nil {
		err = deployKustomize(cfg, runtime, dep.Kustomize)
	} else if dep.Helm != nil {
		err = deployHelm(cfg, runtime, dep.Helm)
	} else {
		return fmt.Errorf("deployment %q has neither Kustomize nor Helm configured", dep.Name)
	}

	if err != nil {
		return err
	}

	logDuration(fmt.Sprintf("Deployed %s", dep.Name), start)
	return nil
}

func logDuration(stepName string, start time.Time) {
	fmt.Printf("  [%s took %s]\n", stepName, time.Since(start).Round(10*time.Millisecond))
}
