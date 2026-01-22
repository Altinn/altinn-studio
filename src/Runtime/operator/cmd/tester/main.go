package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"altinn.studio/devenv/pkg/harness"
	"altinn.studio/devenv/pkg/kubernetes"
	"altinn.studio/devenv/pkg/runtimes/kind"
	"altinn.studio/operator/internal/config"
)

func containerCLI() string {
	if _, err := exec.LookPath("docker"); err == nil {
		return "docker"
	}
	if _, err := exec.LookPath("podman"); err == nil {
		return "podman"
	}
	return "docker"
}

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
		runUnitTest()
	case "test-e2e":
		runE2ETest()
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
	fmt.Fprintln(os.Stderr, "  test             Run unit tests (with docker-compose and envtest)")
	fmt.Fprintln(os.Stderr, "  test-e2e         Run e2e tests (with Kind cluster)")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "start arguments:")
	fmt.Fprintln(os.Stderr, "  minimal          Use minimal variant (fewer resources)")
	fmt.Fprintln(os.Stderr, "  standard         Use standard variant (more nodes)")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "test flags:")
	fmt.Fprintln(os.Stderr, "  --envtest-k8s-version  Kubernetes version for envtest (required)")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "test-e2e flags:")
	fmt.Fprintln(os.Stderr, "  --keep-running, --kr  Keep cluster running after tests complete")
}

func runUnitTest() {
	// Parse flags
	testFlags := flag.NewFlagSet("test", flag.ExitOnError)
	envtestK8sVersion := testFlags.String("envtest-k8s-version", "", "Kubernetes version for envtest (required)")
	err := testFlags.Parse(os.Args[2:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing flags: %v\n", err)
		os.Exit(1)
	}

	if *envtestK8sVersion == "" {
		fmt.Fprintln(os.Stderr, "Error: --envtest-k8s-version is required")
		os.Exit(1)
	}

	fmt.Println("=== Unit Tests ===")

	// Find project root
	projectRoot, err := config.TryFindProjectRootByGoMod()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		os.Exit(1)
	}

	// Step 1: Start compose
	cli := containerCLI()
	fmt.Printf("Starting %s compose...\n", cli)
	composeCmd := exec.Command(cli, "compose", "up", "-d", "--build")
	composeCmd.Dir = projectRoot
	composeCmd.Stdout = os.Stdout
	composeCmd.Stderr = os.Stderr
	if err := composeCmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to start %s compose: %v\n", cli, err)
		os.Exit(1)
	}
	fmt.Printf("✓ %s compose started\n", cli)

	// Step 2: Setup envtest binaries
	fmt.Println("Setting up envtest binaries...")
	localBin := filepath.Join(projectRoot, "bin")
	envtestBin := filepath.Join(localBin, "setup-envtest")

	// Check if setup-envtest exists
	if _, err := os.Stat(envtestBin); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "setup-envtest not found at %s\n", envtestBin)
		fmt.Fprintln(os.Stderr, "Run 'make envtest' first to install it")
		os.Exit(1)
	}

	// Run setup-envtest to get the assets path
	setupCmd := exec.Command(envtestBin, "use", *envtestK8sVersion, "--bin-dir", localBin, "-p", "path")
	setupCmd.Dir = projectRoot
	assetsPath, err := setupCmd.Output()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to setup envtest: %v\n", err)
		os.Exit(1)
	}
	kubebuilderAssets := strings.TrimSpace(string(assetsPath))
	fmt.Printf("✓ envtest assets: %s\n", kubebuilderAssets)

	// Step 3: Run tests (excluding e2e)
	fmt.Println("Running unit tests...")

	// Get list of packages excluding e2e
	listCmd := exec.Command("go", "list", "./...")
	listCmd.Dir = projectRoot
	output, err := listCmd.Output()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to list packages: %v\n", err)
		os.Exit(1)
	}

	// Filter out e2e packages
	var packages []string
	for _, pkg := range strings.Split(strings.TrimSpace(string(output)), "\n") {
		if pkg != "" && !strings.Contains(pkg, "/e2e") {
			packages = append(packages, pkg)
		}
	}

	// Build test command
	args := []string{"test", "-count=1"}
	args = append(args, packages...)
	args = append(args, "-coverprofile", "cover.out")

	testCmd := exec.Command("go", args...)
	testCmd.Dir = projectRoot
	testCmd.Env = append(os.Environ(), "KUBEBUILDER_ASSETS="+kubebuilderAssets)
	// Auto-update snapshots when running locally (not in CI)
	if os.Getenv("CI") == "" && os.Getenv("UPDATE_SNAPS") == "" {
		testCmd.Env = append(testCmd.Env, "UPDATE_SNAPS=true")
	}
	testCmd.Stdout = os.Stdout
	testCmd.Stderr = os.Stderr

	if err := testCmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "\n=== Unit Tests FAILED ===\n")
		os.Exit(1)
	}

	fmt.Println("\n=== Unit Tests PASSED ===")
}

func setupRuntime(variant kind.KindContainerRuntimeVariant) (*kind.KindContainerRuntime, error) {
	projectRoot, err := config.TryFindProjectRootByGoMod()
	if err != nil {
		return nil, fmt.Errorf("failed to find project root: %w", err)
	}

	cfg := harness.Config{
		ProjectRoot:    projectRoot,
		Variant:        variant,
		ClusterOptions: kind.DefaultOptions(),
		Images: []harness.Image{
			{Name: "controller", Dockerfile: "Dockerfile", Tag: "localhost:5001/runtime-operator-controller:latest"},
			{Name: "fakes", Dockerfile: "Dockerfile.fakes", Tag: "localhost:5001/runtime-operator-fakes:latest"},
			{
				Name:       "localtestapp",
				Context:    "test/app",
				Dockerfile: "test/app/Dockerfile",
				Tag:        "localhost:5001/runtime-operator-localtestapp:latest",
			},
		},
		Artifacts: []harness.Artifact{
			{Name: "kustomize", URL: "oci://localhost:5001/runtime-operator-repo:local", Path: "config"},
		},
		HelmCharts: []harness.HelmChart{
			{
				Name:       "deployment",
				RepoURL:    "https://github.com/Altinn/altinn-studio-charts.git",
				RepoBranch: "main",
				ChartPath:  "charts/deployment",
				OCIRef:     "oci://localhost:5001",
			},
		},
		Deployments: []harness.Deployment{
			{
				Name:           "operator",
				WaitForIngress: true, // depends on Traefik CRDs (IngressRoute)
				Kustomize: &harness.KustomizeDeploy{
					SyncRootDir:       "config/local-syncroot-minimal",
					KustomizationName: "operator-app",
					Namespace:         "runtime-operator",
					Rollouts:          []harness.Rollout{{Deployment: "operator-controller-manager", Namespace: "runtime-operator"}},
				},
			},
			{
				Name: "localtestapp",
				Helm: &harness.HelmDeploy{
					ManifestPath:            "config/local-minimal/localtestapp.yaml",
					HelmRepositoryName:      "altinn-deployment-chart",
					HelmRepositoryNamespace: "default",
					HelmReleaseName:         "ttd-localtestapp",
					HelmReleaseNamespace:    "default",
					Rollouts:                []harness.Rollout{{Deployment: "ttd-localtestapp-deployment-v2", Namespace: "default"}},
				},
			},
		},
	}

	result, err := harness.RunAsync(cfg, harness.AsyncOptions{})
	if err != nil {
		return nil, err
	}

	return result.Runtime, nil
}

func runStart() {
	fmt.Println("=== Operator Runtime Start ===")

	if len(os.Args) < 3 {
		fmt.Fprintf(os.Stderr, "Must specify 'minimal' or 'standard'\n")
		os.Exit(1)
	}

	variant, err := parseVariant(os.Args[2])
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}

	runtime, err := setupRuntime(variant)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to start runtime: %v\n", err)
		os.Exit(1)
	}
	defer func() { _ = runtime.Close() }()

	fmt.Println("")
	fmt.Println("=== Runtime is Running ===")
	fmt.Println("Use 'tester stop' to stop the cluster")
}

func parseVariant(s string) (kind.KindContainerRuntimeVariant, error) {
	switch s {
	case "minimal":
		return kind.KindContainerRuntimeVariantMinimal, nil
	case "standard":
		return kind.KindContainerRuntimeVariantStandard, nil
	default:
		return 0, fmt.Errorf("invalid variant '%s' (use 'minimal' or 'standard')", s)
	}
}

func runStop() {
	fmt.Println("=== Operator Runtime Stop ===")

	// Find project root
	projectRoot, err := config.TryFindProjectRootByGoMod()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		os.Exit(1)
	}

	// Stop docker/podman compose
	cli := containerCLI()
	fmt.Printf("Stopping %s compose...\n", cli)
	composeCmd := exec.Command(cli, "compose", "down")
	composeCmd.Dir = projectRoot
	composeCmd.Stdout = os.Stdout
	composeCmd.Stderr = os.Stderr
	if err := composeCmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to stop %s compose: %v\n", cli, err)
		os.Exit(1)
	}
	fmt.Printf("✓ %s compose stopped\n", cli)

	// Load existing runtime
	cachePath := filepath.Join(projectRoot, ".cache")
	runtime, err := kind.LoadCurrent(cachePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load runtime: %v\n", err)
		os.Exit(1)
	}
	defer func() { _ = runtime.Close() }()

	// Stop the runtime
	if err := runtime.Stop(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to stop runtime: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("=== Runtime Stopped ===")
}

func runE2ETest() {
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
	projectRoot, err := config.TryFindProjectRootByGoMod()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("=== Operator Test Orchestrator ===")

	// Setup runtime
	var runtime *kind.KindContainerRuntime
	isCI := os.Getenv("CI") == "true"
	if isCI {
		// For CI, load existing runtime
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
		defer func() { _ = runtime.Close() }()
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
	if err := runTests(projectRoot, "./test/e2e/"); err != nil {
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
	cmd := exec.Command("go", "test", "-tags=e2e", packagePath, "-v", "-ginkgo.v")
	cmd.Dir = projectRoot
	cmd.Env = os.Environ()
	// Auto-update snapshots when running locally (not in CI)
	if os.Getenv("CI") == "" && os.Getenv("UPDATE_SNAPS") == "" {
		cmd.Env = append(cmd.Env, "UPDATE_SNAPS=true")
	}
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
