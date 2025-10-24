package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"altinn.studio/pdf3/test/harness"
	"altinn.studio/runtime-fixture/pkg/kubernetes"
	"altinn.studio/runtime-fixture/pkg/runtimes/kind"
	"altinn.studio/runtime-fixture/pkg/tools"
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
	case "loadtest-local":
		runLoadtestLocal()
	case "loadtest-env":
		runLoadtestEnv()
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
	fmt.Fprintln(os.Stderr, "  loadtest-local   Run k6 load tests - locally")
	fmt.Fprintln(os.Stderr, "  loadtest-env     Run k6 load tests - against env")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Start argument:")
	fmt.Fprintln(os.Stderr, "  standard")
	fmt.Fprintln(os.Stderr, "  minimal")
	fmt.Fprintln(os.Stderr, "Test flags:")
	fmt.Fprintln(os.Stderr, "  --smoke           Run smoke tests only")
	fmt.Fprintln(os.Stderr, "  --simple          Run simple tests only")
	fmt.Fprintln(os.Stderr, "  --keep-running, --kr  Keep cluster running after tests complete")
	fmt.Fprintln(os.Stderr, "  --n <count>       Run tests N times (for flakiness testing)")
	fmt.Fprintln(os.Stderr, "  (default: run both smoke and simple tests)")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Loadtest local flags:")
	fmt.Fprintln(os.Stderr, "  --keep-running, --kr  Keep cluster running after loadtest completes")
}

// setupRuntime sets up the Kind cluster, builds images, and deploys pdf3
func setupRuntime(variant kind.KindContainerRuntimeVariant) (*kind.KindContainerRuntime, error) {
	fmt.Println("=== Setting Up Runtime ===")

	// Step 1: Setup cluster
	// We run this asynchronously as bootstrapping a full kind cluster takes some time.
	// As long as the registry is started, we can start building stuff on our side
	registryStartedEvent := make(chan error, 1)
	ingressReadyEvent := make(chan error, 1)
	runtimeResult := make(chan Result[*kind.KindContainerRuntime], 1)
	go func() {
		runtime, err := harness.SetupCluster(variant, registryStartedEvent, ingressReadyEvent)
		runtimeResult <- NewResult(runtime, err)
	}()

	// As soon as the registry is started, we can start building and pushing
	// Use select to handle early failures and avoid deadlock
	var runtimeResultValue *Result[*kind.KindContainerRuntime]
	select {
	case <-registryStartedEvent:
		// Normal path - registry started, continue to build/push
	case result := <-runtimeResult:
		// Early failure - SetupCluster failed before registry started
		runtimeResultValue = &result
		if _, err := result.Unwrap(); err != nil {
			return nil, fmt.Errorf("failed to setup cluster: %w", err)
		}
		// If we got here, cluster setup completed but didn't signal registry event
		// This shouldn't happen in normal flow, but we can continue
	case <-time.After(5 * time.Minute):
		return nil, fmt.Errorf("timeout waiting for registry to start")
	}

	// Step 2: Build and push images
	buildResult := make(chan Result[bool], 1)
	go func() {
		imagesChanged, err := harness.BuildAndPushImages()
		buildResult <- NewResult(imagesChanged, err)
	}()

	// Step 3: Push kustomize artifact
	pushResult := make(chan Result[bool], 1)
	go func() {
		kustomizeChanged, err := harness.PushKustomizeArtifact()
		pushResult <- NewResult(kustomizeChanged, err)
	}()

	// Now let's wait for the runtime to be fully built
	// Check if we already consumed runtimeResult earlier (in case of early completion/failure)
	var runtime *kind.KindContainerRuntime
	var err error
	if runtimeResultValue != nil {
		// We already consumed runtimeResult earlier in the select
		runtime, err = runtimeResultValue.Unwrap()
	} else {
		// Normal path - read from channel
		runtime, err = (<-runtimeResult).Unwrap()
	}
	if err != nil {
		return nil, fmt.Errorf("failed to setup cluster: %w", err)
	}

	imagesChanged, err := (<-buildResult).Unwrap()
	if err != nil {
		return nil, fmt.Errorf("failed to build and push images: %w", err)
	}

	kustomizeChanged, err := (<-pushResult).Unwrap()
	if err != nil {
		return nil, fmt.Errorf("failed to push kustomize artifact: %w", err)
	}

	// Step 4: Deploy pdf3 via Flux
	_, err = harness.DeployPdf3ViaFlux(variant, imagesChanged, kustomizeChanged)
	if err != nil {
		return nil, fmt.Errorf("failed to deploy pdf3: %w", err)
	}

	// Step 5: let's wait for ingress
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
	fmt.Println("=== PDF3 Runtime Start ===")

	if len(os.Args) < 3 {
		fmt.Fprintf(os.Stderr, "Not enough arguments. Must specify 'standard' or 'minimal' for the start command\n")
		os.Exit(1)
	}
	arg := os.Args[2]

	var variant kind.KindContainerRuntimeVariant
	switch arg {
	case "standard":
		variant = kind.KindContainerRuntimeVariantStandard
	case "minimal":
		variant = kind.KindContainerRuntimeVariantMinimal
	default:
		fmt.Fprintf(os.Stderr, "Invalid arg '%s'. Must specify 'standard' or 'minimal' for the start command\n", arg)
		os.Exit(1)
	}

	_, err := setupRuntime(variant)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to start runtime: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("")
	fmt.Println("=== Runtime is Running ===")
	fmt.Println("Use 'tester stop' or 'make stop' to stop the cluster")
}

func runStop() {
	fmt.Println("=== PDF3 Runtime Stop ===")

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
	runSmoke := testFlags.Bool("smoke", false, "Run smoke tests only")
	runSimple := testFlags.Bool("simple", false, "Run simple tests only")
	keepRunning := testFlags.Bool("keep-running", false, "Keep cluster running after tests complete")
	testFlags.BoolVar(keepRunning, "kr", false, "Keep cluster running after tests complete (shorthand)")
	iterations := testFlags.Int("n", 1, "Number of times to run tests (for flakiness testing)")
	err := testFlags.Parse(os.Args[2:])
	if err != nil {
		fmt.Printf("Error parsing flags: %v", err)
		os.Exit(1)
	}

	// Default: run both if no flags specified
	runBoth := !*runSmoke && !*runSimple

	// Find project root for logs directory
	projectRoot, err := harness.FindProjectRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("=== PDF3 Test Orchestrator ===")

	// Setup runtime
	var runtime *kind.KindContainerRuntime
	if harness.IsCI {
		// For CI, we run `make run v=...` in a separate step, so just expect everything to be up
		// it also runs `setupRuntime` like below
		runtime, err = kind.LoadCurrent(filepath.Join(projectRoot, ".cache"))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to load current runtime: %v\n", err)
			os.Exit(1)
		}
	} else {
		runtime, err = setupRuntime(kind.KindContainerRuntimeVariantMinimal)
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

	// Step 5: Run tests
	var testExitCode int

	// Set CI=true when looping for flakiness testing
	if *iterations > 1 {
		err := os.Setenv("CI", "true")
		if err != nil {
			fmt.Printf("Couldn't set CI env variable for snapshot failures: %v\n", err)
			os.Exit(1)
		}
	}

	// Run tests in loop if iterations > 1
	for i := 1; i <= *iterations; i++ {
		if *iterations > 1 {
			fmt.Println("")
			fmt.Println("============================================================")
			fmt.Printf("Test iteration %d of %d\n", i, *iterations)
			fmt.Println("============================================================")
		}

		if runBoth || *runSimple {
			fmt.Println("Running simple tests...")
			if err := runTests(projectRoot, "./test/integration/simple/..."); err != nil {
				if exitErr, ok := err.(*exec.ExitError); ok {
					testExitCode = exitErr.ExitCode()
				} else {
					testExitCode = 1
				}
				// Exit immediately on failure when looping
				if *iterations > 1 {
					fmt.Println("")
					fmt.Printf("FAILED on iteration %d of %d\n", i, *iterations)
					break
				}
			}
		}

		if testExitCode == 0 && (runBoth || *runSmoke) {
			fmt.Println("Running smoke tests...")
			if err := runTests(projectRoot, "./test/integration/smoke/..."); err != nil {
				if exitErr, ok := err.(*exec.ExitError); ok {
					testExitCode = exitErr.ExitCode()
				} else {
					testExitCode = 1
				}
				// Exit immediately on failure when looping
				if *iterations > 1 {
					fmt.Println("")
					fmt.Printf("FAILED on iteration %d of %d\n", i, *iterations)
					break
				}
			}
		}

		// Exit loop early if tests failed
		if testExitCode != 0 {
			break
		}
	}

	// Print success message if all iterations passed
	if testExitCode == 0 && *iterations > 1 {
		fmt.Println("")
		fmt.Println("============================================================")
		fmt.Printf("SUCCESS: All %d test iterations passed\n", *iterations)
		fmt.Println("============================================================")
	}

	// Step 6: Collect logs
	duration := time.Since(startTime)
	durationSeconds := int(duration.Seconds()) + 5 // Add 5s buffer

	fmt.Printf("Capturing logs from last %ds to test/logs/...\n", durationSeconds)
	if err := collectLogs(runtime, logsDir, durationSeconds); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: Failed to collect logs: %v\n", err)
		// Don't exit on log collection failure
	}

	// Exit with test result
	if testExitCode != 0 {
		fmt.Printf("\n=== Tests FAILED (exit code %d) ===\n", testExitCode)
		os.Exit(testExitCode)
	}

	fmt.Println("\n=== All Tests PASSED ===")
}

// runTests executes go test for the specified package path
func runTests(projectRoot, packagePath string) error {
	cmd := exec.Command("go", "test", "-count=1", "-timeout", "5m", packagePath)
	cmd.Dir = projectRoot
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// collectLogs collects logs from pdf3 components using kubectl
func collectLogs(runtime *kind.KindContainerRuntime, logsDir string, sinceSeconds int) error {
	kubernetesClient := runtime.KubernetesClient

	// Collect proxy logs
	proxyLogPath := filepath.Join(logsDir, "proxy.log")
	if err := kubernetesClient.CollectLogs(kubernetes.LogOptions{
		Namespace:     "runtime-pdf3",
		LabelSelector: "app=pdf3-proxy",
		ContainerName: "pdf3-proxy",
		OutputPath:    proxyLogPath,
		SinceSeconds:  sinceSeconds,
		Prefix:        true,
		IgnoreErrors:  true,
	}); err != nil {
		return fmt.Errorf("failed to collect proxy logs: %w", err)
	}

	// Collect worker logs
	workerLogPath := filepath.Join(logsDir, "worker.log")
	if err := kubernetesClient.CollectLogs(kubernetes.LogOptions{
		Namespace:     "runtime-pdf3",
		LabelSelector: "app=pdf3-worker",
		ContainerName: "pdf3-worker",
		OutputPath:    workerLogPath,
		SinceSeconds:  sinceSeconds,
		Prefix:        true,
		IgnoreErrors:  true,
	}); err != nil {
		return fmt.Errorf("failed to collect worker logs: %w", err)
	}

	return nil
}

// findChromePath locates the chrome-headless-shell executable in .cache
func findChromePath(projectRoot string) (string, error) {
	pattern := filepath.Join(projectRoot, ".cache", "chrome-headless-shell", "*", "chrome-headless-shell-linux64", "chrome-headless-shell")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return "", fmt.Errorf("failed to search for chrome: %w", err)
	}
	if len(matches) == 0 {
		return "", fmt.Errorf("chrome-headless-shell not found in .cache (run 'make browser' to download)")
	}
	// If multiple versions exist, return the first match (could sort by version if needed)
	return matches[0], nil
}

func runLoadtestEnv() {
	// Find project root
	projectRoot, err := harness.FindProjectRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		os.Exit(1)
	}

	env := os.Environ()
	envFilePath := filepath.Join(projectRoot, ".env")
	if _, err := os.Stat(envFilePath); err != nil {
		fmt.Fprintf(os.Stderr, ".env file is required for running env tests: %v\n", err)
		os.Exit(1)
	}

	envFile, err := os.Open(envFilePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Couldn't read .env file: %v\n", err)
		os.Exit(1)
	}
	defer func() { _ = envFile.Close() }()

	scanner := bufio.NewScanner(envFile)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		splitAt := strings.IndexByte(line, '=')
		if splitAt <= 0 {
			fmt.Fprintf(os.Stderr, "Invalid line in .env file: %s\n", line)
			os.Exit(1)
		}
		env = append(env, line)
	}

	if err := scanner.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "Error during .env file scanning: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("=== PDF3 Load Test ===")

	installer, err := tools.NewInstaller(filepath.Join(projectRoot, ".cache"), false, true)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error constructing tools installer: %v\n", err)
		os.Exit(1)
	}
	if _, err := installer.Install(context.Background(), "k6"); err != nil {
		fmt.Fprintf(os.Stderr, "Error installing tools: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("\n=== Ensuring Chrome is downloaded ===")
	chromePath, err := findChromePath(projectRoot)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Chrome not found: %v\n", err)
		fmt.Println("Downloading Chrome via 'make browser'...")
		makeCmd := exec.Command("make", "browser")
		makeCmd.Dir = projectRoot
		makeCmd.Stdout = os.Stdout
		makeCmd.Stderr = os.Stderr
		if err := makeCmd.Run(); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to download Chrome: %v\n", err)
			os.Exit(1)
		}
		// Try finding Chrome again after download
		chromePath, err = findChromePath(projectRoot)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Chrome still not found after download: %v\n", err)
			os.Exit(1)
		}
	}
	fmt.Printf("✓ Chrome found at: %s\n", chromePath)
	env = append(env, fmt.Sprintf("K6_BROWSER_EXECUTABLE_PATH=%s", chromePath))

	// Get k6 binary path from installer
	k6Tool, err := installer.GetToolInfo("k6")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get k6 tool info: %v\n", err)
		os.Exit(1)
	}

	// Read k6 test script
	testScriptPath := filepath.Join(projectRoot, "test", "load", "test-env.js")
	testScript, err := os.Open(testScriptPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to read test script: %v\n", err)
		os.Exit(1)
	}
	defer func() { _ = testScript.Close() }()

	// Run k6 binary with test script piped to stdin
	fmt.Println("\n=== Running k6 Load Test ===")
	cmd := exec.Command(k6Tool.Path, "run", "-")
	cmd.Stdin = testScript
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = env

	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Load test failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("\n=== Load Test Completed ===")
}

func runLoadtestLocal() {
	// Parse loadtest flags
	loadtestFlags := flag.NewFlagSet("loadtest-local", flag.ExitOnError)
	keepRunning := loadtestFlags.Bool("keep-running", false, "Keep cluster running after loadtest completes")
	loadtestFlags.BoolVar(keepRunning, "kr", false, "Keep cluster running after loadtest completes (shorthand)")
	err := loadtestFlags.Parse(os.Args[2:])
	if err != nil {
		fmt.Printf("Error parsing flags: %v", err)
		os.Exit(1)
	}

	// Find project root
	projectRoot, err := harness.FindProjectRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("=== PDF3 Load Test ===")

	// Setup runtime
	var runtime *kind.KindContainerRuntime
	if harness.IsCI {
		// For CI, we run `make run v=...` in a separate step, so just expect everything to be up
		// it also runs `setupRuntime` like below
		runtime, err = kind.LoadCurrent(filepath.Join(projectRoot, ".cache"))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to load current runtime: %v\n", err)
			os.Exit(1)
		}
	} else {
		runtime, err = setupRuntime(kind.KindContainerRuntimeVariantStandard)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to setup runtime: %v\n", err)
			os.Exit(1)
		}
	}

	// Install k6 for loadtest
	fmt.Println("\n=== Installing k6 ===")
	if _, err := runtime.Installer.Install(context.Background(), "k6"); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to install k6: %v\n", err)
		os.Exit(1)
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

	// Wait for deployments to be ready
	fmt.Println("\n=== Waiting for deployments to be ready ===")

	var depWg sync.WaitGroup
	depWg.Add(3)

	go func() {
		defer depWg.Done()
		fmt.Println("Waiting for pdf-generator deployment (old service)...")
		if err := runtime.KubernetesClient.RolloutStatus("pdf-generator", "pdf", 2*time.Minute); err != nil {
			fmt.Fprintf(os.Stderr, "Failed waiting for pdf-generator deployment: %v\n", err)
			os.Exit(1)
		}
	}()

	go func() {
		defer depWg.Done()
		fmt.Println("Waiting for pdf3-proxy deployment (new service)...")
		if err := runtime.KubernetesClient.RolloutStatus("pdf3-proxy", "runtime-pdf3", 2*time.Minute); err != nil {
			fmt.Fprintf(os.Stderr, "Failed waiting for pdf3-proxy deployment: %v\n", err)
			os.Exit(1)
		}
	}()

	go func() {
		defer depWg.Done()
		fmt.Println("Waiting for pdf3-worker deployment (new service)...")
		if err := runtime.KubernetesClient.RolloutStatus("pdf3-worker", "runtime-pdf3", 2*time.Minute); err != nil {
			fmt.Fprintf(os.Stderr, "Failed waiting for pdf3-worker deployment: %v\n", err)
			os.Exit(1)
		}
	}()
	depWg.Wait()

	fmt.Println("✓ All deployments ready")

	// Get k6 binary path from installer
	k6Tool, err := runtime.Installer.GetToolInfo("k6")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get k6 tool info: %v\n", err)
		os.Exit(1)
	}

	// Read k6 test script
	testScriptPath := filepath.Join(projectRoot, "test", "load", "test-local.ts")
	testScript, err := os.Open(testScriptPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to read test script: %v\n", err)
		os.Exit(1)
	}
	defer func() { _ = testScript.Close() }()

	// Run k6 binary with test script piped to stdin
	fmt.Println("\n=== Running k6 Load Test ===")
	cmd := exec.Command(k6Tool.Path, "run", "-")
	cmd.Stdin = testScript
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Load test failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("\n=== Load Test Completed ===")
}

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
