package harness

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"altinn.studio/runtime-fixture/pkg/checksum"
	"altinn.studio/runtime-fixture/pkg/flux"
	"altinn.studio/runtime-fixture/pkg/runtimes/kind"
)

var (
	Runtime   *kind.KindContainerRuntime
	cachePath string
	IsCI      = os.Getenv("CI") == "true"
)

var projectRoot string

// FindProjectRoot searches upward for a directory containing go.mod
// It starts from the current working directory and checks up to maxIterations parent directories
func FindProjectRoot() (string, error) {
	if projectRoot != "" {
		return projectRoot, nil
	}

	const maxIterations = 10

	// Get current working directory
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	// Track the previous directory to detect when we've reached the filesystem root
	prevDir := ""

	for i := 0; i < maxIterations; i++ {
		// Check if go.mod exists in current directory
		goModPath := filepath.Join(dir, "go.mod")
		if _, err := os.Stat(goModPath); err == nil {
			projectRoot = dir
			return dir, nil
		}

		// Move to parent directory
		parentDir := filepath.Dir(dir)

		// Check if we've reached the filesystem root (dir == parentDir on Unix, or checking against previous)
		if parentDir == dir || parentDir == prevDir {
			return "", errors.New("reached filesystem root without finding go.mod")
		}

		prevDir = dir
		dir = parentDir
	}

	return "", errors.New("exceeded maximum iterations searching for go.mod")
}

// LogDuration logs the duration of an operation
// Usage: defer LogDuration("Operation name", time.Now())
func LogDuration(stepName string, start time.Time) {
	duration := time.Since(start)
	fmt.Printf("✓ %s (took %v)\n", stepName, duration.Round(10*time.Millisecond))
}

// SetupCluster starts the Kind container runtime with all dependencies
func SetupCluster(
	variant kind.KindContainerRuntimeVariant,
	registryStartedEvent chan error,
	ingressReadyEvent chan error,
) (*kind.KindContainerRuntime, error) {
	projectRoot, err := FindProjectRoot()
	if err != nil {
		return nil, err
	}

	cachePath = filepath.Join(projectRoot, ".cache")

	// Create runtime
	runtime, err := kind.New(variant, cachePath)
	if err != nil {
		return nil, err
	}

	// Run cluster setup (idempotent)
	err = runtime.Run()
	if err != nil {
		close(registryStartedEvent)
		close(ingressReadyEvent)
		return nil, err
	}

	// Signal registry is ready (after Run() completes, registry is up)
	close(registryStartedEvent)

	// Signal ingress is ready
	close(ingressReadyEvent)

	Runtime = runtime
	return runtime, nil
}

// BuildAndPushImage builds the operator controller image and pushes it to the local registry
// Returns true if image was rebuilt, false if skipped due to no changes
func BuildAndPushImage() (bool, error) {
	projectRoot, err := FindProjectRoot()
	if err != nil {
		return false, err
	}

	// Compute checksum
	patterns := []string{
		"cmd/**/*.go",
		"api/**/*.go",
		"internal/**/*.go",
		"go.mod",
		"go.sum",
		"Dockerfile",
	}
	currentHash, err := checksum.ComputeFilesChecksum(projectRoot, patterns)
	if err != nil {
		return false, fmt.Errorf("failed to compute checksum: %w", err)
	}

	// Check cached checksum
	cacheFile := filepath.Join(projectRoot, ".cache", "checksums", "docker-image.txt")
	cachedHash, _ := os.ReadFile(cacheFile)
	if string(cachedHash) == currentHash {
		fmt.Println("✓ Docker image unchanged (cached)")
		return false, nil
	}

	// Build image
	fmt.Println("Building operator controller image...")
	start := time.Now()
	err = Runtime.ContainerClient.Build(
		projectRoot,
		"Dockerfile",
		"localhost:5001/runtime-operator-controller:latest",
	)
	if err != nil {
		return false, err
	}
	LogDuration("Built image", start)

	// Push image
	fmt.Println("Pushing image to registry...")
	start = time.Now()
	err = Runtime.ContainerClient.Push("localhost:5001/runtime-operator-controller:latest")
	if err != nil {
		return false, err
	}
	LogDuration("Pushed image", start)

	// Write new checksum
	os.MkdirAll(filepath.Dir(cacheFile), 0755)
	err = os.WriteFile(cacheFile, []byte(currentHash), 0644)
	if err != nil {
		return false, err
	}

	return true, nil
}

// PushKustomizeArtifact pushes the kustomize directory as an OCI artifact
// Returns true if artifact was pushed, false if skipped due to no changes
func PushKustomizeArtifact() (bool, error) {
	projectRoot, err := FindProjectRoot()
	if err != nil {
		return false, err
	}

	// Compute checksum
	patterns := []string{
		"config/**/*.yaml",
		"config/**/*.yml",
	}
	currentHash, err := checksum.ComputeFilesChecksum(projectRoot, patterns)
	if err != nil {
		return false, fmt.Errorf("failed to compute checksum: %w", err)
	}

	// Check cached checksum
	cacheFile := filepath.Join(projectRoot, ".cache", "checksums", "kustomize.txt")
	cachedHash, _ := os.ReadFile(cacheFile)
	if string(cachedHash) == currentHash {
		fmt.Println("✓ Kustomize artifact unchanged (cached)")
		return false, nil
	}

	// Push artifact
	fmt.Println("Pushing kustomize artifact to OCI registry...")
	start := time.Now()
	err = Runtime.FluxClient.PushArtifact(
		"oci://localhost:5001/runtime-operator-repo:local",
		filepath.Join(projectRoot, "config"),
		"local",
		"local",
	)
	if err != nil {
		return false, err
	}
	LogDuration("Pushed kustomize artifact", start)

	// Write new checksum
	os.MkdirAll(filepath.Dir(cacheFile), 0755)
	err = os.WriteFile(cacheFile, []byte(currentHash), 0644)
	if err != nil {
		return false, err
	}

	return true, nil
}

// DeployOperatorViaFlux deploys the operator using Flux
func DeployOperatorViaFlux(imagesChanged, kustomizeChanged bool) error {
	projectRoot, err := FindProjectRoot()
	if err != nil {
		return err
	}

	// Skip if no changes
	if !imagesChanged && !kustomizeChanged {
		fmt.Println("✓ No changes detected, skipping Flux reconciliation")
		return nil
	}

	fmt.Println("Deploying operator via Flux...")
	start := time.Now()

	// Render manifest from local-syncroot-minimal overlay
	syncRootDir := filepath.Join(projectRoot, "config", "local-syncroot-minimal")
	manifest, err := Runtime.KubernetesClient.KustomizeRender(syncRootDir)
	if err != nil {
		return fmt.Errorf("failed to render kustomize manifest: %w", err)
	}

	// Apply the complete manifest
	fmt.Println("Applying operator manifest...")
	_, err = Runtime.KubernetesClient.ApplyManifest(manifest)
	if err != nil {
		return fmt.Errorf("failed to apply manifest: %w", err)
	}

	// Reconcile Flux Kustomization
	fmt.Println("Triggering Kustomization reconciliation...")
	err = Runtime.FluxClient.ReconcileKustomization("operator-app", "runtime-operator", true, flux.ReconcileOptions{
		ShouldWait: true,
		Timeout:    5 * time.Minute,
	})
	if err != nil {
		return fmt.Errorf("failed to reconcile kustomization: %w", err)
	}

	// Wait for deployment
	fmt.Println("Waiting for operator-controller-manager deployment...")
	err = Runtime.KubernetesClient.RolloutStatus("operator-controller-manager", "runtime-operator", 2*time.Minute)
	if err != nil {
		return fmt.Errorf("deployment not ready: %w", err)
	}

	fmt.Println("✓ Operator deployed via Flux")
	LogDuration("Deployed operator", start)
	return nil
}
