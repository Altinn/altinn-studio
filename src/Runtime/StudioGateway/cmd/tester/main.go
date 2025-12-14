package main

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"altinn.studio/runtime-fixture/pkg/harness"
	"altinn.studio/runtime-fixture/pkg/runtimes/kind"
)

var (
	isCI      = os.Getenv("CI") != ""
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

	result, err := harness.LoadExisting(filepath.Join(root, cachePath))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load runtime: %v\n", err)
		os.Exit(1)
	}

	if err := result.Runtime.Stop(); err != nil {
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
		_, err = harness.LoadExisting(filepath.Join(root, cachePath))
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

func setupRuntime(variant kind.KindContainerRuntimeVariant) (*harness.Result, error) {
	root, err := findProjectRoot()
	if err != nil {
		return nil, err
	}

	cfg := harness.Config{
		ProjectRoot: root,
		Variant:     variant,
		ClusterOptions: kind.KindContainerRuntimeOptions{
			IncludeMonitoring:                 false,
			IncludeTestserver:                 false,
			IncludeFluxNotificationController: true,
		},
		Images: []harness.Image{
			{
				Name:       "studio-gateway",
				Dockerfile: "Dockerfile",
				Tag:        "localhost:5001/studio-gateway:latest",
			},
		},
		Artifacts: []harness.Artifact{
			{
				Name: "kustomize",
				URL:  "oci://localhost:5001/studio-gateway-repo:local",
				Path: "infra/kustomize",
			},
		},
		Deployments: []harness.Deployment{
			{
				Name:           "studio-gateway",
				WaitForIngress: true, // depends on Traefik CRDs (IngressRoute)
				Kustomize: &harness.KustomizeDeploy{
					SyncRootDir:       "infra/kustomize/local-syncroot",
					KustomizationName: "studio-gateway",
					Namespace:         "runtime-gateway",
					Rollouts: []harness.Rollout{
						{
							Deployment: "studio-gateway",
							Namespace:  "runtime-gateway",
							Timeout:    2 * time.Minute,
						},
					},
				},
			},
		},
	}

	return harness.RunAsync(cfg, harness.AsyncOptions{})
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
