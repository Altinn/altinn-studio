package main

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"altinn.studio/devenv/pkg/cabundle"
	"altinn.studio/devenv/pkg/kubernetes"
	"altinn.studio/devenv/pkg/projectroot"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/runtimes/kind"
	localharness "altinn.studio/pdf3/test/harness"
)

var (
	errK6NotFound     = errors.New("k6 not found in PATH")
	errChromeNotFound = errors.New("chrome-headless-shell not found in .cache")
	errInvalidEnvLine = errors.New("invalid line in .env file")
)

type testOptions struct {
	keepRunning bool
	runSimple   bool
	runSmoke    bool
	iterations  int
}

func main() {
	os.Exit(run(os.Args[1:]))
}

func run(args []string) int {
	if len(args) == 0 {
		if err := printUsage(); err != nil {
			stderrf("failed to write usage: %v\n", err)
		}
		return 1
	}

	switch args[0] {
	case "start":
		return runStart(args[1:])
	case "stop":
		return runStop()
	case "test":
		return runTest(args[1:])
	case "loadtest-local":
		return runLoadtestLocal(args[1:])
	case "loadtest-env":
		return runLoadtestEnv()
	default:
		stderrf("Unknown subcommand: %s\n\n", args[0])
		if err := printUsage(); err != nil {
			stderrf("failed to write usage: %v\n", err)
		}
		return 1
	}
}

func printUsage() error {
	_, err := fmt.Fprint(os.Stderr, `Usage: tester <command> [flags]

Commands:
  start            Start the runtime fixture/cluster
  stop             Stop the runtime fixture/cluster
  test             Run integration tests
  loadtest-local   Run k6 load tests - locally
  loadtest-env     Run k6 load tests - against env

Start arguments:
  standard         Use standard variant (more nodes)
  minimal          Use minimal variant (fewer resources)
Start flags:
  --monitoring      Include monitoring stack

Test flags:
  --smoke           Run smoke tests only
  --simple          Run simple tests only
  --keep-running, --kr  Keep cluster running after tests complete
  --n <count>       Run tests N times (for flakiness testing)
  (default: run both smoke and simple tests)

Loadtest local flags:
  --keep-running, --kr  Keep cluster running after loadtest completes
`)
	if err != nil {
		return fmt.Errorf("write usage: %w", err)
	}
	return nil
}

func stdoutln(args ...any) error {
	_, err := fmt.Fprintln(os.Stdout, args...)
	if err != nil {
		return fmt.Errorf("write stdout line: %w", err)
	}
	return nil
}

func stdoutf(format string, args ...any) error {
	_, err := fmt.Fprintf(os.Stdout, format, args...)
	if err != nil {
		return fmt.Errorf("write stdout: %w", err)
	}
	return nil
}

func stderrf(format string, args ...any) {
	_, _ = fmt.Fprintf(os.Stderr, format, args...)
}

func writeErrorf(message string, err error) int {
	stderrf("%s: %v\n", message, err)
	return 1
}

func loadRuntime(
	projectRoot string,
	variant kind.KindContainerRuntimeVariant,
	options kind.KindContainerRuntimeOptions,
) (*kind.KindContainerRuntime, error) {
	if localharness.IsCI {
		// CI starts the minimal cluster in a separate step, so commands should attach
		// to the existing fixture instead of rebuilding it.
		runtime, err := kind.LoadCurrent(filepath.Join(projectRoot, ".cache"))
		if err != nil {
			return nil, fmt.Errorf("load current runtime: %w", err)
		}
		return runtime, nil
	}
	runtime, err := setupRuntime(variant, options)
	if err != nil {
		return nil, fmt.Errorf("setup runtime: %w", err)
	}
	return runtime, nil
}

func closeRuntime(runtime *kind.KindContainerRuntime, keepRunning bool) {
	if runtime == nil {
		return
	}
	defer func() {
		if closeErr := runtime.Close(); closeErr != nil {
			stderrf("Failed to close runtime: %v\n", closeErr)
		}
	}()
	if keepRunning {
		if err := stdoutln("\n=== Keeping cluster running (--keep-running flag set) ==="); err != nil {
			stderrf("failed to write keep-running message: %v\n", err)
		}
		return
	}
	if stopErr := runtime.Stop(); stopErr != nil {
		stderrf("Failed to stop cluster: %v\n", stopErr)
	}
}

// setupRuntime sets up the Kind cluster, builds images, and deploys pdf3.
func setupRuntime(
	variant kind.KindContainerRuntimeVariant,
	options kind.KindContainerRuntimeOptions,
) (*kind.KindContainerRuntime, error) {
	root, err := projectroot.Find(projectroot.Marker)
	if err != nil {
		return nil, fmt.Errorf("find project root: %w", err)
	}

	variantName := "minimal"
	if variant == kind.KindContainerRuntimeVariantStandard {
		variantName = "standard"
	}

	runtime, err := kind.New(variant, filepath.Join(root, ".cache"), options)
	if err != nil {
		return nil, fmt.Errorf("create kind runtime: %w", err)
	}

	graph, cleanup, err := pdf3Graph(root, runtime, variantName)
	if err != nil {
		return nil, err
	}
	defer cleanupBestEffort(cleanup)

	if err := applyRuntimeGraph(runtime, graph); err != nil {
		return nil, err
	}
	return runtime, nil
}

func pdf3Graph(
	root string,
	runtime *kind.KindContainerRuntime,
	variantName string,
) (*resource.Graph, func() error, error) {
	graph, err := runtime.Graph()
	if err != nil {
		return nil, nil, fmt.Errorf("build kind runtime graph: %w", err)
	}
	bundle, _, err := cabundle.FromEnv()
	if err != nil {
		return nil, nil, fmt.Errorf("resolve CA bundle: %w", err)
	}
	workloads := []cabundle.KubernetesWorkload{{
		Deployment: "pdf3-worker",
		Namespace:  "runtime-pdf3",
	}}

	published, cleanup, err := addPDF3PublishResources(graph, runtime, root, bundle, workloads)
	if err != nil {
		return nil, nil, err
	}
	deps := []resource.ResourceRef{
		runtime.BaseInfrastructureRef(),
		resource.Ref(published.proxy),
		resource.Ref(published.worker),
		resource.Ref(published.artifact),
	}
	if err := addPDF3DeploymentResources(graph, runtime, root, variantName, bundle, workloads, deps); err != nil {
		cleanupBestEffort(cleanup)
		return nil, nil, err
	}

	return graph, cleanup, nil
}

type pdf3PublishedResources struct {
	proxy    *resource.PublishedImage
	worker   *resource.PublishedImage
	artifact *resource.OCIArtifact
}

func addPDF3PublishResources(
	graph *resource.Graph,
	runtime *kind.KindContainerRuntime,
	root string,
	bundle *cabundle.Bundle,
	workloads []cabundle.KubernetesWorkload,
) (pdf3PublishedResources, func() error, error) {
	proxyImage := &resource.BuiltImage{
		ContextPath: root,
		Dockerfile:  filepath.Join(root, "Dockerfile.proxy"),
		Tag:         "pdf3-proxy:latest",
	}
	workerImage := &resource.BuiltImage{
		ContextPath: root,
		Dockerfile:  filepath.Join(root, "Dockerfile.worker"),
		Tag:         "pdf3-worker:latest",
	}
	proxyPublished := &resource.PublishedImage{
		Ref:       "localhost:5001/runtime-pdf3-proxy:latest",
		Source:    resource.Ref(proxyImage),
		DependsOn: []resource.ResourceRef{runtime.RegistryRef()},
	}
	workerPublished := &resource.PublishedImage{
		Ref:       "localhost:5001/runtime-pdf3-worker:latest",
		Source:    resource.Ref(workerImage),
		DependsOn: []resource.ResourceRef{runtime.RegistryRef()},
	}
	preparedArtifact, err := cabundle.PrepareKubernetesArtifact(
		filepath.Join(root, "infra/kustomize"),
		bundle,
		workloads,
	)
	if err != nil {
		return pdf3PublishedResources{}, nil, fmt.Errorf("prepare pdf3 kustomize artifact: %w", err)
	}
	artifact := &resource.OCIArtifact{
		Format:    resource.OCIArtifactFormatGeneric,
		Name:      "runtime-pdf3-kustomize",
		URL:       "oci://localhost:5001/runtime-pdf3-repo:local",
		Path:      preparedArtifact.Path,
		DependsOn: []resource.ResourceRef{runtime.RegistryRef()},
	}
	if err := graph.AddAll(
		proxyImage,
		workerImage,
		proxyPublished,
		workerPublished,
		artifact,
	); err != nil {
		cleanupBestEffort(preparedArtifact.Cleanup)
		return pdf3PublishedResources{}, nil, fmt.Errorf("add pdf3 publish resources: %w", err)
	}

	return pdf3PublishedResources{
		proxy:    proxyPublished,
		worker:   workerPublished,
		artifact: artifact,
	}, preparedArtifact.Cleanup, nil
}

func addPDF3DeploymentResources(
	graph *resource.Graph,
	runtime *kind.KindContainerRuntime,
	root string,
	variantName string,
	bundle *cabundle.Bundle,
	workloads []cabundle.KubernetesWorkload,
	deps []resource.ResourceRef,
) error {
	configMapSet, hasConfigMapSet, err := cabundle.KubernetesConfigMapObjectSet(
		bundle,
		runtime.ClusterRef(),
		"deployment-pdf3-ca-bundle",
		workloads,
		deps,
	)
	if err != nil {
		return fmt.Errorf("create pdf3 CA bundle ConfigMap resource: %w", err)
	}
	if hasConfigMapSet {
		if err := graph.AddAll(configMapSet); err != nil {
			return fmt.Errorf("add pdf3 CA bundle ConfigMap resource: %w", err)
		}
		deps = append(deps, resource.Ref(configMapSet))
	}

	objects := &resource.KubernetesObjectSet{
		Name:      "deployment-pdf3",
		Cluster:   runtime.ClusterRef(),
		Path:      filepath.Join(root, "infra/kustomize/local-syncroot-"+variantName),
		DependsOn: deps,
		Readiness: []resource.KubernetesReadinessCheck{
			{
				Kind:      resource.KubernetesReadinessFluxKustomization,
				Namespace: "runtime-pdf3",
				Name:      "pdf3-app",
			},
			{
				Kind:      resource.KubernetesReadinessDeploymentAvailable,
				Namespace: "runtime-pdf3",
				Name:      "pdf3-proxy",
			},
			{
				Kind:      resource.KubernetesReadinessDeploymentAvailable,
				Namespace: "runtime-pdf3",
				Name:      "pdf3-worker",
			},
		},
	}
	if err := graph.AddAll(objects); err != nil {
		return fmt.Errorf("add pdf3 Kubernetes object set resource: %w", err)
	}
	return nil
}

func applyRuntimeGraph(runtime *kind.KindContainerRuntime, graph *resource.Graph) error {
	if err := stdoutln("Applying runtime resource graph..."); err != nil {
		return err
	}
	start := time.Now()
	runtimeExecutor, err := runtime.Executor()
	if err != nil {
		return fmt.Errorf("create runtime executor: %w", err)
	}
	if _, err := runtimeExecutor.Apply(context.Background(), graph); err != nil {
		return fmt.Errorf("apply runtime resource graph: %w", err)
	}
	if runtime.KubernetesClient == nil {
		if err := runtime.InitializeClients(); err != nil {
			return fmt.Errorf("initialize runtime clients: %w", err)
		}
	}
	if err := stdoutf(
		"  [Applied runtime resource graph took %s]\n",
		time.Since(start).Round(10*time.Millisecond),
	); err != nil {
		return err
	}
	if err := stdoutln("=== Runtime Setup Complete ==="); err != nil {
		return err
	}
	return nil
}

func cleanupBestEffort(cleanup func() error) {
	if cleanup == nil {
		return
	}
	if err := cleanup(); err != nil {
		stderrf("warning: %v\n", err)
	}
}

func runStart(args []string) int {
	if err := stdoutln("=== PDF3 Runtime Start ==="); err != nil {
		stderrf("failed to write start banner: %v\n", err)
		return 1
	}

	if len(args) < 1 {
		stderrf("Not enough arguments. Must specify 'standard' or 'minimal' for the start command\n")
		return 1
	}

	// Parse flags after the variant argument
	startFlags := flag.NewFlagSet("start", flag.ExitOnError)
	includeMonitoring := startFlags.Bool("monitoring", false, "Include monitoring stack")

	// First positional arg is variant, rest are flags
	variantArg := args[0]
	if err := startFlags.Parse(args[1:]); err != nil {
		return writeErrorf("Error parsing flags", err)
	}

	var variant kind.KindContainerRuntimeVariant
	switch variantArg {
	case "standard":
		variant = kind.KindContainerRuntimeVariantStandard
	case "minimal":
		variant = kind.KindContainerRuntimeVariantMinimal
	default:
		stderrf("Invalid arg '%s'. Must specify 'standard' or 'minimal' for the start command\n", variantArg)
		return 1
	}

	options := kind.KindContainerRuntimeOptions{
		IncludeMonitoring: *includeMonitoring,
		IncludeTestserver: true,
		IncludeLinkerd:    true,
	}

	if _, err := setupRuntime(variant, options); err != nil {
		return writeErrorf("Failed to start runtime", err)
	}

	for _, line := range []string{"", "=== Runtime is Running ===", "Use 'tester stop' or 'make stop' to stop the cluster"} {
		if err := stdoutln(line); err != nil {
			stderrf("failed to write runtime status: %v\n", err)
			return 1
		}
	}
	return 0
}

func runStop() int {
	if err := stdoutln("=== PDF3 Runtime Stop ==="); err != nil {
		stderrf("failed to write stop banner: %v\n", err)
		return 1
	}

	root, err := projectroot.Find(projectroot.Marker)
	if err != nil {
		return writeErrorf("Failed to find project root", err)
	}

	runtime, err := kind.LoadCurrent(filepath.Join(root, ".cache"))
	if err != nil {
		return writeErrorf("Failed to load runtime", err)
	}
	closeRuntime := true
	defer func() {
		if closeRuntime {
			if closeErr := runtime.Close(); closeErr != nil {
				stderrf("Failed to close runtime: %v\n", closeErr)
			}
		}
	}()

	if err := runtime.Stop(); err != nil {
		return writeErrorf("Failed to stop runtime", err)
	}
	if err := runtime.Close(); err != nil {
		closeRuntime = false
		return writeErrorf("Failed to close runtime", err)
	}
	closeRuntime = false

	if err := stdoutln("=== Runtime Stopped ==="); err != nil {
		stderrf("failed to write stop status: %v\n", err)
		return 1
	}
	return 0
}

func parseTestOptions(args []string) (testOptions, error) {
	// Parse test flags
	testFlags := flag.NewFlagSet("test", flag.ExitOnError)
	opts := testOptions{}
	testFlags.BoolVar(&opts.runSmoke, "smoke", false, "Run smoke tests only")
	testFlags.BoolVar(&opts.runSimple, "simple", false, "Run simple tests only")
	testFlags.BoolVar(&opts.keepRunning, "keep-running", false, "Keep cluster running after tests complete")
	testFlags.BoolVar(&opts.keepRunning, "kr", false, "Keep cluster running after tests complete (shorthand)")
	iterations := testFlags.Int("n", 1, "Number of times to run tests (for flakiness testing)")
	if err := testFlags.Parse(args); err != nil {
		return testOptions{}, fmt.Errorf("parse test flags: %w", err)
	}
	opts.iterations = *iterations
	return opts, nil
}

func runRequestedTests(projectRoot string, opts testOptions) int {
	runBoth := !opts.runSmoke && !opts.runSimple
	for i := 1; i <= opts.iterations; i++ {
		if opts.iterations > 1 {
			if err := printIterationBanner(i, opts.iterations); err != nil {
				stderrf("failed to write iteration banner: %v\n", err)
				return 1
			}
		}

		testExitCode := runTestSuites(projectRoot, runBoth, opts.runSimple, opts.runSmoke)
		if testExitCode == 0 {
			continue
		}
		if opts.iterations > 1 {
			if err := printIterationFailure(i, opts.iterations); err != nil {
				stderrf("failed to write iteration failure: %v\n", err)
				return 1
			}
		}
		return testExitCode
	}

	if opts.iterations > 1 {
		if err := printIterationSuccess(opts.iterations); err != nil {
			stderrf("failed to write success banner: %v\n", err)
			return 1
		}
	}
	return 0
}

func runTestSuites(projectRoot string, runBoth, runSimple, runSmoke bool) int {
	if runBoth || runSimple {
		if err := stdoutln("Running simple integration tests..."); err != nil {
			stderrf("failed to write test status: %v\n", err)
			return 1
		}
		if err := runTests(projectRoot, "./integration/simple/..."); err != nil {
			return exitCodeForTestError(err)
		}
	}

	if runBoth || runSmoke {
		if err := stdoutln("Running smoke integration tests..."); err != nil {
			stderrf("failed to write test status: %v\n", err)
			return 1
		}
		if err := runTests(projectRoot, "./integration/smoke/..."); err != nil {
			return exitCodeForTestError(err)
		}
	}
	return 0
}

func exitCodeForTestError(err error) int {
	exitErr := &exec.ExitError{}
	if errors.As(err, &exitErr) {
		return exitErr.ExitCode()
	}
	return 1
}

func printIterationBanner(iteration, total int) error {
	for _, line := range []string{"", "============================================================"} {
		if err := stdoutln(line); err != nil {
			return err
		}
	}
	if err := stdoutf("Test iteration %d of %d\n", iteration, total); err != nil {
		return err
	}
	return stdoutln("============================================================")
}

func printIterationFailure(iteration, total int) error {
	if err := stdoutln(""); err != nil {
		return err
	}
	return stdoutf("FAILED on iteration %d of %d\n", iteration, total)
}

func printIterationSuccess(total int) error {
	for _, line := range []string{"", "============================================================"} {
		if err := stdoutln(line); err != nil {
			return err
		}
	}
	if err := stdoutf("SUCCESS: All %d test iterations passed\n", total); err != nil {
		return err
	}
	return stdoutln("============================================================")
}

func runTest(args []string) int {
	opts, err := parseTestOptions(args)
	if err != nil {
		return writeErrorf("Error parsing flags", err)
	}

	projectRoot, err := projectroot.Find(projectroot.Marker)
	if err != nil {
		return writeErrorf("Failed to find project root", err)
	}
	if writeErr := stdoutln("=== PDF3 Test Orchestrator ==="); writeErr != nil {
		stderrf("failed to write test banner: %v\n", writeErr)
		return 1
	}

	var runtime *kind.KindContainerRuntime
	runtime, err = loadRuntime(projectRoot, kind.KindContainerRuntimeVariantMinimal, kind.KindContainerRuntimeOptions{
		IncludeTestserver: true,
		IncludeLinkerd:    true,
	})
	if err != nil {
		return writeErrorf("Failed to setup runtime", err)
	}
	defer closeRuntime(runtime, opts.keepRunning)

	if writeErr := stdoutln("=== Environment Ready, Running Tests ==="); writeErr != nil {
		stderrf("failed to write environment status: %v\n", writeErr)
		return 1
	}

	// Create logs directory
	logsDir := filepath.Join(projectRoot, "test", "logs")
	if err := os.MkdirAll(logsDir, 0o750); err != nil {
		return writeErrorf("Failed to create logs directory", err)
	}

	// Record start time for log collection
	startTime := time.Now()

	// Step 5: Run tests
	var testExitCode int

	// Set CI=true when looping for flakiness testing
	if opts.iterations > 1 {
		if err := os.Setenv("CI", "true"); err != nil {
			return writeErrorf("Couldn't set CI env variable for snapshot failures", err)
		}
	}

	testExitCode = runRequestedTests(projectRoot, opts)

	// Step 6: Collect logs
	duration := time.Since(startTime)
	durationSeconds := int(duration.Seconds()) + 5 // Add 5s buffer

	if err := stdoutf("Capturing logs from last %ds to test/logs/...\n", durationSeconds); err != nil {
		stderrf("failed to write log capture status: %v\n", err)
		return 1
	}
	if err := collectLogs(runtime, logsDir, durationSeconds); err != nil {
		stderrf("Warning: Failed to collect logs: %v\n", err)
		// Don't exit on log collection failure
	}

	// Exit with test result
	if testExitCode != 0 {
		if err := stdoutf("\n=== Tests FAILED (exit code %d) ===\n", testExitCode); err != nil {
			stderrf("failed to write failure summary: %v\n", err)
			return 1
		}
		return testExitCode
	}

	if err := stdoutln("\n=== All Tests PASSED ==="); err != nil {
		stderrf("failed to write success summary: %v\n", err)
		return 1
	}
	return 0
}

// runTests executes go test for the specified package path.
func runTests(projectRoot, packagePath string) error {
	//nolint:gosec // packagePath is chosen from fixed local CLI options.
	cmd := exec.CommandContext(context.Background(), "go", "test", "-count=1", "-timeout", "5m", packagePath)
	cmd.Dir = filepath.Join(projectRoot, "test")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("run go test for %s: %w", packagePath, err)
	}
	return nil
}

func runLoggedCommand(
	projectRoot string,
	name string,
	args []string,
	stdin io.Reader,
	env []string,
) error {
	//nolint:gosec // Command name and args come from fixed local CLI orchestration, not user input.
	cmd := exec.CommandContext(context.Background(), name, args...)
	cmd.Dir = projectRoot
	cmd.Stdin = stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if env != nil {
		cmd.Env = env
	}
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("run %s %s: %w", name, strings.Join(args, " "), err)
	}
	return nil
}

func appendEnvFile(env []string, envFilePath string) ([]string, error) {
	//nolint:gosec // envFilePath is resolved under the local project root.
	envFile, err := os.Open(envFilePath)
	if err != nil {
		return nil, fmt.Errorf("open env file: %w", err)
	}
	defer func() {
		if closeErr := envFile.Close(); closeErr != nil {
			stderrf("Failed to close .env file: %v\n", closeErr)
		}
	}()

	scanner := bufio.NewScanner(envFile)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		splitAt := strings.IndexByte(line, '=')
		if splitAt <= 0 {
			return nil, fmt.Errorf("%w: %s", errInvalidEnvLine, line)
		}
		env = append(env, line)
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("scan env file: %w", err)
	}
	return env, nil
}

func runK6Script(projectRoot, k6Path, testScriptPath string, env []string) error {
	//nolint:gosec // testScriptPath is resolved under the local project root.
	testScript, err := os.Open(testScriptPath)
	if err != nil {
		return fmt.Errorf("open test script: %w", err)
	}
	defer func() {
		if closeErr := testScript.Close(); closeErr != nil {
			stderrf("Failed to close test script: %v\n", closeErr)
		}
	}()

	if err := stdoutln("\n=== Running k6 Load Test ==="); err != nil {
		return err
	}
	if err := runLoggedCommand(projectRoot, k6Path, []string{"run", "-"}, testScript, env); err != nil {
		return fmt.Errorf("run k6 load test: %w", err)
	}
	return nil
}

// collectLogs collects logs from pdf3 components using kubectl.
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

// findK6 locates k6 in PATH.
func findK6() (string, error) {
	path, err := exec.LookPath("k6")
	if err != nil {
		return "", fmt.Errorf(
			"%w. Install via: https://grafana.com/docs/k6/latest/set-up/install-k6/",
			errK6NotFound,
		)
	}
	return path, nil
}

// findChromePath locates the chrome-headless-shell executable in .cache.
func findChromePath(projectRoot string) (string, error) {
	pattern := filepath.Join(
		projectRoot,
		".cache",
		"chrome-headless-shell",
		"*",
		"chrome-headless-shell-linux64",
		"chrome-headless-shell",
	)
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return "", fmt.Errorf("failed to search for chrome: %w", err)
	}
	if len(matches) == 0 {
		return "", fmt.Errorf("%w (run 'make browser' to download)", errChromeNotFound)
	}
	// If multiple versions exist, return the first match (could sort by version if needed)
	return matches[0], nil
}

func runLoadtestEnv() int {
	// Find project root
	projectRoot, err := projectroot.Find(projectroot.Marker)
	if err != nil {
		return writeErrorf("Failed to find project root", err)
	}

	env := os.Environ()
	envFilePath := filepath.Join(projectRoot, ".env")
	if _, statErr := os.Stat(envFilePath); statErr != nil {
		return writeErrorf(".env file is required for running env tests", statErr)
	}
	env, err = appendEnvFile(env, envFilePath)
	if err != nil {
		return writeErrorf("Couldn't read .env file", err)
	}

	if writeErr := stdoutln("=== PDF3 Load Test ==="); writeErr != nil {
		stderrf("failed to write loadtest banner: %v\n", writeErr)
		return 1
	}

	k6Path, err := findK6()
	if err != nil {
		stderrf("%v\n", err)
		return 1
	}

	if writeErr := stdoutln("\n=== Ensuring Chrome is downloaded ==="); writeErr != nil {
		stderrf("failed to write chrome status: %v\n", writeErr)
		return 1
	}
	chromePath, err := findChromePath(projectRoot)
	if err != nil {
		stderrf("Chrome not found: %v\n", err)
		if writeErr := stdoutln("Downloading Chrome via 'make browser'..."); writeErr != nil {
			stderrf("failed to write chrome download status: %v\n", writeErr)
			return 1
		}
		if runErr := runLoggedCommand(projectRoot, "make", []string{"browser"}, nil, nil); runErr != nil {
			return writeErrorf("Failed to download Chrome", runErr)
		}
		// Try finding Chrome again after download
		chromePath, err = findChromePath(projectRoot)
		if err != nil {
			return writeErrorf("Chrome still not found after download", err)
		}
	}
	if writeErr := stdoutf("✓ Chrome found at: %s\n", chromePath); writeErr != nil {
		stderrf("failed to write chrome path: %v\n", writeErr)
		return 1
	}
	env = append(env, "K6_BROWSER_EXECUTABLE_PATH="+chromePath)
	env = append(env, "K6_WEB_DASHBOARD=true")
	testScriptPath := filepath.Join(projectRoot, "test", "load", "test-env.js")
	if err := runK6Script(projectRoot, k6Path, testScriptPath, env); err != nil {
		return writeErrorf("Load test failed", err)
	}

	if writeErr := stdoutln("\n=== Load Test Completed ==="); writeErr != nil {
		stderrf("failed to write loadtest completion: %v\n", writeErr)
		return 1
	}
	return 0
}

func runLoadtestLocal(args []string) int {
	// Parse loadtest flags
	loadtestFlags := flag.NewFlagSet("loadtest-local", flag.ExitOnError)
	keepRunning := false
	loadtestFlags.BoolVar(&keepRunning, "keep-running", false, "Keep cluster running after loadtest completes")
	loadtestFlags.BoolVar(&keepRunning, "kr", false, "Keep cluster running after loadtest completes (shorthand)")
	if err := loadtestFlags.Parse(args); err != nil {
		return writeErrorf("Error parsing flags", err)
	}

	// Find project root
	projectRoot, err := projectroot.Find(projectroot.Marker)
	if err != nil {
		return writeErrorf("Failed to find project root", err)
	}

	if writeErr := stdoutln("=== PDF3 Load Test ==="); writeErr != nil {
		stderrf("failed to write loadtest banner: %v\n", writeErr)
		return 1
	}

	// Setup runtime
	runtime, err := loadRuntime(projectRoot, kind.KindContainerRuntimeVariantStandard, kind.KindContainerRuntimeOptions{
		IncludeTestserver: true,
		IncludeLinkerd:    true,
	})
	if err != nil {
		return writeErrorf("Failed to setup runtime", err)
	}

	k6Path, err := findK6()
	if err != nil {
		stderrf("%v\n", err)
		return 1
	}

	defer closeRuntime(runtime, keepRunning)

	// Wait for deployments to be ready
	if writeErr := stdoutln("\n=== Waiting for deployments to be ready ==="); writeErr != nil {
		stderrf("failed to write deployment status: %v\n", writeErr)
		return 1
	}

	if waitErr := waitForDeployments(runtime); waitErr != nil {
		return writeErrorf("Failed waiting for deployments", waitErr)
	}

	if writeErr := stdoutln("✓ All deployments ready"); writeErr != nil {
		stderrf("failed to write deployment completion: %v\n", writeErr)
		return 1
	}

	testScriptPath := filepath.Join(projectRoot, "test", "load", "test-local.js")
	if err := runK6Script(projectRoot, k6Path, testScriptPath, nil); err != nil {
		return writeErrorf("Load test failed", err)
	}

	if writeErr := stdoutln("\n=== Load Test Completed ==="); writeErr != nil {
		stderrf("failed to write loadtest completion: %v\n", writeErr)
		return 1
	}
	return 0
}

func waitForDeployments(runtime *kind.KindContainerRuntime) error {
	type rolloutTarget struct {
		name string
	}

	targets := []rolloutTarget{{name: "pdf3-proxy"}, {name: "pdf3-worker"}}
	errCh := make(chan error, len(targets))

	var depWg sync.WaitGroup
	depWg.Add(len(targets))
	for _, target := range targets {
		go func(target rolloutTarget) {
			defer depWg.Done()
			if err := stdoutf("Waiting for %s deployment...\n", target.name); err != nil {
				errCh <- fmt.Errorf("write deployment status: %w", err)
				return
			}
			if err := runtime.KubernetesClient.RolloutStatus(
				context.Background(),
				target.name,
				"runtime-pdf3",
				2*time.Minute,
			); err != nil {
				errCh <- fmt.Errorf("%s: %w", target.name, err)
			}
		}(target)
	}
	depWg.Wait()
	close(errCh)

	for err := range errCh {
		if err != nil {
			return err
		}
	}
	return nil
}
