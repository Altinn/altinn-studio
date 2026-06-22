// Package main provides a small CLI for local runtime-fixture orchestration.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"altinn.studio/devenv/pkg/cabundle"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/projectroot"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/runtimes/kind"
)

const (
	cachePath              = ".cache"
	startCommandArgCount   = 3
	exitCodeCanceled       = 130
	graphApplyDurationStep = 10 * time.Millisecond
)

func main() {
	os.Exit(run(os.Args))
}

func run(args []string) int {
	if len(args) < 2 {
		printUsage()
		return 1
	}

	switch args[1] {
	case "start":
		return runStart(args)
	case "stop":
		return runStop()
	case "test":
		return runTest()
	default:
		fmt.Fprintf(os.Stderr, "Unknown subcommand: %s\n\n", args[1])
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
	fmt.Fprintln(os.Stderr, "  test             Run integration tests")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Start arguments:")
	fmt.Fprintln(os.Stderr, "  standard         Use standard variant (more nodes)")
	fmt.Fprintln(os.Stderr, "  minimal          Use minimal variant (fewer resources)")
	fmt.Fprintln(os.Stderr, "")
}

func runStart(args []string) (exitCode int) {
	writeStdoutln("=== Gateway Runtime Start ===")

	if len(args) < startCommandArgCount {
		fmt.Fprintf(os.Stderr, "Must specify 'standard' or 'minimal'\n")
		return 1
	}

	variant, err := parseVariant(args[2])
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		return 1
	}

	runtime, err := setupRuntime(variant)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to start runtime: %v\n", err)
		return 1
	}
	defer func() {
		if cerr := runtime.Close(); cerr != nil {
			fmt.Fprintf(os.Stderr, "Failed to close runtime handle: %v\n", cerr)
			if exitCode == 0 {
				exitCode = 1
			}
		}
	}()

	writeStdoutln("\n=== Runtime is Running ===")
	writeStdoutln("Use 'make stop' to stop the cluster")
	return 0
}

func runStop() (exitCode int) {
	writeStdoutln("=== Gateway Runtime Stop ===")

	root, err := findProjectRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		return 1
	}

	runtime, err := kind.LoadCurrent(filepath.Join(root, cachePath))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load runtime: %v\n", err)
		return 1
	}
	defer func() {
		if cerr := runtime.Close(); cerr != nil {
			fmt.Fprintf(os.Stderr, "Failed to close runtime handle: %v\n", cerr)
			if exitCode == 0 {
				exitCode = 1
			}
		}
	}()

	if err := runtime.Stop(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to stop runtime: %v\n", err)
		return 1
	}

	writeStdoutln("=== Runtime Stopped ===")
	return 0
}

func runTest() (exitCode int) {
	root, err := findProjectRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		return 1
	}

	writeStdoutln("=== Gateway Test Orchestrator ===")

	isCI := os.Getenv("CI") != ""
	var runtime *kind.KindContainerRuntime
	if isCI {
		runtime, err = kind.LoadCurrent(filepath.Join(root, cachePath))
	} else {
		runtime, err = setupRuntime(kind.KindContainerRuntimeVariantMinimal)
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to setup runtime: %v\n", err)
		return 1
	}
	defer func() {
		if cerr := runtime.Close(); cerr != nil {
			fmt.Fprintf(os.Stderr, "Failed to close runtime handle: %v\n", cerr)
			if exitCode == 0 {
				exitCode = 1
			}
		}
	}()

	writeStdoutln("=== Environment Ready, Running Tests ===")

	testsDir := filepath.Join(root, "tests", "Altinn.Studio.Gateway.Api.Tests")
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	cmd := exec.CommandContext(ctx, "dotnet", "test")
	cmd.Dir = testsDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(), "GATEWAY_TEST_BASE_URL=http://localhost:8080")

	err = cmd.Run()
	ctxErr := ctx.Err()
	stop()
	if err != nil {
		if errors.Is(ctxErr, context.Canceled) {
			writeStdoutln("\n=== Tests CANCELED ===")
			return exitCodeCanceled
		}

		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			writeStdoutf("\n=== Tests FAILED (exit code %d) ===\n", exitErr.ExitCode())
			return exitErr.ExitCode()
		}
		writeStdoutf("\n=== Tests FAILED: %v ===\n", err)
		return 1
	}

	writeStdoutln("\n=== All Tests PASSED ===")
	return 0
}

func setupRuntime(variant kind.KindContainerRuntimeVariant) (*kind.KindContainerRuntime, error) {
	root, err := findProjectRoot()
	if err != nil {
		return nil, err
	}

	runtime, err := kind.New(variant, filepath.Join(root, cachePath), gatewayClusterOptions())
	if err != nil {
		return nil, fmt.Errorf("create kind runtime: %w", err)
	}

	graph, cleanup, err := gatewayGraph(root, runtime)
	if err != nil {
		closeRuntimeBestEffort(runtime)
		return nil, err
	}
	defer cleanupBestEffort(cleanup)

	if err := applyRuntimeGraph(runtime, graph); err != nil {
		closeRuntimeBestEffort(runtime)
		return nil, err
	}
	return runtime, nil
}

func gatewayClusterOptions() kind.KindContainerRuntimeOptions {
	return kind.KindContainerRuntimeOptions{
		IncludeMonitoring:                 false,
		IncludeTestserver:                 false,
		IncludeLinkerd:                    false,
		IncludeFluxNotificationController: true,
	}
}

func gatewayGraph(root string, runtime *kind.KindContainerRuntime) (*resource.Graph, func() error, error) {
	graph, err := runtime.Graph()
	if err != nil {
		return nil, nil, fmt.Errorf("build kind runtime graph: %w", err)
	}

	bundle, _, err := cabundle.FromEnv()
	if err != nil {
		return nil, nil, fmt.Errorf("resolve CA bundle: %w", err)
	}
	workloads := []cabundle.KubernetesWorkload{{
		Deployment: "gateway",
		Namespace:  "runtime-gateway",
		Container:  "gateway",
	}}

	published, cleanup, err := addGatewayPublishResources(graph, runtime, root, bundle, workloads)
	if err != nil {
		return nil, nil, err
	}
	deps := []resource.ResourceRef{
		runtime.BaseInfrastructureRef(),
		resource.Ref(published.gateway),
	}
	for _, artifact := range published.artifacts {
		deps = append(deps, resource.Ref(artifact))
	}
	if err := addGatewayDeploymentResources(graph, runtime, root, bundle, workloads, deps); err != nil {
		cleanupBestEffort(cleanup)
		return nil, nil, err
	}

	return graph, cleanup, nil
}

type gatewayPublishedResources struct {
	gateway   *resource.PublishedImage
	artifacts []resource.Resource
}

func addGatewayPublishResources(
	graph *resource.Graph,
	runtime *kind.KindContainerRuntime,
	root string,
	bundle *cabundle.Bundle,
	workloads []cabundle.KubernetesWorkload,
) (gatewayPublishedResources, func() error, error) {
	srcRoot := filepath.Clean(filepath.Join(root, "../.."))
	gatewayImage := &resource.BuiltImage{
		Enabled:     nil,
		ContextPath: srcRoot,
		Dockerfile:  filepath.Join(srcRoot, "Runtime", "gateway", "Dockerfile"),
		Tag:         "gateway:latest",
		Build: types.BuildOptions{
			CacheFrom: nil,
			CacheTo:   nil,
		},
	}
	gatewayPublished := &resource.PublishedImage{
		Enabled:   nil,
		Ref:       "localhost:5001/gateway:latest",
		Source:    resource.Ref(gatewayImage),
		DependsOn: []resource.ResourceRef{runtime.RegistryRef()},
	}
	preparedArtifact, err := cabundle.PrepareKubernetesArtifact(
		filepath.Join(root, "infra/kustomize"),
		bundle,
		workloads,
	)
	if err != nil {
		return gatewayPublishedResources{}, nil, fmt.Errorf("prepare gateway kustomize artifact: %w", err)
	}

	artifacts := []resource.Resource{
		&resource.OCIArtifact{
			Enabled:   nil,
			Format:    resource.OCIArtifactFormatGeneric,
			Name:      "gateway-kustomize",
			URL:       "oci://localhost:5001/gateway-repo:local",
			Path:      preparedArtifact.Path,
			Source:    "local",
			Revision:  "local",
			DependsOn: []resource.ResourceRef{runtime.RegistryRef()},
		},
		&resource.OCIArtifact{
			Enabled:   nil,
			Format:    resource.OCIArtifactFormatGeneric,
			Name:      "gateway-apps-syncroot",
			URL:       "oci://localhost:5001/apps-syncroot-repo:local",
			Path:      filepath.Join(root, "infra/local-apps-syncroot"),
			Source:    "local",
			Revision:  "local",
			DependsOn: []resource.ResourceRef{runtime.RegistryRef()},
		},
		&resource.OCIArtifact{
			Enabled:   nil,
			Format:    resource.OCIArtifactFormatGeneric,
			Name:      "gateway-test-app",
			URL:       "oci://localhost:5001/configs/test-app:local",
			Path:      filepath.Join(root, "infra/local-test-app"),
			Source:    "local",
			Revision:  "local",
			DependsOn: []resource.ResourceRef{runtime.RegistryRef()},
		},
	}

	if err := graph.AddAll(append([]resource.Resource{gatewayImage, gatewayPublished}, artifacts...)...); err != nil {
		cleanupBestEffort(preparedArtifact.Cleanup)
		return gatewayPublishedResources{}, nil, fmt.Errorf("add gateway publish resources: %w", err)
	}

	return gatewayPublishedResources{
		gateway:   gatewayPublished,
		artifacts: artifacts,
	}, preparedArtifact.Cleanup, nil
}

func addGatewayDeploymentResources(
	graph *resource.Graph,
	runtime *kind.KindContainerRuntime,
	root string,
	bundle *cabundle.Bundle,
	workloads []cabundle.KubernetesWorkload,
	deps []resource.ResourceRef,
) error {
	configMapSet, hasConfigMapSet, err := cabundle.KubernetesConfigMapObjectSet(
		bundle,
		runtime.ClusterRef(),
		"deployment-gateway-ca-bundle",
		workloads,
		deps,
	)
	if err != nil {
		return fmt.Errorf("create gateway CA bundle ConfigMap resource: %w", err)
	}
	if hasConfigMapSet {
		if err := graph.AddAll(configMapSet); err != nil {
			return fmt.Errorf("add gateway CA bundle ConfigMap resource: %w", err)
		}
		deps = append(deps, resource.Ref(configMapSet))
	}

	objects := &resource.KubernetesObjectSet{
		Enabled:   nil,
		Name:      "deployment-gateway",
		Cluster:   runtime.ClusterRef(),
		Path:      filepath.Join(root, "infra/kustomize/local-syncroot"),
		Manifest:  "",
		DependsOn: deps,
		Readiness: []resource.KubernetesReadinessCheck{
			{
				Kind:      resource.KubernetesReadinessFluxKustomization,
				Namespace: "runtime-gateway",
				Name:      "gateway",
				Timeout:   0,
				Reconcile: nil,
			},
			{
				Kind:      resource.KubernetesReadinessDeploymentAvailable,
				Namespace: "runtime-gateway",
				Name:      "gateway",
				Timeout:   2 * time.Minute,
				Reconcile: nil,
			},
		},
	}
	if err := graph.AddAll(objects); err != nil {
		return fmt.Errorf("add gateway Kubernetes object set resource: %w", err)
	}
	return nil
}

func applyRuntimeGraph(runtime *kind.KindContainerRuntime, graph *resource.Graph) error {
	writeStdoutln("Applying runtime resource graph...")
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
	writeStdoutf("  [Applied runtime resource graph took %s]\n", time.Since(start).Round(graphApplyDurationStep))
	writeStdoutln("=== Runtime Setup Complete ===")
	return nil
}

func cleanupBestEffort(cleanup func() error) {
	if cleanup == nil {
		return
	}
	if err := cleanup(); err != nil {
		fmt.Fprintf(os.Stderr, "warning: %v\n", err)
	}
}

func closeRuntimeBestEffort(runtime *kind.KindContainerRuntime) {
	if err := runtime.Close(); err != nil {
		fmt.Fprintf(os.Stderr, "warning: close runtime: %v\n", err)
	}
}

func findProjectRoot() (string, error) {
	root, err := projectroot.Find(projectroot.Marker)
	if err != nil {
		return "", fmt.Errorf("find project root: %w", err)
	}
	return root, nil
}

func parseVariant(s string) (kind.KindContainerRuntimeVariant, error) {
	switch s {
	case "standard":
		return kind.KindContainerRuntimeVariantStandard, nil
	case "minimal":
		return kind.KindContainerRuntimeVariantMinimal, nil
	default:
		return 0, fmt.Errorf("%w: %q (use 'standard' or 'minimal')", os.ErrInvalid, s)
	}
}

func writeStdoutln(message string) {
	writeStdout(message + "\n")
}

func writeStdoutf(format string, args ...any) {
	writeStdout(fmt.Sprintf(format, args...))
}

func writeStdout(message string) {
	if _, err := os.Stdout.WriteString(message); err != nil {
		os.Exit(1)
	}
}
