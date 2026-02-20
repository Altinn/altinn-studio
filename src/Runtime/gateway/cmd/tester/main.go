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

	"altinn.studio/devenv/pkg/harness"
	"altinn.studio/devenv/pkg/runtimes/kind"
)

const (
	cachePath              = ".cache"
	startCommandArgCount   = 3
	projectRootSearchDepth = 10
	exitCodeCanceled       = 130
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

	result, err := setupRuntime(variant)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to start runtime: %v\n", err)
		return 1
	}
	defer func() {
		if cerr := result.Runtime.Close(); cerr != nil {
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

	result, err := harness.LoadExisting(filepath.Join(root, cachePath))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load runtime: %v\n", err)
		return 1
	}
	defer func() {
		if cerr := result.Runtime.Close(); cerr != nil {
			fmt.Fprintf(os.Stderr, "Failed to close runtime handle: %v\n", cerr)
			if exitCode == 0 {
				exitCode = 1
			}
		}
	}()

	if err := result.Runtime.Stop(); err != nil {
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
	var result *harness.Result
	if isCI {
		result, err = harness.LoadExisting(filepath.Join(root, cachePath))
	} else {
		result, err = setupRuntime(kind.KindContainerRuntimeVariantMinimal)
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to setup runtime: %v\n", err)
		return 1
	}
	defer func() {
		if cerr := result.Runtime.Close(); cerr != nil {
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

func setupRuntime(variant kind.KindContainerRuntimeVariant) (*harness.Result, error) {
	root, err := findProjectRoot()
	if err != nil {
		return nil, err
	}

	cfg := harness.Config{
		ProjectRoot: root,
		CachePath:   cachePath,
		Variant:     variant,
		ClusterOptions: kind.KindContainerRuntimeOptions{
			IncludeMonitoring:                 false,
			IncludeTestserver:                 false,
			IncludeLinkerd:                    false,
			IncludeFluxNotificationController: true,
		},
		Images: []harness.Image{
			{
				Name:       "gateway",
				Context:    ".",
				Dockerfile: "Dockerfile",
				Tag:        "localhost:5001/gateway:latest",
			},
		},
		Artifacts: []harness.Artifact{
			{
				Name:     "kustomize",
				URL:      "oci://localhost:5001/gateway-repo:local",
				Path:     "infra/kustomize",
				Source:   "local",
				Revision: "local",
			},
			{
				Name:     "apps-syncroot",
				URL:      "oci://localhost:5001/apps-syncroot-repo:local",
				Path:     "infra/local-apps-syncroot",
				Source:   "local",
				Revision: "local",
			},
			{
				Name:     "test-app",
				URL:      "oci://localhost:5001/configs/test-app:local",
				Path:     "infra/local-test-app",
				Source:   "local",
				Revision: "local",
			},
		},
		HelmCharts: []harness.HelmChart{},
		Deployments: []harness.Deployment{
			{
				Name:           "gateway",
				WaitForIngress: true, // depends on Traefik CRDs (IngressRoute)
				Kustomize: &harness.KustomizeDeploy{
					SyncRootDir:       "infra/kustomize/local-syncroot",
					KustomizationName: "gateway",
					Namespace:         "runtime-gateway",
					Rollouts: []harness.Rollout{
						{
							Deployment: "gateway",
							Namespace:  "runtime-gateway",
							Timeout:    2 * time.Minute,
						},
					},
					ReconcileOpts: nil,
				},
				Helm: nil,
			},
		},
	}

	result, err := harness.RunAsync(
		cfg,
		harness.AsyncOptions{
			RegistryReady: nil,
			IngressReady:  nil,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("run runtime setup: %w", err)
	}

	return result, nil
}

func findProjectRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("get working directory: %w", err)
	}

	for range projectRootSearchDepth {
		if _, statErr := os.Stat(filepath.Join(dir, "go.mod")); statErr == nil {
			return dir, nil
		} else if !errors.Is(statErr, os.ErrNotExist) {
			return "", fmt.Errorf("stat go.mod in %q: %w", dir, statErr)
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return "", fmt.Errorf("go.mod not found within %d parent directories: %w", projectRootSearchDepth, os.ErrNotExist)
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
