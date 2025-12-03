package main

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"altinn.studio/runtime-fixture/pkg/checksum"
	"altinn.studio/runtime-fixture/pkg/flux"
	"altinn.studio/runtime-fixture/pkg/runtimes/kind"
)

var (
	isCI      = os.Getenv("CI") != ""
	runtime   *kind.KindContainerRuntime
	cachePath = ".cache"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "start":
		runStart()
	case "stop":
		runStop()
	case "test":
		runTest()
	default:
		fmt.Fprintf(os.Stderr, "Unknown subcommand: %s\n\n", os.Args[1])
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Fprintln(os.Stderr, "Usage: tester <command> [flags]")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Commands:")
	fmt.Fprintln(os.Stderr, "  start            Start the runtime fixture/cluster")
	fmt.Fprintln(os.Stderr, "  stop             Stop the runtime fixture/cluster")
	fmt.Fprintln(os.Stderr, "  test             Run integration tests")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Start arguments:")
	fmt.Fprintln(os.Stderr, "  standard         Use standard variant (more nodes)")
	fmt.Fprintln(os.Stderr, "  minimal          Use minimal variant (fewer resources)")
	fmt.Fprintln(os.Stderr, "")

}

func runStart() {
	fmt.Println("=== StudioGateway Runtime Start ===")

	if len(os.Args) < 3 {
		fmt.Fprintf(os.Stderr, "Must specify 'standard' or 'minimal'\n")
		os.Exit(1)
	}

	variant, err := parseVariant(os.Args[2])
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}

	if _, err := setupRuntime(variant); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to start runtime: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("\n=== Runtime is Running ===")
	fmt.Println("Use 'make stop' to stop the cluster")
}

func runStop() {
	fmt.Println("=== StudioGateway Runtime Stop ===")

	root, err := findProjectRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		os.Exit(1)
	}

	r, err := kind.LoadCurrent(filepath.Join(root, cachePath))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load runtime: %v\n", err)
		os.Exit(1)
	}

	if err := r.Stop(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to stop runtime: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("=== Runtime Stopped ===")
}

func runTest() {

	root, err := findProjectRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("=== StudioGateway Test Orchestrator ===")

	if isCI {
		_, err = kind.LoadCurrent(filepath.Join(root, cachePath))
	} else {
		_, err = setupRuntime(kind.KindContainerRuntimeVariantMinimal)
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to setup runtime: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("=== Environment Ready, Running Tests ===")

	testsDir := filepath.Join(root, "tests", "StudioGateway.Api.Tests")
	cmd := exec.Command("dotnet", "test")
	cmd.Dir = testsDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(), "GATEWAY_TEST_BASE_URL=http://localhost:8080")

	if err := cmd.Run(); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			fmt.Printf("\n=== Tests FAILED (exit code %d) ===\n", exitErr.ExitCode())
			os.Exit(exitErr.ExitCode())
		}
		fmt.Printf("\n=== Tests FAILED: %v ===\n", err)
		os.Exit(1)
	}

	fmt.Println("\n=== All Tests PASSED ===")
}

// setupRuntime sets up the Kind cluster, builds image, and deploys studio-gateway
func setupRuntime(variant kind.KindContainerRuntimeVariant) (*kind.KindContainerRuntime, error) {
	fmt.Println("=== Setting Up Runtime ===")

	// Setup cluster first (we need runtime clients for build/push)
	var err error
	runtime, err = setupCluster(variant)
	if err != nil {
		return nil, fmt.Errorf("failed to setup cluster: %w", err)
	}

	// Build and push in parallel
	buildResult := make(chan result[bool], 1)
	go func() {
		changed, err := buildAndPushImage()
		buildResult <- result[bool]{value: changed, err: err}
	}()

	pushResult := make(chan result[bool], 1)
	go func() {
		changed, err := pushKustomizeArtifact()
		pushResult <- result[bool]{value: changed, err: err}
	}()

	buildRes := <-buildResult
	if buildRes.err != nil {
		return nil, fmt.Errorf("failed to build image: %w", buildRes.err)
	}

	pushRes := <-pushResult
	if pushRes.err != nil {
		return nil, fmt.Errorf("failed to push kustomize: %w", pushRes.err)
	}

	if err := deployViaFlux(buildRes.value, pushRes.value); err != nil {
		return nil, fmt.Errorf("failed to deploy: %w", err)
	}

	fmt.Println("✓ Runtime setup complete")
	return runtime, nil
}

func setupCluster(variant kind.KindContainerRuntimeVariant) (*kind.KindContainerRuntime, error) {
	fmt.Println("=== Setting up Kind cluster ===")
	start := time.Now()

	root, err := findProjectRoot()
	if err != nil {
		return nil, err
	}

	opts := kind.KindContainerRuntimeOptions{
		IncludeMonitoring: false,
		IncludeTestserver: false,
	}

	r, err := kind.New(variant, filepath.Join(root, cachePath), opts)
	if err != nil {
		return nil, err
	}

	if err := r.Run(); err != nil {
		return nil, err
	}

	fmt.Println("✓ Kind cluster ready")
	logDuration("Setup Kind cluster", start)
	return r, nil
}

func buildAndPushImage() (bool, error) {
	fmt.Println("=== Building and pushing Docker image ===")
	start := time.Now()

	root, err := findProjectRoot()
	if err != nil {
		return false, err
	}

	patterns := []string{
		"src/**/*.cs",
		"src/**/*.csproj",
		"Directory.Build.props",
		"Directory.Packages.props",
		"Dockerfile",
	}
	currentHash, err := checksum.ComputeFilesChecksum(root, patterns)
	if err != nil {
		return false, err
	}

	cachedHash, _ := readCachedChecksum(root, "docker-image")
	if cachedHash == currentHash {
		fmt.Println("No source changes, skipping image rebuild")
		return false, nil
	}

	fmt.Println("Building image...")
	if err := runtime.ContainerClient.Build(root, "Dockerfile", "localhost:5001/studio-gateway:latest"); err != nil {
		return false, err
	}

	fmt.Println("Pushing image...")
	if err := runtime.ContainerClient.Push("localhost:5001/studio-gateway:latest"); err != nil {
		return false, err
	}

	_ = writeCachedChecksum(root, "docker-image", currentHash)

	fmt.Println("✓ Image built and pushed")
	logDuration("Build and push image", start)
	return true, nil
}

func pushKustomizeArtifact() (bool, error) {
	fmt.Println("=== Pushing kustomize artifact ===")
	start := time.Now()

	root, err := findProjectRoot()
	if err != nil {
		return false, err
	}

	patterns := []string{
		"infra/kustomize/**/*.yaml",
	}
	currentHash, err := checksum.ComputeFilesChecksum(root, patterns)
	if err != nil {
		return false, err
	}

	cachedHash, _ := readCachedChecksum(root, "kustomize")
	if cachedHash == currentHash {
		fmt.Println("No kustomize changes, skipping push")
		return false, nil
	}

	kustomizePath := filepath.Join(root, "infra", "kustomize")
	if err := runtime.FluxClient.PushArtifact(
		"oci://localhost:5001/studio-gateway-repo:local",
		kustomizePath,
		"local",
		"local",
	); err != nil {
		return false, err
	}

	_ = writeCachedChecksum(root, "kustomize", currentHash)

	fmt.Println("✓ Kustomize artifact pushed")
	logDuration("Push kustomize artifact", start)
	return true, nil
}

func deployViaFlux(imageChanged, kustomizeChanged bool) error {
	fmt.Println("=== Deploying studio-gateway via Flux ===")
	start := time.Now()

	if !imageChanged && !kustomizeChanged && deploymentExists() {
		fmt.Println("No changes and deployment exists, skipping")
		return nil
	}

	root, err := findProjectRoot()
	if err != nil {
		return err
	}

	syncRootDir := filepath.Join(root, "infra", "kustomize", "local-syncroot")
	manifest, err := runtime.KubernetesClient.KustomizeRender(syncRootDir)
	if err != nil {
		return err
	}

	fmt.Println("Applying manifest...")
	if _, err := runtime.KubernetesClient.ApplyManifest(manifest); err != nil {
		return err
	}

	fmt.Println("Reconciling Kustomization...")
	if err := runtime.FluxClient.ReconcileKustomization("studio-gateway", "runtime-gateway", true, flux.DefaultReconcileOptions()); err != nil {
		return err
	}

	fmt.Println("Waiting for deployment...")
	if err := runtime.KubernetesClient.RolloutStatus("studio-gateway", "runtime-gateway", 2*time.Minute); err != nil {
		return err
	}

	fmt.Println("✓ studio-gateway deployed")
	logDuration("Deploy via Flux", start)
	return nil
}

func deploymentExists() bool {
	return runtime.KubernetesClient.Get("deployment", "studio-gateway", "runtime-gateway") == nil
}

// Helpers

var projectRoot string

func findProjectRoot() (string, error) {
	if projectRoot != "" {
		return projectRoot, nil
	}

	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for i := 0; i < 10; i++ {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			projectRoot = dir
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return "", errors.New("go.mod not found")
}

func parseVariant(s string) (kind.KindContainerRuntimeVariant, error) {
	switch s {
	case "standard":
		return kind.KindContainerRuntimeVariantStandard, nil
	case "minimal":
		return kind.KindContainerRuntimeVariantMinimal, nil
	default:
		return 0, fmt.Errorf("invalid variant: %s (use 'standard' or 'minimal')", s)
	}
}

func logDuration(name string, start time.Time) {
	fmt.Printf("  [%s took %s]\n", name, time.Since(start))
}

func readCachedChecksum(root, name string) (string, error) {
	data, err := os.ReadFile(filepath.Join(root, cachePath, "checksums", name+".txt"))
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func writeCachedChecksum(root, name, hash string) error {
	dir := filepath.Join(root, cachePath, "checksums")
	_ = os.MkdirAll(dir, 0755)
	return os.WriteFile(filepath.Join(dir, name+".txt"), []byte(hash), 0644)
}

type result[T any] struct {
	value T
	err   error
}
