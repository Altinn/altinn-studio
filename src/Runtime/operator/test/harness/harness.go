package harness

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"altinn.studio/operator/internal/config"
	"altinn.studio/runtime-fixture/pkg/checksum"
	"altinn.studio/runtime-fixture/pkg/flux"
	"altinn.studio/runtime-fixture/pkg/runtimes/kind"
)

var (
	Runtime   *kind.KindContainerRuntime
	cachePath string
	IsCI      = os.Getenv("CI") == "true"
)

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
	projectRoot, err := config.TryFindProjectRootByGoMod()
	if err != nil {
		return nil, err
	}

	cachePath = filepath.Join(projectRoot, ".cache")

	// Create runtime
	runtime, err := kind.New(variant, cachePath, kind.DefaultOptions())
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
	projectRoot, err := config.TryFindProjectRootByGoMod()
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
	err = os.MkdirAll(filepath.Dir(cacheFile), 0755)
	if err != nil {
		return false, err
	}
	err = os.WriteFile(cacheFile, []byte(currentHash), 0644)
	if err != nil {
		return false, err
	}

	return true, nil
}

// BuildAndPushFakesImage builds the fakes image and pushes it to the local registry
// Returns true if image was rebuilt, false if skipped due to no changes
func BuildAndPushFakesImage() (bool, error) {
	projectRoot, err := config.TryFindProjectRootByGoMod()
	if err != nil {
		return false, err
	}

	// Compute checksum
	patterns := []string{
		"cmd/fakes/**/*.go",
		"internal/fakes/**/*.go",
		"internal/config/**/*.go",
		"internal/crypto/**/*.go",
		"internal/maskinporten/**/*.go",
		"internal/operatorcontext/**/*.go",
		"internal/orgs/**/*.go",
		"go.mod",
		"go.sum",
		"Dockerfile.fakes",
		"localtest.env",
	}
	currentHash, err := checksum.ComputeFilesChecksum(projectRoot, patterns)
	if err != nil {
		return false, fmt.Errorf("failed to compute checksum: %w", err)
	}

	// Check cached checksum
	cacheFile := filepath.Join(projectRoot, ".cache", "checksums", "docker-fakes-image.txt")
	cachedHash, _ := os.ReadFile(cacheFile)
	if string(cachedHash) == currentHash {
		fmt.Println("✓ Fakes docker image unchanged (cached)")
		return false, nil
	}

	// Build image
	fmt.Println("Building fakes image...")
	start := time.Now()
	err = Runtime.ContainerClient.Build(
		projectRoot,
		"Dockerfile.fakes",
		"localhost:5001/runtime-operator-fakes:latest",
	)
	if err != nil {
		return false, err
	}
	LogDuration("Built fakes image", start)

	// Push image
	fmt.Println("Pushing fakes image to registry...")
	start = time.Now()
	err = Runtime.ContainerClient.Push("localhost:5001/runtime-operator-fakes:latest")
	if err != nil {
		return false, err
	}
	LogDuration("Pushed fakes image", start)

	// Write new checksum
	err = os.MkdirAll(filepath.Dir(cacheFile), 0755)
	if err != nil {
		return false, err
	}
	err = os.WriteFile(cacheFile, []byte(currentHash), 0644)
	if err != nil {
		return false, err
	}

	return true, nil
}

// PushKustomizeArtifact pushes the kustomize directory as an OCI artifact
// Returns true if artifact was pushed, false if skipped due to no changes
func PushKustomizeArtifact() (bool, error) {
	projectRoot, err := config.TryFindProjectRootByGoMod()
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
	err = os.MkdirAll(filepath.Dir(cacheFile), 0755)
	if err != nil {
		return false, err
	}
	err = os.WriteFile(cacheFile, []byte(currentHash), 0644)
	if err != nil {
		return false, err
	}

	return true, nil
}

// DownloadAndPushDeploymentChart clones altinn-studio-charts and pushes the deployment chart to OCI registry
// Returns true if chart was pushed, false if skipped due to no changes
func DownloadAndPushDeploymentChart() (bool, error) {
	projectRoot, err := config.TryFindProjectRootByGoMod()
	if err != nil {
		return false, err
	}

	chartsDir := filepath.Join(projectRoot, ".cache", "altinn-studio-charts")
	chartPath := filepath.Join(chartsDir, "charts", "deployment")
	chartsBranch := "main"

	// Clone or update the charts repo
	fmt.Println("Downloading altinn-studio-charts...")
	start := time.Now()

	cloneRepo := func() error {
		cmd := exec.Command("git", "clone", "--depth", "1", "--branch", chartsBranch,
			"https://github.com/Altinn/altinn-studio-charts.git", chartsDir)
		output, err := cmd.CombinedOutput()
		if err != nil {
			return fmt.Errorf("failed to clone altinn-studio-charts: %w\nOutput: %s", err, string(output))
		}
		return nil
	}

	if _, err := os.Stat(chartsDir); os.IsNotExist(err) {
		if err := cloneRepo(); err != nil {
			return false, err
		}
	} else {
		// Update existing repo
		cmd := exec.Command("git", "-C", chartsDir, "fetch", "origin", chartsBranch)
		output, err := cmd.CombinedOutput()
		if err == nil {
			cmd = exec.Command("git", "-C", chartsDir, "reset", "--hard", "origin/"+chartsBranch)
			output, err = cmd.CombinedOutput()
		}
		if err != nil {
			// Fetch or reset failed, delete and re-clone
			if removeErr := os.RemoveAll(chartsDir); removeErr != nil {
				return false, fmt.Errorf(
					"failed to reinstall altinn-studio-charts: %w (original error: %s)",
					removeErr,
					string(output),
				)
			}
			if err := cloneRepo(); err != nil {
				return false, err
			}
		}
	}
	LogDuration("Downloaded altinn-studio-charts", start)

	// Compute checksum of the chart directory
	patterns := []string{
		".cache/altinn-studio-charts/charts/deployment/**/*.yaml",
		".cache/altinn-studio-charts/charts/deployment/**/*.tpl",
	}
	currentHash, err := checksum.ComputeFilesChecksum(projectRoot, patterns)
	if err != nil {
		return false, fmt.Errorf("failed to compute checksum: %w", err)
	}

	// Check cached checksum
	cacheFile := filepath.Join(projectRoot, ".cache", "checksums", "deployment-chart.txt")
	cachedHash, _ := os.ReadFile(cacheFile)
	if string(cachedHash) == currentHash {
		fmt.Println("✓ Deployment chart unchanged (cached)")
		return false, nil
	}

	// Get helm binary path
	helmInfo, err := Runtime.Installer.GetToolInfo("helm")
	if err != nil {
		return false, fmt.Errorf("failed to get helm tool info: %w", err)
	}
	helmPath := helmInfo.Path

	// Package the chart
	fmt.Println("Packaging deployment chart...")
	start = time.Now()
	tmpDir := filepath.Join(projectRoot, ".cache", "helm-packages")
	err = os.MkdirAll(tmpDir, 0755)
	if err != nil {
		return false, err
	}

	cmd := exec.Command(helmPath, "package", chartPath, "-d", tmpDir)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return false, fmt.Errorf("failed to package chart: %w\nOutput: %s", err, string(output))
	}
	LogDuration("Packaged chart", start)

	// Find the packaged chart file
	files, err := filepath.Glob(filepath.Join(tmpDir, "deployment-*.tgz"))
	if err != nil || len(files) == 0 {
		return false, fmt.Errorf("failed to find packaged chart")
	}
	chartFile := files[0]

	// Push to OCI registry
	fmt.Println("Pushing deployment chart to OCI registry...")
	start = time.Now()
	cmd = exec.Command(helmPath, "push", chartFile, "oci://localhost:5001")
	output, err = cmd.CombinedOutput()
	if err != nil {
		return false, fmt.Errorf("failed to push chart: %w\nOutput: %s", err, string(output))
	}
	LogDuration("Pushed chart", start)

	// Clean up packaged chart
	err = os.Remove(chartFile)
	if err != nil {
		return false, err
	}

	// Write new checksum
	err = os.MkdirAll(filepath.Dir(cacheFile), 0755)
	if err != nil {
		return false, err
	}
	err = os.WriteFile(cacheFile, []byte(currentHash), 0644)
	if err != nil {
		return false, err
	}

	return true, nil
}

// BuildAndPushLocaltestappImage builds the localtestapp image and pushes it to the local registry
// Returns true if image was rebuilt, false if skipped due to no changes
func BuildAndPushLocaltestappImage() (bool, error) {
	projectRoot, err := config.TryFindProjectRootByGoMod()
	if err != nil {
		return false, err
	}

	// Compute checksum
	patterns := []string{
		"test/app/App/**/*.cs",
		"test/app/App/**/*.csproj",
		"test/app/App/**/*.json",
		"test/app/Dockerfile",
	}
	currentHash, err := checksum.ComputeFilesChecksum(projectRoot, patterns)
	if err != nil {
		return false, fmt.Errorf("failed to compute checksum: %w", err)
	}

	// Check cached checksum
	cacheFile := filepath.Join(projectRoot, ".cache", "checksums", "localtestapp-image.txt")
	cachedHash, _ := os.ReadFile(cacheFile)
	if string(cachedHash) == currentHash {
		fmt.Println("✓ Localtestapp image unchanged (cached)")
		return false, nil
	}

	// Build image
	fmt.Println("Building localtestapp image...")
	start := time.Now()
	appDir := filepath.Join(projectRoot, "test", "app")
	err = Runtime.ContainerClient.Build(
		appDir,
		filepath.Join(appDir, "Dockerfile"),
		"localhost:5001/runtime-operator-localtestapp:latest",
	)
	if err != nil {
		return false, err
	}
	LogDuration("Built localtestapp image", start)

	// Push image
	fmt.Println("Pushing localtestapp image to registry...")
	start = time.Now()
	err = Runtime.ContainerClient.Push("localhost:5001/runtime-operator-localtestapp:latest")
	if err != nil {
		return false, err
	}
	LogDuration("Pushed localtestapp image", start)

	// Write new checksum
	err = os.MkdirAll(filepath.Dir(cacheFile), 0755)
	if err != nil {
		return false, err
	}
	err = os.WriteFile(cacheFile, []byte(currentHash), 0644)
	if err != nil {
		return false, err
	}

	return true, nil
}

// DeployLocaltestappViaFlux deploys the localtestapp using Flux HelmRelease
func DeployLocaltestappViaFlux(imageChanged, chartChanged bool) error {
	projectRoot, err := config.TryFindProjectRootByGoMod()
	if err != nil {
		return err
	}

	// Skip if no changes
	if !imageChanged && !chartChanged {
		fmt.Println("✓ No localtestapp changes detected, skipping Flux reconciliation")
		return nil
	}

	fmt.Println("Deploying localtestapp via Flux...")
	start := time.Now()

	// Read and apply the localtestapp manifest
	manifestPath := filepath.Join(projectRoot, "config", "local-minimal", "localtestapp.yaml")
	manifest, err := os.ReadFile(manifestPath)
	if err != nil {
		return fmt.Errorf("failed to read localtestapp manifest: %w", err)
	}

	// Apply the manifest
	fmt.Println("Applying localtestapp manifest...")
	_, err = Runtime.KubernetesClient.ApplyManifest(string(manifest))
	if err != nil {
		return fmt.Errorf("failed to apply manifest: %w", err)
	}

	// Reconcile HelmRepository first to ensure chart is available
	fmt.Println("Triggering HelmRepository reconciliation...")
	err = Runtime.FluxClient.ReconcileHelmRepository("altinn-deployment-chart", "default", flux.ReconcileOptions{
		ShouldWait: true,
		Timeout:    2 * time.Minute,
	})
	if err != nil {
		return fmt.Errorf("failed to reconcile helmrepository: %w", err)
	}

	// Reconcile Flux HelmRelease
	fmt.Println("Triggering HelmRelease reconciliation...")
	err = Runtime.FluxClient.ReconcileHelmRelease("ttd-localtestapp", "default", false, flux.ReconcileOptions{
		ShouldWait: true,
		Timeout:    5 * time.Minute,
	})
	if err != nil {
		return fmt.Errorf("failed to reconcile helmrelease: %w", err)
	}

	// Wait for deployment
	fmt.Println("Waiting for localtestapp deployment...")
	err = Runtime.KubernetesClient.RolloutStatus("ttd-localtestapp-deployment-v2", "default", 2*time.Minute)
	if err != nil {
		return fmt.Errorf("localtestapp deployment not ready: %w", err)
	}

	fmt.Println("✓ Localtestapp deployed via Flux")
	LogDuration("Deployed localtestapp", start)
	return nil
}

// DeployOperatorViaFlux deploys the operator using Flux
func DeployOperatorViaFlux(imagesChanged, kustomizeChanged bool) error {
	projectRoot, err := config.TryFindProjectRootByGoMod()
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
