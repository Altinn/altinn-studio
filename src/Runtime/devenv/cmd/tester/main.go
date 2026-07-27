// Package main provides a small CLI for devenv test orchestration.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

const (
	exitCodeCanceled      = 130
	projectRootSearchMax  = 10
	containerToolchainEnv = "STUDIO_CONTAINER_TOOLCHAIN"
	goListTimeout         = 30 * time.Second
)

var errProjectRootNotFound = errors.New("go.mod not found from current directory")

func main() {
	os.Exit(run(os.Args[1:]))
}

func run(args []string) int {
	if len(args) == 0 {
		printUsage()
		return 1
	}

	switch args[0] {
	case "test":
		return runUnitTests(args[1:])
	case "test-e2e":
		return runE2ETests()
	default:
		fmt.Fprintf(os.Stderr, "Unknown subcommand: %s\n\n", args[0])
		printUsage()
		return 1
	}
}

func printUsage() {
	fmt.Fprintln(os.Stderr, "Usage: tester <command> [-- go-test-flags]")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Commands:")
	fmt.Fprintln(os.Stderr, "  test       Run unit tests")
	fmt.Fprintln(os.Stderr, "  test-e2e   Run e2e tests")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Environment:")
	fmt.Fprintln(
		os.Stderr,
		"  E2E_CONTAINER_TOOLCHAINS  Space-separated STUDIO_CONTAINER_TOOLCHAIN values for e2e runs",
	)
}

func runUnitTests(args []string) int {
	root, err := findProjectRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		return 1
	}

	testArgs := goTestArgs(args)
	packages, err := nonE2EPackages(root)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to list packages: %v\n", err)
		return 1
	}
	if len(packages) == 0 {
		fmt.Fprintln(os.Stderr, "No unit test packages found")
		return 1
	}

	return runGoTest(root, "", append(testArgs, packages...), os.Environ())
}

func runE2ETests() int {
	root, err := findProjectRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to find project root: %v\n", err)
		return 1
	}

	toolchains := strings.Fields(os.Getenv("E2E_CONTAINER_TOOLCHAINS"))
	if len(toolchains) == 0 {
		toolchains = []string{""}
	}

	for _, toolchain := range toolchains {
		label := "default detection"
		if toolchain != "" {
			label = fmt.Sprintf("%s=%s", containerToolchainEnv, toolchain)
		}
		if _, err := fmt.Fprintf(os.Stdout, "=== Devenv E2E: %s ===\n", label); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to write e2e label: %v\n", err)
			return 1
		}

		env := withToolchainEnv(os.Environ(), toolchain)
		exitCode := runGoTest(root, toolchain, []string{"-v", "-count=1", "./test/e2e/..."}, env)
		if exitCode != 0 {
			return exitCode
		}
	}

	return 0
}

func goTestArgs(args []string) []string {
	result := []string{"-count=1"}
	if len(args) > 0 && args[0] == "--" {
		result = append(result, args[1:]...)
		return result
	}
	return append(result, args...)
}

func nonE2EPackages(root string) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), goListTimeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, "go", "list", "./...")
	cmd.Dir = root
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("go list ./...: %w", err)
	}

	var packages []string
	for pkg := range strings.SplitSeq(strings.TrimSpace(string(output)), "\n") {
		if pkg == "" || strings.Contains(pkg, "/test/e2e/") || strings.HasSuffix(pkg, "/test/e2e") {
			continue
		}
		packages = append(packages, pkg)
	}
	return packages, nil
}

func runGoTest(root, toolchain string, args []string, env []string) int {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	//nolint:gosec // The command is fixed to `go test`; args are controlled by the local Makefile/tester caller.
	cmd := exec.CommandContext(ctx, "go", append([]string{"test"}, args...)...)
	cmd.Dir = root
	cmd.Env = env
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if toolchain != "" {
		if _, err := fmt.Fprintf(
			os.Stdout,
			"Running go test with %s=%s\n",
			containerToolchainEnv,
			toolchain,
		); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to write go test label: %v\n", err)
			return 1
		}
	}

	err := cmd.Run()
	if err == nil {
		return 0
	}
	if errors.Is(ctx.Err(), context.Canceled) {
		if _, writeErr := fmt.Fprintln(os.Stdout, "\n=== Tests CANCELED ==="); writeErr != nil {
			fmt.Fprintf(os.Stderr, "Failed to write cancellation message: %v\n", writeErr)
		}
		return exitCodeCanceled
	}

	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		return exitErr.ExitCode()
	}

	fmt.Fprintf(os.Stderr, "Failed to run go test: %v\n", err)
	return 1
}

func withToolchainEnv(env []string, toolchain string) []string {
	result := make([]string, 0, len(env)+1)
	for _, item := range env {
		if strings.HasPrefix(item, containerToolchainEnv+"=") {
			continue
		}
		result = append(result, item)
	}
	if toolchain != "" {
		result = append(result, containerToolchainEnv+"="+toolchain)
	}
	return result
}

func findProjectRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("get working directory: %w", err)
	}

	for range projectRootSearchMax {
		if fileExists(filepath.Join(dir, "go.mod")) {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	return "", errProjectRootNotFound
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
