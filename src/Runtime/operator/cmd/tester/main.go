package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"altinn.studio/operator/test/harness"
	"altinn.studio/runtime-fixture/pkg/kubernetes"
	"altinn.studio/runtime-fixture/pkg/runtimes/kind"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	subcommand := os.Args[1]

	switch subcommand {
	case "start":
		runStart()
	case "stop":
		runStop()
	case "test":
		runTest()
	default:
		fmt.Fprintf(os.Stderr, "Unknown subcommand: %s\n\n", subcommand)
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
	fmt.Fprintln(os.Stderr, "Test flags:")
	fmt.Fprintln(os.Stderr, "  --keep-running, --kr  Keep cluster running after tests complete")
}

// Result is a generic type for passing results through channels
type Result[T any] struct {
	Value T
	Err   error
}

func NewResult[T any](value T, err error) Result[T] {
	return Result[T]{
		Value: value,
		Err:   err,
	}
}

func (r Result[T]) Unwrap() (T, error) {
	return r.Value, r.Err
}

func setupRuntime() (*kind.KindContainerRuntime, error) {
	fmt.Println("=== Setting Up Runtime ===")

	// Step 1: Setup cluster (async)
	registryStartedEvent := make(chan error, 1)
	ingressReadyEvent := make(chan error, 1)
	runtimeResult := make(chan Result[*kind.KindContainerRuntime], 1)

	go func() {
		runtime, err := harness.SetupCluster(
			kind.KindContainerRuntimeVariantMinimal,
			registryStartedEvent,
			ingressReadyEvent,
		)
		runtimeResult <- NewResult(runtime, err)
	}()

	// Wait for registry, then parallelize build/push
	var runtimeResultValue *Result[*kind.KindContainerRuntime]
	select {
	case <-registryStartedEvent:
		// Normal path - registry started
	case result := <-runtimeResult:
		// Early failure path
		runtimeResultValue = &result
		if _, err := result.Unwrap(); err != nil {
			return nil, fmt.Errorf("failed to setup cluster: %w", err)
		}
		return nil, fmt.Errorf("got runtime result but no registry event, invalid state")
	case <-time.After(5 * time.Minute):
		return nil, fmt.Errorf("timeout waiting for registry to start")
	}

	// Step 2: Build and push in parallel
	buildResult := make(chan Result[bool], 1)
	buildFakesResult := make(chan Result[bool], 1)
	pushResult := make(chan Result[bool], 1)
	chartResult := make(chan Result[bool], 1)
	localtestappResult := make(chan Result[bool], 1)

	go func() {
		imagesChanged, err := harness.BuildAndPushImage()
		buildResult <- NewResult(imagesChanged, err)
	}()

	go func() {
		fakesChanged, err := harness.BuildAndPushFakesImage()
		buildFakesResult <- NewResult(fakesChanged, err)
	}()

	go func() {
		kustomizeChanged, err := harness.PushKustomizeArtifact()
		pushResult <- NewResult(kustomizeChanged, err)
	}()

	go func() {
		chartChanged, err := harness.DownloadAndPushDeploymentChart()
		chartResult <- NewResult(chartChanged, err)
	}()

	go func() {
		imageChanged, err := harness.BuildAndPushLocaltestappImage()
		localtestappResult <- NewResult(imageChanged, err)
	}()

	// Step 3: Wait for runtime
	var runtime *kind.KindContainerRuntime
	var err error
	if runtimeResultValue != nil {
		runtime, err = runtimeResultValue.Unwrap()
	} else {
		runtime, err = (<-runtimeResult).Unwrap()
	}
	if err != nil {
		return nil, fmt.Errorf("failed to setup cluster: %w", err)
	}

	imagesChanged, err := (<-buildResult).Unwrap()
	if err != nil {
		return nil, fmt.Errorf("failed to build and push image: %w", err)
	}

	_, err = (<-buildFakesResult).Unwrap()
	if err != nil {
		return nil, fmt.Errorf("failed to build and push fakes image: %w", err)
	}

	kustomizeChanged, err := (<-pushResult).Unwrap()
	if err != nil {
		return nil, fmt.Errorf("failed to push kustomize artifact: %w", err)
	}

	chartChanged, err := (<-chartResult).Unwrap()
	if err != nil {
		return nil, fmt.Errorf("failed to download and push deployment chart: %w", err)
	}

	localtestappImageChanged, err := (<-localtestappResult).Unwrap()
	if err != nil {
		return nil, fmt.Errorf("failed to build and push localtestapp image: %w", err)
	}

	// Step 4: Deploy via Flux
	err = harness.DeployOperatorViaFlux(imagesChanged, kustomizeChanged)
	if err != nil {
		return nil, fmt.Errorf("failed to deploy operator: %w", err)
	}

	// Step 4b: Deploy localtestapp via Flux
	err = harness.DeployLocaltestappViaFlux(localtestappImageChanged, chartChanged)
	if err != nil {
		return nil, fmt.Errorf("failed to deploy localtestapp: %w", err)
	}

	// Step 5: Wait for ingress
	fmt.Printf("Waiting for ingress...\n")
	start := time.Now()
	err = <-ingressReadyEvent
	harness.LogDuration("Waited for ingress", start)
	if err != nil {
		return nil, fmt.Errorf("failed to wait for ingress: %w", err)
	}

	fmt.Println("✓ Runtime setup complete")
	return runtime, nil
}

func runStart() {
	fmt.Println("=== Operator Runtime Start ===")

	if len(os.Args) < 3 {
		fmt.Fprintf(os.Stderr, "Not enough arguments. Must specify 'minimal' for the start command\n")
		os.Exit(1)
	}
	arg := os.Args[2]

	if arg != "minimal" {
		fmt.Fprintf(os.Stderr, "Invalid arg '%s'. Must specify 'minimal' for the start command\n", arg)
		os.Exit(1)
	}

	_, err := setupRuntime()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to start runtime: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("")
	fmt.Println("=== Runtime is Running ===")
	fmt.Println("Use 'tester stop' to stop the cluster")
}

func runStop() {
	fmt.Println("=== Operator Runtime Stop ===")

	// Find project root
	projectRoot, err := harness.FindProjectRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		os.Exit(1)
	}

	// Load existing runtime
	cachePath := filepath.Join(projectRoot, ".cache")
	runtime, err := kind.LoadCurrent(cachePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load runtime: %v\n", err)
		os.Exit(1)
	}

	// Stop the runtime
	if err := runtime.Stop(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to stop runtime: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("=== Runtime Stopped ===")
}

func runTest() {
	// Parse test flags
	testFlags := flag.NewFlagSet("test", flag.ExitOnError)
	keepRunning := testFlags.Bool("keep-running", false, "Keep cluster running after tests complete")
	testFlags.BoolVar(keepRunning, "kr", false, "Keep cluster running after tests complete (shorthand)")
	err := testFlags.Parse(os.Args[2:])
	if err != nil {
		fmt.Printf("Error parsing flags: %v", err)
		os.Exit(1)
	}

	// Find project root for logs directory
	projectRoot, err := harness.FindProjectRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("=== Operator Test Orchestrator ===")

	// Setup runtime
	var runtime *kind.KindContainerRuntime
	if harness.IsCI {
		// For CI, load existing runtime
		runtime, err = kind.LoadCurrent(filepath.Join(projectRoot, ".cache"))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to load current runtime: %v\n", err)
			os.Exit(1)
		}
	} else {
		runtime, err = setupRuntime()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to setup runtime: %v\n", err)
			os.Exit(1)
		}
	}
	defer func() {
		if *keepRunning {
			fmt.Println("\n=== Keeping cluster running (--keep-running flag set) ===")
			return
		}
		err := runtime.Stop()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to stop cluster: %v\n", err)
		}
	}()

	fmt.Println("=== Environment Ready, Running Tests ===")

	// Create logs directory
	logsDir := filepath.Join(projectRoot, "test", "logs")
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create logs directory: %v\n", err)
		os.Exit(1)
	}

	// Record start time for log collection
	startTime := time.Now()

	// Run tests
	fmt.Println("Running e2e tests...")
	testExitCode := 0
	if err := runTests(projectRoot, "./test/e2e/..."); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			testExitCode = exitErr.ExitCode()
		} else {
			testExitCode = 1
		}
	}

	// Collect logs
	duration := time.Since(startTime)
	durationSeconds := int(duration.Seconds()) + 5 // Add 5s buffer

	fmt.Printf("Capturing logs from last %ds to test/logs/...\n", durationSeconds)
	if err := collectLogs(runtime, logsDir, durationSeconds); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: Failed to collect logs: %v\n", err)
	}

	// Exit with test result
	if testExitCode != 0 {
		fmt.Printf("\n=== Tests FAILED (exit code %d) ===\n", testExitCode)
		os.Exit(testExitCode)
	}

	fmt.Println("\n=== All Tests PASSED ===")
}

func runTests(projectRoot, packagePath string) error {
	cmd := exec.Command("go", "test", "-count=1", "-timeout", "5m", packagePath)
	cmd.Dir = projectRoot
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

func collectLogs(runtime *kind.KindContainerRuntime, logsDir string, sinceSeconds int) error {
	kubernetesClient := runtime.KubernetesClient

	// Collect controller logs
	controllerLogPath := filepath.Join(logsDir, "controller.log")
	if err := kubernetesClient.CollectLogs(kubernetes.LogOptions{
		Namespace:     "runtime-operator",
		LabelSelector: "control-plane=controller-manager",
		ContainerName: "manager",
		OutputPath:    controllerLogPath,
		SinceSeconds:  sinceSeconds,
		Prefix:        true,
		IgnoreErrors:  true,
	}); err != nil {
		return fmt.Errorf("failed to collect controller logs: %w", err)
	}

	return nil
}
