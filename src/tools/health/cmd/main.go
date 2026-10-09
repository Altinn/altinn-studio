//nolint:cyclop // This CLI keeps related subcommands in one file, which skews the package-average metric.
package main

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"text/tabwriter"
	"time"

	"altinn.studio/runtime-health/internal/az"
	"altinn.studio/runtime-health/internal/kubernetes"
	"altinn.studio/runtime-health/internal/output"
	"altinn.studio/runtime-health/internal/runtimes/dis"
)

const (
	maxClusterWorkers = 16
)

var (
	errUsage              = errors.New("invalid command usage")
	errUnknownCommand     = errors.New("unknown command")
	errInvalidEnvironment = errors.New("invalid environment")
	errNoValidEnvironment = errors.New("no valid environments provided")
	errInvalidWeight      = errors.New("invalid weight")
	errNoMatchingClusters = errors.New("no matching clusters found")
	errUpdateHTTPRoutes   = errors.New("failed to update httproutes on some clusters")
	errUnsupportedCommand = errors.New("unsupported command")
	errCommandNotFound    = errors.New("command not found")
	errCommandFailed      = errors.New("command failed on one or more clusters")
	errMissingLogFilter   = errors.New("at least one of --since or --tail must be specified")
	errReadUserInput      = errors.New("failed to read user input")
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func printUsage() string {
	return `usage: go run cmd/main.go <command> [arguments]

Available commands:
  help            Print CLI usage
  init            Discover clusters and configure credentials
  status          Check status of resources across clusters
  set-weight      Update HTTPRoute weights
  exec            Execute kubectl/helm/flux commands across clusters
  logs            Aggregate deployment logs from multiple clusters
  nodes           Check node resource utilization

Examples:
  # Discover clusters and fetch credentials (single or multiple environments)
  go run cmd/main.go init tt02
  go run cmd/main.go init at22,at24
  go run cmd/main.go init -s ttd tt02,prod
  go run cmd/main.go init --kubeconfig ./kubeconfigs/tt02.yaml tt02

  # Check resource status
  go run cmd/main.go status tt02 hr traefik/altinn-traefik
  go run cmd/main.go status tt02 ks runtime-pdf3/pdf3-app
  go run cmd/main.go status at22,at24 dep runtime-pdf3/pdf3-proxy
  go run cmd/main.go status tt02 httproute pdf/pdf3-migration
  go run cmd/main.go status -s ttd tt02,prod ks runtime-pdf3/pdf3-app

  # Update HTTPRoute weights
  go run cmd/main.go set-weight tt02 pdf/pdf3-migration 50 50
  go run cmd/main.go set-weight at22,at24 pdf/pdf3-migration 0 100
  go run cmd/main.go set-weight --dry-run tt02,prod pdf/pdf3-migration 0 100

  # Execute commands across clusters
  go run cmd/main.go exec tt02 kubectl get pods -n default
  go run cmd/main.go exec at22,at24 flux get kustomizations -A
  go run cmd/main.go exec -s ttd prod,tt02 helm list -A

  # Aggregate logs from deployments across clusters
  go run cmd/main.go logs --since=1h tt02 runtime-pdf3/pdf3-worker .logs/logs.txt
  go run cmd/main.go logs --since=30m at22,at24 runtime-pdf3/pdf3-worker .logs/logs.txt
  go run cmd/main.go logs -f --since=10m -s ttd prod runtime-pdf3/pdf3-worker .logs/logs.txt

  # Check node resource utilization
  go run cmd/main.go nodes at22
  go run cmd/main.go nodes at22,at24
  go run cmd/main.go nodes -s ttd tt02

Run 'go run cmd/main.go <command> -h' for more information on a specific command.`
}

func usageError(usage string) error {
	return fmt.Errorf("%w\n\n%s", errUsage, usage)
}

func serviceOwnerArg(serviceowner string) string {
	if serviceowner == "" {
		return ""
	}

	return " -s " + serviceowner
}

func noMatchingClustersError(envArg string, serviceowner string) error {
	return fmt.Errorf(
		"%w\n\nRun 'go run cmd/main.go init %s%s' to discover and configure clusters",
		errNoMatchingClusters,
		envArg,
		serviceOwnerArg(serviceowner),
	)
}

func parseCommandArgs(fs *flag.FlagSet) ([]string, error) {
	if err := fs.Parse(os.Args[2:]); err != nil {
		return nil, fmt.Errorf("parse %s flags: %w", fs.Name(), err)
	}

	return fs.Args(), nil
}

func parseNamespaceAndName(input string) (string, string, error) {
	namespace, name, err := kubernetes.ParseNamespaceAndName(input)
	if err != nil {
		return "", "", fmt.Errorf("parse namespace/name %q: %w", input, err)
	}

	return namespace, name, nil
}

func parseResourceType(input string) (kubernetes.ResourceType, error) {
	resourceType, err := kubernetes.ParseResourceType(input)
	if err != nil {
		return "", fmt.Errorf("parse resource type %q: %w", input, err)
	}

	return resourceType, nil
}

func validateKubectl() error {
	if err := kubernetes.ValidateKubectl(); err != nil {
		return fmt.Errorf("validate kubectl: %w", err)
	}

	return nil
}

func validateAzurePrerequisites() error {
	if err := az.ValidateAzCLI(); err != nil {
		return fmt.Errorf("validate az cli: %w", err)
	}
	if err := az.ValidateUserLogin(); err != nil {
		return fmt.Errorf("validate az login: %w", err)
	}

	return validateKubectl()
}

func listContextRuntimes(environments []string, serviceowner string) ([]kubernetes.KubernetesRuntime, error) {
	runtimes, err := dis.ListFromContext(environments, serviceowner)
	if err != nil {
		return nil, fmt.Errorf("list runtimes from context: %w", err)
	}

	return runtimes, nil
}

func parseWeightArg(name string, raw string) (int, error) {
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("%w %s %q: expected an integer", errInvalidWeight, name, raw)
	}

	return value, nil
}

func run() error {
	if len(os.Args) < 2 {
		return usageError(printUsage())
	}

	command := os.Args[1]

	switch command {
	case "help":
		fmt.Print(printUsage())
		return nil
	case "init":
		return runInit()
	case "status":
		return runStatus()
	case "set-weight":
		return runSetWeight()
	case "exec":
		return runExec()
	case "logs":
		return runLogs()
	case "nodes":
		return runNodes()
	default:
		return fmt.Errorf("%w: %s\n\n%s", errUnknownCommand, command, printUsage())
	}
}

func validateEnvironments(environmentsStr string) ([]string, error) {
	validEnvs := map[string]struct{}{
		"at22": {},
		"at23": {},
		"at24": {},
		"yt01": {},
		"tt02": {},
		"prod": {},
	}

	environments := strings.Split(environmentsStr, ",")
	var validated []string

	for _, env := range environments {
		env = strings.TrimSpace(env)
		if env == "" {
			continue
		}
		if _, ok := validEnvs[env]; !ok {
			return nil, fmt.Errorf(
				"%w: %s (expected: at22, at23, at24, yt01, tt02, prod)",
				errInvalidEnvironment,
				env,
			)
		}
		validated = append(validated, env)
	}

	if len(validated) == 0 {
		return nil, errNoValidEnvironment
	}

	return validated, nil
}

//nolint:funlen,gocognit,gocyclo,maintidx // CLI subcommand flow mixes parsing, confirmation, and per-environment reporting.
func runSetWeight() error {
	const desiredWeightSum = 100

	setWeightCmd := flag.NewFlagSet("set-weight", flag.ExitOnError)
	serviceowner := setWeightCmd.String("service-owner", "", "Optional: specific serviceowner ID (e.g., ttd, brg, skd)")
	setWeightCmd.StringVar(serviceowner, "s", "", "Optional: specific serviceowner ID (shorthand)")
	dryRun := setWeightCmd.Bool("dry-run", false, "Show what would change without applying")

	args, err := parseCommandArgs(setWeightCmd)
	if err != nil {
		return err
	}

	if len(args) != 4 {
		return usageError(
			"usage: go run cmd/main.go set-weight [flags] <environments> <namespace/name> <weight1> <weight2>\n\n" +
				"Arguments:\n" +
				"  environments    Comma-separated list: at22, at23, at24, yt01, tt02, prod (e.g., tt02 or at22,at24)\n" +
				"  namespace/name  HTTPRoute location (e.g., pdf/pdf3-migration)\n" +
				"  weight1         Weight for first backendRef (0-100)\n" +
				"  weight2         Weight for second backendRef (0-100)\n\n" +
				"Flags:\n" +
				"  -s, --service-owner string\n" +
				"                  Optional: specific serviceowner ID (e.g., ttd, brg, skd)\n" +
				"  --dry-run\n" +
				"                  Show what would change without applying",
		)
	}

	environments, err := validateEnvironments(args[0])
	if err != nil {
		return err
	}

	namespace, name, err := parseNamespaceAndName(args[1])
	if err != nil {
		return err
	}

	weight1, err := parseWeightArg("weight1", args[2])
	if err != nil {
		return err
	}
	weight2, err := parseWeightArg("weight2", args[3])
	if err != nil {
		return err
	}

	if weight1 < 0 || weight2 < 0 {
		return fmt.Errorf("%w: weight1=%d, weight2=%d", errInvalidWeight, weight1, weight2)
	}

	if weight1+weight2 != desiredWeightSum {
		return fmt.Errorf(
			"%w: weight1=%d + weight2=%d = %d",
			errInvalidWeight,
			weight1,
			weight2,
			weight1+weight2,
		)
	}

	fmt.Println("Validating prerequisites...")

	if validateErr := validateKubectl(); validateErr != nil {
		return validateErr
	}

	envStr := strings.Join(environments, ", ")
	fmt.Printf("Finding clusters for environment(s): %s", envStr)
	if *serviceowner != "" {
		fmt.Printf(" (serviceowner: %s)", *serviceowner)
	}
	fmt.Println()

	// Get all kubectl runtimes and filter by environments and serviceowner
	runtimes, err := listContextRuntimes(environments, *serviceowner)
	if err != nil {
		return err
	}

	if len(runtimes) == 0 {
		return noMatchingClustersError(args[0], *serviceowner)
	}

	fmt.Printf("Found %d cluster(s)\n", len(runtimes))

	fmt.Printf("Fetching current HTTPRoute %s/%s from %d cluster(s)...\n", namespace, name, len(runtimes))

	results := kubernetes.GetAllHTTPRoutes(runtimes, namespace, name, maxClusterWorkers)

	// Create a map from cluster name to environment for filtering
	clusterEnv := make(map[string]string, len(runtimes))
	for _, runtime := range runtimes {
		clusterEnv[runtime.GetName()] = runtime.GetEnvironment()
	}

	// Check for errors and identify clusters that need changes, grouped by environment
	var routesToUpdate []kubernetes.HTTPRouteResult
	for i, environment := range environments {
		if i > 0 {
			fmt.Println()
		}

		// Filter results for this environment
		var envResults []kubernetes.HTTPRouteResult
		for _, result := range results {
			if clusterEnv[result.ClusterName] == environment {
				envResults = append(envResults, result)
			}
		}

		if len(envResults) == 0 {
			continue
		}

		fmt.Printf("\n=== Environment: %s ===\n", environment)
		fmt.Println("Current state:")
		for _, result := range envResults {
			if result.Error != nil {
				fmt.Printf("  ✗ %s: ERROR - %v\n", result.ClusterName, result.Error)
			} else {
				needsUpdate := result.CurrentWeight1 != weight1 || result.CurrentWeight2 != weight2
				if needsUpdate {
					fmt.Printf(
						"  → %s: weight1=%d, weight2=%d (will change)\n",
						result.ClusterName,
						result.CurrentWeight1,
						result.CurrentWeight2,
					)
					routesToUpdate = append(routesToUpdate, result)
				} else {
					fmt.Printf(
						"  ✓ %s: weight1=%d, weight2=%d (already correct)\n",
						result.ClusterName,
						result.CurrentWeight1,
						result.CurrentWeight2,
					)
				}
			}
		}
	}

	if len(routesToUpdate) == 0 {
		fmt.Printf("\n✓ All clusters already have the desired weights (weight1=%d, weight2=%d)\n", weight1, weight2)
		return nil
	}

	fmt.Printf("\nProposed changes:\n")
	fmt.Printf("  New weight distribution: weight1=%d, weight2=%d\n", weight1, weight2)
	fmt.Printf("  Annotation to add: kustomize.toolkit.fluxcd.io/reconcile=disabled\n")
	fmt.Printf("  Clusters to update: %d/%d\n", len(routesToUpdate), len(runtimes))
	for _, result := range routesToUpdate {
		fmt.Printf("    - %s\n", result.ClusterName)
	}

	if *dryRun {
		fmt.Println("\nDry-run mode: No changes will be applied")
		return nil
	}

	fmt.Println()
	confirmed, err := promptConfirmation("Apply these changes to all clusters?")
	if err != nil {
		return err
	}

	if !confirmed {
		fmt.Println("Operation cancelled")
		return nil
	}

	fmt.Println("\nApplying weight changes...")
	updateResults := kubernetes.UpdateAllHTTPRoutes(runtimes, routesToUpdate, weight1, weight2, maxClusterWorkers)

	// Group results by environment (reuse clusterEnv map from above)
	fmt.Println("\nResults:")
	var updateErrors bool
	for i, environment := range environments {
		if i > 0 {
			fmt.Println()
		}

		// Filter results for this environment
		var envResults []kubernetes.HTTPRouteResult
		for _, result := range updateResults {
			if clusterEnv[result.ClusterName] == environment {
				envResults = append(envResults, result)
			}
		}

		if len(envResults) == 0 {
			continue
		}

		fmt.Printf("=== Environment: %s ===\n", environment)
		for _, result := range envResults {
			if result.Error != nil {
				fmt.Printf("  ✗ %s: FAILED - %v\n", result.ClusterName, result.Error)
				updateErrors = true
			} else {
				fmt.Printf(
					"  ✓ %s: Successfully updated to weight1=%d, weight2=%d\n",
					result.ClusterName,
					result.CurrentWeight1,
					result.CurrentWeight2,
				)
			}
		}
	}

	if updateErrors {
		return errUpdateHTTPRoutes
	}

	fmt.Println("\n✓ All HTTPRoutes updated successfully")
	return nil
}

//nolint:funlen,gocognit,gocyclo // CLI status output groups results per environment and resource type.
func runStatus() error {
	statusCmd := flag.NewFlagSet("status", flag.ExitOnError)
	serviceowner := statusCmd.String("service-owner", "", "Optional: specific serviceowner ID (e.g., ttd, brg, skd)")
	statusCmd.StringVar(serviceowner, "s", "", "Optional: specific serviceowner ID (shorthand)")

	args, err := parseCommandArgs(statusCmd)
	if err != nil {
		return err
	}
	if len(args) != 3 {
		return usageError(
			"usage: go run cmd/main.go status [flags] <environments> <resource-type> <namespace/name>\n\n" +
				"Arguments:\n" +
				"  environments    Comma-separated list: at22, at23, at24, yt01, tt02, prod (e.g., tt02 or at22,at24)\n" +
				"  resource-type   hr (helmrelease) or ks (kustomization) or dep (deployment) or httproute\n" +
				"  namespace/name  Resource location (e.g., default/my-app)\n\n" +
				"Flags:\n" +
				"  -s, --service-owner string\n" +
				"                  Optional: specific serviceowner ID (e.g., ttd, brg, skd)",
		)
	}

	environments, err := validateEnvironments(args[0])
	if err != nil {
		return err
	}

	resourceTypeStr := args[1]
	namespaceAndName := args[2]

	resourceType, err := parseResourceType(resourceTypeStr)
	if err != nil {
		return err
	}

	namespace, name, err := parseNamespaceAndName(namespaceAndName)
	if err != nil {
		return err
	}

	fmt.Println("Validating prerequisites...")

	if validateErr := validateKubectl(); validateErr != nil {
		return validateErr
	}

	envStr := strings.Join(environments, ", ")
	fmt.Printf("Finding clusters for environment(s): %s", envStr)
	if *serviceowner != "" {
		fmt.Printf(" (serviceowner: %s)", *serviceowner)
	}
	fmt.Println()

	// Get all kubectl contexts and filter by environments and serviceowner
	runtimes, err := listContextRuntimes(environments, *serviceowner)
	if err != nil {
		return err
	}

	if len(runtimes) == 0 {
		return noMatchingClustersError(args[0], *serviceowner)
	}

	fmt.Printf("Found %d cluster(s)\n", len(runtimes))

	fmt.Printf("Querying %s %s/%s across %d cluster(s)...\n",
		resourceType, namespace, name, len(runtimes))

	results := kubernetes.QueryAllClusters(runtimes, resourceType, namespace, name, maxClusterWorkers)

	// Create a map from cluster name to environment for filtering
	clusterEnv := make(map[string]string, len(runtimes))
	for _, runtime := range runtimes {
		clusterEnv[runtime.GetName()] = runtime.GetEnvironment()
	}

	// Group results by environment
	fmt.Println()
	for i, environment := range environments {
		if i > 0 {
			fmt.Println()
		}

		// Filter results for this environment
		var envResults []kubernetes.QueryResult
		for _, result := range results {
			if clusterEnv[result.ClusterName] == environment {
				envResults = append(envResults, result)
			}
		}

		if len(envResults) > 0 {
			fmt.Printf("=== Environment: %s ===\n", environment)
			if err := output.PrintResults(os.Stdout, envResults); err != nil {
				return fmt.Errorf("print status results: %w", err)
			}
		}
	}

	return nil
}

// ExecResult represents the result of executing a command on a cluster.
type ExecResult struct {
	Error       error
	ClusterName string
	Stdout      string
	Stderr      string
	ExitCode    int
}

// getContextFlag returns the context flag name for a given command.
func getContextFlag(command string) (string, error) {
	contextFlags := map[string]string{
		"kubectl": "--context",
		"flux":    "--context",
		"helm":    "--kube-context",
	}

	if contextFlag, ok := contextFlags[command]; ok {
		return contextFlag, nil
	}

	return "", fmt.Errorf("%w: %s (supported: kubectl, flux, helm)", errUnsupportedCommand, command)
}

//nolint:funlen,gocognit,gocyclo,maintidx // CLI subcommand flow mixes parsing, confirmation, concurrency, and grouped reporting.
func runExec() error {
	execCmd := flag.NewFlagSet("exec", flag.ExitOnError)
	serviceowner := execCmd.String("service-owner", "", "Optional: specific serviceowner ID (e.g., ttd, brg, skd)")
	execCmd.StringVar(serviceowner, "s", "", "Optional: specific serviceowner ID (shorthand)")
	dryRun := execCmd.Bool("dry-run", false, "Show what would be executed without running")

	args, err := parseCommandArgs(execCmd)
	if err != nil {
		return err
	}

	if len(args) < 2 {
		return usageError("usage: go run cmd/main.go exec [flags] <environments> <command> [args...]\n\n" +
			"Arguments:\n" +
			"  environments    Comma-separated list: at22, at23, at24, yt01, tt02, prod (e.g., tt02 or at22,at24)\n" +
			"  command         kubectl, flux, or helm\n" +
			"  args...         Arguments to pass to the command\n\n" +
			"Flags:\n" +
			"  -s, --service-owner string\n" +
			"                  Optional: specific serviceowner ID (e.g., ttd, brg, skd)\n" +
			"  --dry-run\n" +
			"                  Show what would be executed without running\n\n" +
			"Examples:\n" +
			"  go run cmd/main.go exec tt02 kubectl get pods -n default\n" +
			"  go run cmd/main.go exec at22,at24 flux get kustomizations -A\n" +
			"  go run cmd/main.go exec -s ttd prod helm list -A")
	}

	environments, err := validateEnvironments(args[0])
	if err != nil {
		return err
	}

	command := args[1]
	commandArgs := args[2:]

	// Validate command and get context flag
	contextFlag, err := getContextFlag(command)
	if err != nil {
		return err
	}

	// Validate that the command binary exists
	if _, lookPathErr := exec.LookPath(command); lookPathErr != nil {
		return fmt.Errorf("%w: %s (please ensure %s is installed and in PATH)", errCommandNotFound, command, command)
	}

	fmt.Println("Validating prerequisites...")

	if validateErr := validateKubectl(); validateErr != nil {
		return validateErr
	}

	envStr := strings.Join(environments, ", ")
	fmt.Printf("Finding clusters for environment(s): %s", envStr)
	if *serviceowner != "" {
		fmt.Printf(" (serviceowner: %s)", *serviceowner)
	}
	fmt.Println()

	// Get all kubectl contexts and filter by environments and serviceowner
	runtimes, err := listContextRuntimes(environments, *serviceowner)
	if err != nil {
		return err
	}

	if len(runtimes) == 0 {
		return noMatchingClustersError(args[0], *serviceowner)
	}

	fmt.Printf("Found %d cluster(s)\n", len(runtimes))

	// Build the base command for display
	baseCommand := command
	if len(commandArgs) > 0 {
		baseCommand = command + " " + strings.Join(commandArgs, " ")
	}

	// Show confirmation prompt
	fmt.Printf("\nCommand to execute: %s\n", baseCommand)
	fmt.Printf("Clusters (%d):\n", len(runtimes))
	for _, runtime := range runtimes {
		fmt.Printf("  - %s\n", runtime.GetName())
	}
	fmt.Printf("\nExample (first cluster):\n")
	exampleCmd := append([]string{command}, commandArgs...)
	exampleCmd = append(exampleCmd, contextFlag, runtimes[0].GetName())
	fmt.Printf("  %s\n", strings.Join(exampleCmd, " "))

	if *dryRun {
		fmt.Println("\nDry-run mode: No commands will be executed")
		return nil
	}

	fmt.Println()
	confirmed, err := promptConfirmation(fmt.Sprintf("Execute this command on all %d clusters?", len(runtimes)))
	if err != nil {
		return err
	}

	if !confirmed {
		fmt.Println("Operation cancelled")
		return nil
	}

	fmt.Printf("\nExecuting command on %d cluster(s)...\n", len(runtimes))

	// Execute commands in parallel using worker pool
	maxWorkers := min(maxClusterWorkers, len(runtimes))

	jobs := make(chan string, len(runtimes))
	results := make(chan ExecResult, len(runtimes))

	var wg sync.WaitGroup

	// Start workers
	for range maxWorkers {
		wg.Go(func() {
			for clusterName := range jobs {
				result := executeCommand(command, commandArgs, contextFlag, clusterName)
				results <- result
			}
		})
	}

	// Send jobs
	for _, runtime := range runtimes {
		jobs <- runtime.GetName()
	}
	close(jobs)

	// Wait for completion
	wg.Wait()
	close(results)

	// Collect results
	var allResults []ExecResult
	for result := range results {
		allResults = append(allResults, result)
	}

	// Create a map from cluster name to environment for filtering
	clusterEnv := make(map[string]string, len(runtimes))
	for _, runtime := range runtimes {
		clusterEnv[runtime.GetName()] = runtime.GetEnvironment()
	}

	// Group results by environment
	fmt.Println("\nResults:")
	var totalSuccessCount, totalFailureCount int

	for i, environment := range environments {
		if i > 0 {
			fmt.Println()
		}

		// Filter results for this environment
		var envResults []ExecResult
		for _, result := range allResults {
			if clusterEnv[result.ClusterName] == environment {
				envResults = append(envResults, result)
			}
		}

		if len(envResults) == 0 {
			continue
		}

		fmt.Printf("=== Environment: %s ===\n", environment)
		table := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
		if _, printErr := fmt.Fprintln(table, "CLUSTER\tSTATUS\tEXIT CODE\tSTDOUT\tSTDERR / ERROR"); printErr != nil {
			return fmt.Errorf("print command results header: %w", printErr)
		}

		var successCount, failureCount int
		for _, result := range envResults {
			status := "✓ SUCCESS"
			diagnostic := result.Stderr
			if result.Error != nil || result.ExitCode != 0 {
				failureCount++
				status = "✗ FAILED"
				if result.Error != nil {
					diagnostic = result.Error.Error() + " " + diagnostic
				}
			} else {
				successCount++
			}
			if _, printErr := fmt.Fprintf(table, "%s\t%s\t%d\t%s\t%s\n",
				result.ClusterName, status, result.ExitCode,
				execTableCell(result.Stdout), execTableCell(diagnostic)); printErr != nil {
				return fmt.Errorf("print command result: %w", printErr)
			}
		}
		if err := table.Flush(); err != nil {
			return fmt.Errorf("print command results: %w", err)
		}
		fmt.Printf("Summary: %d succeeded, %d failed\n", successCount, failureCount)

		totalSuccessCount += successCount
		totalFailureCount += failureCount
	}

	if totalFailureCount > 0 {
		return fmt.Errorf("%w: %d/%d clusters", errCommandFailed, totalFailureCount, len(runtimes))
	}

	fmt.Println("\n✓ Command executed successfully on all clusters")
	return nil
}

// execTableCell keeps field-selected output on one row while preserving embedded line breaks visibly.
func execTableCell(value string) string {
	return strings.NewReplacer("\r", `\r`, "\n", `\n`, "\t", `\t`).Replace(strings.TrimRight(value, "\r\n"))
}

// executeCommand executes a command on a specific cluster.
func executeCommand(command string, args []string, contextFlag string, clusterName string) ExecResult {
	// Build the full command with context
	cmdArgs := append(append([]string{}, args...), contextFlag, clusterName)

	//nolint:gosec // The command is restricted to kubectl, flux, or helm before this function is called.
	cmd := exec.CommandContext(context.Background(), command, cmdArgs...)
	var stderr strings.Builder
	cmd.Stderr = &stderr

	stdout, err := cmd.Output()
	var exitCode int

	if err != nil {
		// Try to get the exit code.
		exitErr := &exec.ExitError{}
		if errors.As(err, &exitErr) {
			exitCode = exitErr.ExitCode()
		} else {
			// Command failed to start
			return ExecResult{
				ClusterName: clusterName,
				ExitCode:    -1,
				Error:       err,
			}
		}
	}

	return ExecResult{
		ClusterName: clusterName,
		ExitCode:    exitCode,
		Stdout:      string(stdout),
		Stderr:      stderr.String(),
		Error:       nil,
	}
}

//nolint:funlen,gocognit,gocyclo // CLI init mixes discovery, prompting, and environment-grouped reporting.
func runInit() error {
	initCmd := flag.NewFlagSet("init", flag.ExitOnError)
	serviceowner := initCmd.String("service-owner", "", "Optional: specific serviceowner ID (e.g., ttd, brg, skd)")
	initCmd.StringVar(serviceowner, "s", "", "Optional: specific serviceowner ID (shorthand)")
	kubeconfigPath := initCmd.String("kubeconfig", "", "Optional: kubeconfig file to inspect and update")
	excludeOwners := initCmd.String("exclude-service-owner", "", "Comma-separated serviceowner IDs to exclude")
	prune := initCmd.Bool("prune", false, "Offer to remove contexts not found in Azure discovery")
	update := initCmd.Bool("update", false, "Refresh credentials and connection details for existing contexts")
	dryRun := initCmd.Bool("dry-run", false, "Preview credential fetching and pruning without changes")

	args, err := parseCommandArgs(initCmd)
	if err != nil {
		return err
	}

	if len(args) != 1 {
		return usageError("usage: go run cmd/main.go init [flags] <environments>\n\n" +
			"Arguments:\n" +
			"  environments    Comma-separated list: at22, at23, at24, yt01, tt02, prod (e.g., tt02 or at22,at24)\n\n" +
			"Flags:\n" +
			"  -s, --service-owner string\n" +
			"                  Optional: specific serviceowner ID (e.g., ttd, brg, skd)\n\n" +
			"  --kubeconfig path\n" +
			"                  Optional: kubeconfig file to inspect and update\n\n" +
			"  --exclude-service-owner owners\n" +
			"                  Exclude comma-separated serviceowner IDs from discovery and pruning\n" +
			"  --prune         Confirm removal of contexts not found in Azure discovery\n" +
			"  --update        Also refresh credentials and connection details for existing contexts\n" +
			"  --dry-run       Preview without fetching credentials or changing kubeconfig\n\n" +
			"Description:\n" +
			"  Discovers AKS clusters for the specified environment(s), configures credentials,\n" +
			"  and optionally removes contexts not found in Azure discovery.\n")
	}

	environments, err := validateEnvironments(args[0])
	if err != nil {
		return err
	}

	excludedOwners, err := parseExcludedOwners(*excludeOwners, *serviceowner)
	if err != nil {
		return err
	}
	selectedPath, err := kubernetes.ResolveKubeconfigPath(*kubeconfigPath)
	if err != nil {
		return fmt.Errorf("resolve kubeconfig: %w", err)
	}
	fmt.Printf("Kubeconfig: %s\n", selectedPath)
	if len(excludedOwners) > 0 {
		fmt.Printf("Excluded service owners: %s\n", strings.Join(excludedOwners, ", "))
	}
	fmt.Println("Validating prerequisites...")

	if validateErr := validateAzurePrerequisites(); validateErr != nil {
		return validateErr
	}

	fmt.Println("Querying all container runtimes and contexts")
	discovery, err := dis.Discover(environments, *serviceowner, excludedOwners, selectedPath)
	if err != nil {
		return fmt.Errorf("discover clusters and contexts: %w", err)
	}

	input := bufio.NewReader(os.Stdin)
	totalCredentialsFetched := 0

	for i, environment := range environments {
		if i > 0 {
			fmt.Println()
		}

		fmt.Printf("=== Environment: %s ===\n", environment)
		if *serviceowner != "" {
			fmt.Printf("Service owner filter: %s\n", *serviceowner)
		}

		envRuntimes := make([]*dis.DisContainerRuntime, 0, len(discovery.Runtimes))
		for _, runtime := range discovery.Runtimes {
			if runtime.Environment == environment {
				envRuntimes = append(envRuntimes, runtime)
			}
		}

		if len(envRuntimes) == 0 {
			fmt.Println("No clusters found matching the specified criteria")
			continue
		}

		fmt.Printf("Found %d cluster(s) in Azure\n", len(envRuntimes))

		var credentialsToFetch []*dis.DisContainerRuntime
		fmt.Println("\nCluster status:")
		for _, runtime := range envRuntimes {
			switch {
			case runtime.Context == nil:
				fmt.Printf("  → %s (needs credentials)\n", runtime.ClusterName)
			case *update:
				fmt.Printf("  → %s (will refresh credentials and connection details)\n", runtime.ClusterName)
			default:
				fmt.Printf("  ✓ %s (credentials already configured)\n", runtime.ClusterName)
				continue
			}
			credentialsToFetch = append(credentialsToFetch, runtime)
		}

		if len(credentialsToFetch) == 0 {
			fmt.Println("\nAll clusters already have configured credentials")
			continue
		}
		if *dryRun {
			fmt.Printf("\nDry run: would fetch credentials for %d cluster(s)\n", len(credentialsToFetch))
			continue
		}
		fmt.Printf("\n%d cluster(s) selected for credential fetching\n", len(credentialsToFetch))
		confirmed, err := readConfirmation(input, fmt.Sprintf("Fetch credentials for %s clusters?", environment), true)
		if err != nil {
			return err
		}
		if !confirmed {
			fmt.Println("Skipped credential fetching")
			continue
		}

		fmt.Println("\nFetching credentials...")
		for _, runtime := range credentialsToFetch {
			fmt.Printf("  Fetching credentials for %s...\n", runtime.ClusterName)
			if err := az.EnsureCredentials(runtime.Cluster, selectedPath); err != nil {
				fmt.Printf("  ✗ Failed: %v\n", err)
				return fmt.Errorf("failed to fetch credentials for %s: %w", runtime.ClusterName, err)
			}
			fmt.Printf("  ✓ Success\n")
			totalCredentialsFetched++
		}
	}

	if err := pruneInitContexts(selectedPath, discovery.StaleContexts, *prune, *dryRun, input); err != nil {
		return err
	}

	fmt.Println("\n=== Summary ===")
	fmt.Printf("  Environments processed: %s\n", strings.Join(environments, ", "))
	fmt.Printf("  Total clusters discovered: %d\n", len(discovery.Runtimes))
	if totalCredentialsFetched > 0 {
		fmt.Printf("  Credentials fetched: %d\n", totalCredentialsFetched)
	}

	fmt.Println("\n✓ Initialization complete")
	return nil
}

func parseExcludedOwners(raw, includedOwner string) ([]string, error) {
	var owners []string
	if raw == "" {
		return owners, nil
	}
	for value := range strings.SplitSeq(raw, ",") {
		owner := strings.TrimSpace(value)
		if owner == "" || strings.IndexFunc(owner, func(r rune) bool { return r < 'a' || r > 'z' }) >= 0 {
			return nil, fmt.Errorf(
				"%w: invalid excluded service owner %q (expected lowercase letters)",
				errUsage,
				value,
			)
		}
		if owner == includedOwner {
			return nil, fmt.Errorf("%w: service owner %q is both included and excluded", errUsage, owner)
		}
		owners = append(owners, owner)
	}
	return owners, nil
}

func pruneInitContexts(
	path string,
	candidates []kubernetes.ContextInfo,
	prune, dryRun bool,
	input *bufio.Reader,
) error {
	if len(candidates) == 0 {
		return nil
	}
	// Fetching credentials can change current-context. Report the current file state.
	contexts, err := kubernetes.ListContexts(path)
	if err != nil {
		return fmt.Errorf("list contexts before pruning: %w", err)
	}
	current := ""
	for _, ctx := range contexts {
		if ctx.Current {
			current = ctx.Name
		}
	}
	fmt.Println("\nContexts not found in Azure discovery:")
	for _, candidate := range candidates {
		fmt.Printf("  → %s", candidate.Name)
		if candidate.Name == current {
			fmt.Print(" (current-context will be cleared if removed)")
		}
		fmt.Println()
	}
	if !prune {
		fmt.Println("Use --prune to remove these contexts from kubeconfig.")
		return nil
	}
	fmt.Println("The selected Azure account must have access to all clusters in this scope.")
	if dryRun {
		fmt.Printf("Dry run: would remove %d context(s) and their unreferenced cluster/user entries\n", len(candidates))
		return nil
	}
	confirmed, err := readConfirmation(
		input,
		"Remove these local contexts and their unreferenced cluster/user entries?",
		false,
	)
	if err != nil {
		return err
	}
	if !confirmed {
		fmt.Println("Skipped context pruning")
		return nil
	}
	backup, err := kubernetes.PruneContexts(path, candidates)
	if backup != "" {
		fmt.Printf("Kubeconfig backup: %s\n", backup)
	}
	if err != nil {
		return fmt.Errorf("prune contexts: %w", err)
	}
	fmt.Printf("Removed %d context(s)\n", len(candidates))
	return nil
}

//nolint:funlen // The logs subcommand has one linear parse/validate/dispatch flow.
func runLogs() error {
	const logBufferDuration = 10 * time.Second

	logsCmd := flag.NewFlagSet("logs", flag.ExitOnError)
	serviceowner := logsCmd.String("service-owner", "", "Optional: specific serviceowner ID (e.g., ttd, brg, skd)")
	logsCmd.StringVar(serviceowner, "s", "", "Optional: specific serviceowner ID (shorthand)")
	since := logsCmd.String("since", "", "Time range for logs (e.g., 1h, 30m, 2h)")
	tail := logsCmd.Int("tail", -1, "Number of lines to show from end of each pod's logs")
	logsCmd.IntVar(tail, "t", -1, "Number of lines to show from end of each pod's logs (shorthand)")
	follow := logsCmd.Bool("follow", false, "Stream logs in real-time")
	logsCmd.BoolVar(follow, "f", false, "Stream logs in real-time (shorthand)")
	timestamps := logsCmd.Bool("timestamps", false, "Include kubectl timestamps in output")
	logsCmd.BoolVar(timestamps, "ts", false, "Include kubectl timestamps in output (shorthand)")

	args, err := parseCommandArgs(logsCmd)
	if err != nil {
		return err
	}

	if len(args) != 3 {
		return usageError("usage: go run cmd/main.go logs [flags] <environments> <namespace/name> <output-file>\n\n" +
			"Arguments:\n" +
			"  environments    Comma-separated list: at22, at23, at24, yt01, tt02, prod (e.g., tt02 or at22,at24)\n" +
			"  namespace/name  Deployment location (e.g., runtime-pdf3/pdf3-app)\n" +
			"  output-file     Path to output file for aggregated logs\n\n" +
			"Flags:\n" +
			"  -s, --service-owner string\n" +
			"                  Optional: specific serviceowner ID (e.g., ttd, brg, skd)\n" +
			"  --since string\n" +
			"                  Time range for logs. Examples: 30m, 2h, 1h30m\n" +
			"  -t, --tail int\n" +
			"                  Number of lines from end of each pod's logs\n" +
			"  -f, --follow\n" +
			"                  Stream logs in real-time from all clusters\n" +
			"  -ts, --timestamps\n" +
			"                  Include kubectl timestamps in output (default: false)\n\n" +
			"Note:\n" +
			"  At least one of --since or -t/--tail must be specified.\n\n" +
			"Description:\n" +
			"  Aggregates logs from all pods of a deployment across multiple clusters.\n" +
			"  Logs are sorted by timestamp and written to the output file.\n" +
			"  Uses a time buffer to ensure proper ordering in follow mode.\n" +
			"  Kubectl is always called with --timestamps for sorting, but the flag\n" +
			"  controls whether timestamps appear in the output file.")
	}

	// Validate that at least one of --since or --tail is specified
	if *since == "" && *tail == -1 {
		return errMissingLogFilter
	}

	environments, err := validateEnvironments(args[0])
	if err != nil {
		return err
	}

	namespaceAndName := args[1]
	outputFile := args[2]

	namespace, name, err := parseNamespaceAndName(namespaceAndName)
	if err != nil {
		return err
	}

	fmt.Println("Validating prerequisites...")

	envStr := strings.Join(environments, ", ")
	fmt.Printf("Finding clusters for environment(s): %s", envStr)
	if *serviceowner != "" {
		fmt.Printf(" (serviceowner: %s)", *serviceowner)
	}
	fmt.Println()

	// Get all kubectl contexts and filter by environments and serviceowner
	runtimes, err := listContextRuntimes(environments, *serviceowner)
	if err != nil {
		return err
	}

	if len(runtimes) == 0 {
		return noMatchingClustersError(args[0], *serviceowner)
	}

	fmt.Printf("Found %d cluster(s)\n", len(runtimes))

	if *follow {
		fmt.Printf("Streaming logs from %s/%s across %d cluster(s) to %s (Ctrl+C to stop)...\n",
			namespace, name, len(runtimes), outputFile)
	} else {
		fmt.Printf("Fetching logs from %s/%s across %d cluster(s) to %s...\n",
			namespace, name, len(runtimes), outputFile)
	}

	// Aggregate logs with time buffer
	if err := kubernetes.AggregateLogsWithBuffer(
		runtimes,
		namespace,
		name,
		outputFile,
		since,
		tail,
		*follow,
		*timestamps,
		logBufferDuration,
	); err != nil {
		return fmt.Errorf("aggregate logs: %w", err)
	}

	fmt.Printf("\n✓ Logs written to %s\n", outputFile)
	return nil
}

//nolint:funlen // The nodes subcommand has one linear parse/validate/dispatch flow.
func runNodes() error {
	nodesCmd := flag.NewFlagSet("nodes", flag.ExitOnError)
	serviceowner := nodesCmd.String("service-owner", "", "Optional: specific serviceowner ID (e.g., ttd, brg, skd)")
	nodesCmd.StringVar(serviceowner, "s", "", "Optional: specific serviceowner ID (shorthand)")
	labelSelector := nodesCmd.String("label-selector", "agentpool=workpool", "Label selector for filtering nodes")
	nodesCmd.StringVar(labelSelector, "l", "agentpool=workpool", "Label selector for filtering nodes (shorthand)")

	args, err := parseCommandArgs(nodesCmd)
	if err != nil {
		return err
	}

	if len(args) != 1 {
		return usageError("usage: go run cmd/main.go nodes [flags] <environments>\n\n" +
			"Arguments:\n" +
			"  environments    Comma-separated list: at22, at23, at24, yt01, tt02, prod (e.g., tt02 or at22,at24)\n\n" +
			"Flags:\n" +
			"  -s, --service-owner string\n" +
			"                  Optional: specific serviceowner ID (e.g., ttd, brg, skd)\n" +
			"  -l, --label-selector string\n" +
			"                  Label selector for filtering nodes (default: agentpool=workpool)\n\n" +
			"Description:\n" +
			"  Queries node resource utilization from workpool nodes across clusters.\n" +
			"  Shows K8s version, node count, pod count, CPU/memory availability and usage.")
	}

	environments, err := validateEnvironments(args[0])
	if err != nil {
		return err
	}

	fmt.Println("Validating prerequisites...")

	envStr := strings.Join(environments, ", ")
	fmt.Printf("Finding clusters for environment(s): %s", envStr)
	if *serviceowner != "" {
		fmt.Printf(" (serviceowner: %s)", *serviceowner)
	}
	fmt.Println()

	// Get all kubectl contexts and filter by environments and serviceowner
	runtimes, err := listContextRuntimes(environments, *serviceowner)
	if err != nil {
		return err
	}

	if len(runtimes) == 0 {
		return noMatchingClustersError(args[0], *serviceowner)
	}

	fmt.Printf("Found %d cluster(s)\n", len(runtimes))

	fmt.Printf("Querying nodes (label selector: %s) across %d cluster(s)...\n",
		*labelSelector, len(runtimes))

	results := kubernetes.QueryAllClustersForNodes(runtimes, *labelSelector, maxClusterWorkers)

	// Create a map from cluster name to environment for filtering
	clusterEnv := make(map[string]string, len(runtimes))
	for _, runtime := range runtimes {
		clusterEnv[runtime.GetName()] = runtime.GetEnvironment()
	}

	// Group results by environment
	fmt.Println()
	for i, environment := range environments {
		if i > 0 {
			fmt.Println()
		}

		// Filter results for this environment
		var envResults []kubernetes.NodeResult
		for _, result := range results {
			if clusterEnv[result.ClusterName] == environment {
				envResults = append(envResults, result)
			}
		}

		if len(envResults) > 0 {
			fmt.Printf("=== Environment: %s ===\n", environment)
			if err := output.PrintNodeResults(os.Stdout, envResults); err != nil {
				return fmt.Errorf("print node results: %w", err)
			}
		}
	}

	return nil
}

// promptConfirmation prompts the user for confirmation.
func promptConfirmation(message string) (bool, error) {
	return readConfirmation(bufio.NewReader(os.Stdin), message, true)
}

func readConfirmation(reader *bufio.Reader, message string, defaultYes bool) (bool, error) {
	choices := "y/N"
	if defaultYes {
		choices = "Y/n"
	}
	fmt.Printf("%s [%s]: ", message, choices)

	response, err := reader.ReadString('\n')
	if err != nil {
		return false, fmt.Errorf("%w: %w", errReadUserInput, err)
	}

	response = strings.ToLower(strings.TrimSpace(response))

	if (response == "" && defaultYes) || response == "y" || response == "yes" {
		return true, nil
	}

	return false, nil
}
