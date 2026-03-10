// Package harness orchestrates local runtime setup, image pushes, and Flux-based deployments.
package harness

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"golang.org/x/sync/errgroup"

	"altinn.studio/devenv/pkg/flux"
	"altinn.studio/devenv/pkg/runtimes/kind"
)

var (
	errClusterCompletedWithoutRegistry = errors.New("cluster completed but registry never signaled ready")
	errDeploymentConfigMissing         = errors.New("deployment has neither Kustomize nor Helm configured")
	errProjectRootRequired             = errors.New("ProjectRoot is required")
	errTimeoutWaitingClusterSetup      = errors.New("timeout waiting for cluster setup")
	errTimeoutWaitingIngress           = errors.New("timeout waiting for ingress")
	errTimeoutWaitingRegistry          = errors.New("timeout waiting for registry")
)

const (
	clusterSetupTimeout  = 5 * time.Minute
	ingressReadyTimeout  = 3 * time.Minute
	registryReadyTimeout = 5 * time.Minute
	durationLogRounding  = 10 * time.Millisecond
)

// Config describes the complete setup/deployment specification.
type Config struct {
	ProjectRoot    string
	CachePath      string
	Images         []Image
	Artifacts      []Artifact
	HelmCharts     []HelmChart
	Deployments    []Deployment
	Variant        kind.KindContainerRuntimeVariant
	ClusterOptions kind.KindContainerRuntimeOptions
}

// Image represents a container image to build and push.
type Image struct {
	Name       string // descriptive name for logging
	Context    string // build context path (relative to ProjectRoot, or absolute). Defaults to ProjectRoot if empty
	Dockerfile string // dockerfile path (relative to context)
	Tag        string // full tag including registry, e.g., "localhost:5001/myapp:latest"
}

// Artifact represents an OCI artifact to push.
type Artifact struct {
	Name     string // descriptive name for logging
	URL      string // OCI URL, e.g., "oci://localhost:5001/my-repo:local"
	Path     string // local path (relative to ProjectRoot, or absolute)
	Source   string // source identifier for flux, defaults to "local"
	Revision string // revision identifier for flux, defaults to "local"
}

// HelmChart represents a helm chart to download and push.
type HelmChart struct {
	Name       string // descriptive name for logging
	RepoURL    string // git repo URL
	RepoBranch string // branch to clone
	ChartPath  string // path within repo to chart directory
	OCIRef     string // OCI registry reference, e.g., "oci://localhost:5001"
}

// Deployment represents a Flux-based deployment.
type Deployment struct {
	Kustomize      *KustomizeDeploy
	Helm           *HelmDeploy
	Name           string
	WaitForIngress bool
}

// KustomizeDeploy deploys via Flux Kustomization.
type KustomizeDeploy struct {
	ReconcileOpts     *flux.ReconcileOptions
	SyncRootDir       string
	KustomizationName string
	Namespace         string
	Rollouts          []Rollout
}

// HelmDeploy deploys via Flux HelmRelease.
type HelmDeploy struct {
	ReconcileOpts           *flux.ReconcileOptions
	ManifestPath            string
	HelmRepositoryName      string
	HelmRepositoryNamespace string
	HelmReleaseName         string
	HelmReleaseNamespace    string
	Rollouts                []Rollout
}

// Rollout identifies a deployment to wait for.
type Rollout struct {
	Deployment string
	Namespace  string
	Timeout    time.Duration // defaults to 2 minutes if zero
}

// Result from harness execution.
type Result struct {
	Runtime *kind.KindContainerRuntime
}

// AsyncOptions for RunAsync to receive events during setup.
type AsyncOptions struct {
	RegistryReady chan<- error // signaled when registry is accepting pushes
	IngressReady  chan<- error // signaled when ingress is configured
}

// Run executes the harness configuration synchronously.
func Run(cfg Config) (*Result, error) {
	return run(cfg, nil)
}

// RunAsync executes with event channels for fine-grained coordination.
func RunAsync(cfg Config, opts AsyncOptions) (*Result, error) {
	return run(cfg, &opts)
}

// LoadExisting loads a pre-existing runtime (for CI scenarios).
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

	writeStdoutln("=== Setting Up Runtime ===")

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

// runSync runs cluster setup synchronously, then parallel build/push, then deploy.
func runSync(cfg Config, runtime *kind.KindContainerRuntime) (*Result, error) {
	// Step 1: Run cluster setup (blocks until complete including infra)
	writeStdoutln("Setting up cluster...")
	if err := runtime.Run(); err != nil {
		return nil, fmt.Errorf("cluster setup failed: %w", err)
	}

	// Step 2: Run parallel build/push tasks
	if len(cfg.Images) > 0 || len(cfg.Artifacts) > 0 || len(cfg.HelmCharts) > 0 {
		writeStdoutln("Building images and pushing artifacts...")
		if err := runParallelTasks(cfg, runtime); err != nil {
			return nil, err
		}
	}

	// Step 3: Execute deployments sequentially
	if err := runDeployments(cfg, runtime, cfg.Deployments); err != nil {
		return nil, err
	}

	writeStdoutln("=== Runtime Setup Complete ===")
	return &Result{Runtime: runtime}, nil
}

// runAsync overlaps cluster setup with build/push using event channels.
func runAsync(cfg Config, runtime *kind.KindContainerRuntime, asyncOpts *AsyncOptions) (*Result, error) {
	registryReady := make(chan error, 1)
	ingressReady := make(chan error, 1)
	clusterDone := make(chan error, 1)
	runtime.RegistryStartedEvent = registryReady
	runtime.IngressReadyEvent = ingressReady
	go func() {
		clusterDone <- runtime.Run()
	}()

	if err := waitForRegistryStart(registryReady, clusterDone); err != nil {
		return nil, err
	}

	if asyncOpts.RegistryReady != nil {
		asyncOpts.RegistryReady <- nil
	}

	if len(cfg.Images) > 0 || len(cfg.Artifacts) > 0 || len(cfg.HelmCharts) > 0 {
		writeStdoutln("Building images and pushing artifacts...")
		if err := runParallelTasks(cfg, runtime); err != nil {
			return nil, err
		}
	}

	if err := waitForClusterSetup(clusterDone); err != nil {
		return nil, err
	}

	readyDeployments := make([]Deployment, 0, len(cfg.Deployments))
	ingressWaiters := make([]Deployment, 0, len(cfg.Deployments))
	for _, dep := range cfg.Deployments {
		if dep.WaitForIngress {
			ingressWaiters = append(ingressWaiters, dep)
			continue
		}
		readyDeployments = append(readyDeployments, dep)
	}
	if err := runDeployments(cfg, runtime, readyDeployments); err != nil {
		return nil, err
	}

	if len(ingressWaiters) > 0 || asyncOpts.IngressReady != nil {
		if err := waitForIngressReady(ingressReady); err != nil {
			return nil, err
		}
	}

	if asyncOpts.IngressReady != nil {
		asyncOpts.IngressReady <- nil
	}

	if err := runDeployments(cfg, runtime, ingressWaiters); err != nil {
		return nil, err
	}

	writeStdoutln("=== Runtime Setup Complete ===")
	return &Result{Runtime: runtime}, nil
}

func validateConfig(cfg *Config) error {
	if cfg.ProjectRoot == "" {
		return errProjectRootRequired
	}
	return nil
}

func waitForRegistryStart(registryReady, clusterDone <-chan error) error {
	writeStdoutln("Waiting for registry...")
	select {
	case err := <-registryReady:
		if err != nil {
			return fmt.Errorf("registry startup failed: %w", err)
		}
		return nil
	case err := <-clusterDone:
		if err != nil {
			return fmt.Errorf("cluster setup failed: %w", err)
		}
		return errClusterCompletedWithoutRegistry
	case <-time.After(registryReadyTimeout):
		return errTimeoutWaitingRegistry
	}
}

func waitForClusterSetup(clusterDone <-chan error) error {
	select {
	case err := <-clusterDone:
		if err != nil {
			return fmt.Errorf("cluster setup failed: %w", err)
		}
		return nil
	default:
	}

	select {
	case err := <-clusterDone:
		if err != nil {
			return fmt.Errorf("cluster setup failed: %w", err)
		}
		return nil
	case <-time.After(clusterSetupTimeout):
		return errTimeoutWaitingClusterSetup
	}
}

func waitForIngressReady(ingressReady <-chan error) error {
	writeStdoutln("Waiting for ingress...")
	select {
	case err := <-ingressReady:
		if err != nil {
			return fmt.Errorf("ingress setup failed: %w", err)
		}
		return nil
	case <-time.After(ingressReadyTimeout):
		return errTimeoutWaitingIngress
	}
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

	if err := g.Wait(); err != nil {
		return fmt.Errorf("parallel tasks failed: %w", err)
	}
	return nil
}

func executeDeploy(cfg Config, runtime *kind.KindContainerRuntime, dep Deployment) error {
	writeStdoutf("Deploying %s...\n", dep.Name)
	start := time.Now()

	var err error
	switch {
	case dep.Kustomize != nil:
		err = deployKustomize(cfg, runtime, dep.Kustomize)
	case dep.Helm != nil:
		err = deployHelm(cfg, runtime, dep.Helm)
	default:
		return fmt.Errorf("%w: %q", errDeploymentConfigMissing, dep.Name)
	}

	if err != nil {
		return err
	}

	logDuration("Deployed "+dep.Name, start)
	return nil
}

func runDeployments(cfg Config, runtime *kind.KindContainerRuntime, deployments []Deployment) error {
	for _, dep := range deployments {
		if err := executeDeploy(cfg, runtime, dep); err != nil {
			return fmt.Errorf("deployment %q failed: %w", dep.Name, err)
		}
	}
	return nil
}

func logDuration(stepName string, start time.Time) {
	writeStdoutf("  [%s took %s]\n", stepName, time.Since(start).Round(durationLogRounding))
}

func writeStdoutf(format string, args ...any) {
	writeTo(os.Stdout, fmt.Sprintf(format, args...))
}

func writeStderrf(format string, args ...any) {
	writeTo(os.Stderr, fmt.Sprintf(format, args...))
}

func writeStdoutln(message string) {
	writeTo(os.Stdout, message+"\n")
}

func writeTo(file *os.File, message string) {
	if _, err := file.WriteString(message); err != nil {
		panic(err)
	}
}
