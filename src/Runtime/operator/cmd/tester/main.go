package main

import (
	"context"
	"errors"
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

var errInvalidVariant = errors.New("invalid variant")
var errSetupEnvtestNotFound = errors.New("setup-envtest not found")

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
	os.Exit(run())
}

func run() int {
	if len(os.Args) < 2 {
		printUsage()
		return 1
	}

	subcommand := os.Args[1]

	switch subcommand {
	case "start":
		return runStart()
	case "stop":
		return runStop()
	case "test":
		return runUnitTest()
	case "test-e2e":
		return runE2ETest()
	default:
		fmt.Fprintf(os.Stderr, "Unknown subcommand: %s\n\n", subcommand)
		printUsage()
		return 1
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

func stdoutf(format string, args ...any) {
	_, err := fmt.Fprintf(os.Stdout, format, args...)
	if err != nil {
		fmt.Fprintf(os.Stderr, "write stdout: %v\n", err)
		os.Exit(1)
	}
}

func stdoutln(args ...any) {
	stdoutf("%s\n", fmt.Sprint(args...))
}

func newComposeCommand(ctx context.Context, args ...string) *exec.Cmd {
	switch containerCLI() {
	case "podman":
		//nolint:gosec // The binary and compose arguments are fixed by this CLI, not user-supplied shell input.
		return exec.CommandContext(ctx, "podman", append([]string{"compose"}, args...)...)
	default:
		//nolint:gosec // The binary and compose arguments are fixed by this CLI, not user-supplied shell input.
		return exec.CommandContext(ctx, "docker", append([]string{"compose"}, args...)...)
	}
}

func closeRuntime(runtime *kind.KindContainerRuntime) {
	if err := runtime.Close(); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: Failed to close runtime: %v\n", err)
	}
}

func envtestAssetsPath(ctx context.Context, projectRoot, envtestK8sVersion string) (string, error) {
	localBin := filepath.Join(projectRoot, "bin")
	envtestBin := filepath.Join(localBin, "setup-envtest")
	if _, err := os.Stat(envtestBin); os.IsNotExist(err) {
		return "", fmt.Errorf("%w: %s", errSetupEnvtestNotFound, envtestBin)
	}

	// The binary is the locally built project tool under projectRoot/bin.
	//nolint:gosec // The path is fixed to the local project root, not user-supplied.
	setupCmd := exec.CommandContext(ctx, envtestBin, "use", envtestK8sVersion, "--bin-dir", localBin, "-p", "path")
	setupCmd.Dir = projectRoot
	assetsPath, err := setupCmd.Output()
	if err != nil {
		return "", fmt.Errorf("setup envtest binaries: %w", err)
	}

	return strings.TrimSpace(string(assetsPath)), nil
}

func listNonE2EPackages(ctx context.Context, projectRoot string) ([]string, error) {
	listCmd := exec.CommandContext(ctx, "go", "list", "./...")
	listCmd.Dir = projectRoot
	output, err := listCmd.Output()
	if err != nil {
		return nil, fmt.Errorf("list packages: %w", err)
	}

	packages := make([]string, 0, strings.Count(string(output), "\n")+1)
	for pkg := range strings.SplitSeq(strings.TrimSpace(string(output)), "\n") {
		if pkg != "" && !strings.Contains(pkg, "/e2e") {
			packages = append(packages, pkg)
		}
	}

	return packages, nil
}

func startCompose(ctx context.Context, projectRoot string) error {
	cli := containerCLI()
	stdoutf("Starting %s compose...\n", cli)

	composeCmd := newComposeCommand(ctx, "up", "-d", "--build")
	composeCmd.Dir = projectRoot
	composeCmd.Stdout = os.Stdout
	composeCmd.Stderr = os.Stderr
	if err := composeCmd.Run(); err != nil {
		return fmt.Errorf("start %s compose: %w", cli, err)
	}

	stdoutf("✓ %s compose started\n", cli)
	return nil
}

func runUnitTest() int {
	testFlags := flag.NewFlagSet("test", flag.ExitOnError)
	envtestK8sVersion := testFlags.String("envtest-k8s-version", "", "Kubernetes version for envtest (required)")
	err := testFlags.Parse(os.Args[2:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing flags: %v\n", err)
		return 1
	}

	if *envtestK8sVersion == "" {
		fmt.Fprintln(os.Stderr, "Error: --envtest-k8s-version is required")
		return 1
	}

	ctx := context.Background()
	stdoutln("=== Unit Tests ===")

	projectRoot, err := config.TryFindProjectRootByGoMod()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		return 1
	}

	runErr := startCompose(ctx, projectRoot)
	if runErr != nil {
		fmt.Fprintf(os.Stderr, "Failed to start compose: %v\n", runErr)
		return 1
	}

	stdoutln("Setting up envtest binaries...")
	kubebuilderAssets, err := envtestAssetsPath(ctx, projectRoot, *envtestK8sVersion)
	if err != nil {
		if strings.Contains(err.Error(), "setup-envtest not found") {
			fmt.Fprintln(os.Stderr, err)
		} else {
			fmt.Fprintf(os.Stderr, "Failed to setup envtest: %v\n", err)
		}
		fmt.Fprintln(os.Stderr, "Run 'make envtest' first to install it")
		return 1
	}
	stdoutf("✓ envtest assets: %s\n", kubebuilderAssets)

	stdoutln("Running unit tests...")
	packages, err := listNonE2EPackages(ctx, projectRoot)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to list packages: %v\n", err)
		return 1
	}

	args := make([]string, 0, 2+len(packages)+2)
	args = append(args, "test", "-count=1")
	args = append(args, packages...)
	args = append(args, "-coverprofile", "cover.out")

	//nolint:gosec // The go test arguments are built from a trusted package list under the current repo.
	testCmd := exec.CommandContext(ctx, "go", args...)
	testCmd.Dir = projectRoot
	testCmd.Env = append(os.Environ(), "KUBEBUILDER_ASSETS="+kubebuilderAssets)
	if os.Getenv("CI") == "" && os.Getenv("UPDATE_SNAPS") == "" {
		testCmd.Env = append(testCmd.Env, "UPDATE_SNAPS=true")
	}
	testCmd.Stdout = os.Stdout
	testCmd.Stderr = os.Stderr

	if err := testCmd.Run(); err != nil {
		fmt.Fprintln(os.Stderr, "\n=== Unit Tests FAILED ===")
		return 1
	}

	stdoutln("\n=== Unit Tests PASSED ===")
	return 0
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
					Rollouts: []harness.Rollout{
						{Deployment: "operator-controller-manager", Namespace: "runtime-operator"},
					},
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
					Rollouts: []harness.Rollout{
						{Deployment: "ttd-localtestapp-deployment-v2", Namespace: "default"},
					},
				},
			},
		},
	}

	result, err := harness.RunAsync(cfg, harness.AsyncOptions{})
	if err != nil {
		return nil, fmt.Errorf("start runtime harness: %w", err)
	}

	return result.Runtime, nil
}

func runStart() int {
	stdoutln("=== Operator Runtime Start ===")

	if len(os.Args) < 3 {
		fmt.Fprintf(os.Stderr, "Must specify 'minimal' or 'standard'\n")
		return 1
	}

	variant, err := parseVariant(os.Args[2])
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		return 1
	}

	runtime, err := setupRuntime(variant)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to start runtime: %v\n", err)
		return 1
	}
	defer closeRuntime(runtime)

	stdoutln("")
	stdoutln("=== Runtime is Running ===")
	stdoutln("Use 'tester stop' to stop the cluster")
	return 0
}

func parseVariant(s string) (kind.KindContainerRuntimeVariant, error) {
	switch s {
	case "minimal":
		return kind.KindContainerRuntimeVariantMinimal, nil
	case "standard":
		return kind.KindContainerRuntimeVariantStandard, nil
	default:
		return 0, fmt.Errorf("%w %q (use 'minimal' or 'standard')", errInvalidVariant, s)
	}
}

func runStop() int {
	ctx := context.Background()
	stdoutln("=== Operator Runtime Stop ===")

	projectRoot, err := config.TryFindProjectRootByGoMod()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		return 1
	}

	cli := containerCLI()
	stdoutf("Stopping %s compose...\n", cli)
	composeCmd := newComposeCommand(ctx, "down")
	composeCmd.Dir = projectRoot
	composeCmd.Stdout = os.Stdout
	composeCmd.Stderr = os.Stderr
	runErr := composeCmd.Run()
	if runErr != nil {
		fmt.Fprintf(os.Stderr, "Failed to stop %s compose: %v\n", cli, runErr)
		return 1
	}
	stdoutf("✓ %s compose stopped\n", cli)

	cachePath := filepath.Join(projectRoot, ".cache")
	runtime, err := kind.LoadCurrent(cachePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load runtime: %v\n", err)
		return 1
	}
	defer closeRuntime(runtime)

	if err := runtime.Stop(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to stop runtime: %v\n", err)
		return 1
	}

	stdoutln("=== Runtime Stopped ===")
	return 0
}

func runE2ETest() int {
	ctx := context.Background()
	testFlags := flag.NewFlagSet("test", flag.ExitOnError)
	keepRunning := testFlags.Bool("keep-running", false, "Keep cluster running after tests complete")
	testFlags.BoolVar(keepRunning, "kr", false, "Keep cluster running after tests complete (shorthand)")
	err := testFlags.Parse(os.Args[2:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing flags: %v\n", err)
		return 1
	}

	projectRoot, err := config.TryFindProjectRootByGoMod()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		return 1
	}

	stdoutln("=== Operator Test Orchestrator ===")

	var runtime *kind.KindContainerRuntime
	isCI := os.Getenv("CI") == "true"
	if isCI {
		runtime, err = kind.LoadCurrent(filepath.Join(projectRoot, ".cache"))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to load current runtime: %v\n", err)
			return 1
		}
	} else {
		runtime, err = setupRuntime(kind.KindContainerRuntimeVariantMinimal)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to setup runtime: %v\n", err)
			return 1
		}
	}
	defer func() {
		defer closeRuntime(runtime)
		if *keepRunning {
			stdoutln("\n=== Keeping cluster running (--keep-running flag set) ===")
			return
		}
		if err := runtime.Stop(); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to stop cluster: %v\n", err)
		}
	}()

	stdoutln("=== Environment Ready, Running Tests ===")

	logsDir := filepath.Join(projectRoot, "test", "logs")
	if err := os.MkdirAll(logsDir, 0o750); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create logs directory: %v\n", err)
		return 1
	}

	startTime := time.Now()

	stdoutln("Running e2e tests...")
	testExitCode := 0
	if err := runTests(ctx, projectRoot, "./test/e2e/"); err != nil {
		exitErr := &exec.ExitError{}
		if errors.As(err, &exitErr) {
			testExitCode = exitErr.ExitCode()
		} else {
			testExitCode = 1
		}
	}

	duration := time.Since(startTime)
	durationSeconds := int(duration.Seconds()) + 5

	stdoutf("Capturing logs from last %ds to test/logs/...\n", durationSeconds)
	if err := collectLogs(runtime, logsDir, durationSeconds); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: Failed to collect logs: %v\n", err)
	}

	if testExitCode != 0 {
		stdoutf("\n=== Tests FAILED (exit code %d) ===\n", testExitCode)
		return testExitCode
	}

	stdoutln("\n=== All Tests PASSED ===")
	return 0
}

func runTests(ctx context.Context, projectRoot, packagePath string) error {
	//nolint:gosec // This helper only runs `go test` on internal package paths chosen by the caller.
	cmd := exec.CommandContext(ctx, "go", "test", "-tags=e2e", packagePath, "-v", "-ginkgo.v")
	cmd.Dir = projectRoot
	cmd.Env = os.Environ()
	if os.Getenv("CI") == "" && os.Getenv("UPDATE_SNAPS") == "" {
		cmd.Env = append(cmd.Env, "UPDATE_SNAPS=true")
	}
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("run e2e tests: %w", err)
	}

	return nil
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
