package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"

	"altinn.studio/runtime-health/internal/azure"
	"altinn.studio/runtime-health/internal/kubernetes"
	"altinn.studio/runtime-health/internal/output"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func printUsage() string {
	return `usage: runtime-health <command> [arguments]

Available commands:
  status	Check status of resources across clusters
  set-weight	Update HTTPRoute weights
  exec		Execute kubectl/helm/flux commands across clusters`
}

func run() error {
	if len(os.Args) < 2 {
		return fmt.Errorf(printUsage())
	}

	command := os.Args[1]

	switch command {
	case "status":
		return runStatus()
	case "set-weight":
		return runSetWeight()
	case "exec":
		return runExec()
	default:
		return fmt.Errorf("unknown command: %s\n\n%s", command, printUsage())
	}
}

func runSetWeight() error {
	setWeightCmd := flag.NewFlagSet("set-weight", flag.ExitOnError)
	serviceowner := setWeightCmd.String("serviceowner", "", "Optional: specific serviceowner ID (e.g., ttd, brg, skd)")
	useCache := setWeightCmd.Bool("use-cache", false, "Use cached data without refreshing from Azure")
	setWeightCmd.BoolVar(useCache, "uc", false, "Use cached data without refreshing from Azure (shorthand)")
	dryRun := setWeightCmd.Bool("dry-run", false, "Show what would change without applying")

	setWeightCmd.Parse(os.Args[2:])
	args := setWeightCmd.Args()

	if len(args) != 5 {
		return fmt.Errorf("usage: runtime-health set-weight [flags] <environment> <namespace> <name> <weight1> <weight2>\n\n" +
			"Arguments:\n" +
			"  environment     at22, at24, tt02, or prod\n" +
			"  namespace       HTTPRoute namespace\n" +
			"  name            HTTPRoute name\n" +
			"  weight1         Weight for first backendRef (0-100)\n" +
			"  weight2         Weight for second backendRef (0-100)\n\n" +
			"Flags:\n" +
			"  -serviceowner string\n" +
			"                  Optional: specific serviceowner ID (e.g., ttd, brg, skd)\n" +
			"  -use-cache, -uc\n" +
			"                  Use cached data without refreshing from Azure\n" +
			"  --dry-run\n" +
			"                  Show what would change without applying")
	}

	environment := args[0]
	namespace := args[1]
	name := args[2]

	// Parse and validate weights
	var weight1, weight2 int
	if _, err := fmt.Sscanf(args[3], "%d", &weight1); err != nil {
		return fmt.Errorf("invalid weight1: %s (must be an integer)", args[3])
	}
	if _, err := fmt.Sscanf(args[4], "%d", &weight2); err != nil {
		return fmt.Errorf("invalid weight2: %s (must be an integer)", args[4])
	}

	if weight1 < 0 || weight2 < 0 {
		return fmt.Errorf("weights must be non-negative integers (got weight1=%d, weight2=%d)", weight1, weight2)
	}

	if weight1+weight2 != 100 {
		return fmt.Errorf("weights must sum to 100 (got weight1=%d + weight2=%d = %d)", weight1, weight2, weight1+weight2)
	}

	if environment != "at22" && environment != "at24" && environment != "tt02" && environment != "prod" {
		return fmt.Errorf("invalid environment: %s (expected: at22, at24, tt02, or prod)", environment)
	}

	fmt.Println("Validating prerequisites...")

	if err := azure.ValidateAzCLI(); err != nil {
		return err
	}

	if err := kubernetes.ValidateKubectl(); err != nil {
		return err
	}

	if err := azure.ValidateUserLogin(); err != nil {
		return err
	}

	fmt.Printf("Discovering AKS clusters for environment: %s", environment)
	if *serviceowner != "" {
		fmt.Printf(" (serviceowner: %s)", *serviceowner)
	}
	fmt.Println()

	clusters, err := azure.GetClusters(environment, *serviceowner, *useCache)
	if err != nil {
		return err
	}

	fmt.Printf("Found %d cluster(s)\n", len(clusters))

	fmt.Println("Ensuring cluster credentials...")
	if err := azure.EnsureAllCredentials(clusters); err != nil {
		return err
	}

	clusterNames := make([]string, len(clusters))
	for i, cluster := range clusters {
		clusterNames[i] = cluster.Name
	}

	fmt.Printf("Fetching current HTTPRoute %s/%s from %d cluster(s)...\n", namespace, name, len(clusters))

	maxWorkers := 16
	results := kubernetes.GetAllHTTPRoutes(clusterNames, namespace, name, maxWorkers)

	// Check for errors and identify clusters that need changes
	var hasErrors bool
	var routesToUpdate []kubernetes.HTTPRouteResult
	fmt.Println("\nCurrent state:")
	for _, result := range results {
		if result.Error != nil {
			fmt.Printf("  ✗ %s: ERROR - %v\n", result.ClusterName, result.Error)
			hasErrors = true
		} else {
			needsUpdate := result.CurrentWeight1 != weight1 || result.CurrentWeight2 != weight2
			if needsUpdate {
				fmt.Printf("  → %s: weight1=%d, weight2=%d (will change)\n", result.ClusterName, result.CurrentWeight1, result.CurrentWeight2)
				routesToUpdate = append(routesToUpdate, result)
			} else {
				fmt.Printf("  ✓ %s: weight1=%d, weight2=%d (already correct)\n", result.ClusterName, result.CurrentWeight1, result.CurrentWeight2)
			}
		}
	}

	if hasErrors {
		return fmt.Errorf("errors occurred while fetching HTTPRoutes from some clusters")
	}

	if len(routesToUpdate) == 0 {
		fmt.Printf("\n✓ All clusters already have the desired weights (weight1=%d, weight2=%d)\n", weight1, weight2)
		return nil
	}

	fmt.Printf("\nProposed changes:\n")
	fmt.Printf("  New weight distribution: weight1=%d, weight2=%d\n", weight1, weight2)
	fmt.Printf("  Annotation to add: kustomize.toolkit.fluxcd.io/reconcile=disabled\n")
	fmt.Printf("  Clusters to update: %d/%d\n", len(routesToUpdate), len(clusterNames))
	for _, result := range routesToUpdate {
		fmt.Printf("    - %s\n", result.ClusterName)
	}

	if *dryRun {
		fmt.Println("\nDry-run mode: No changes will be applied")
		return nil
	}

	fmt.Println()
	confirmed, err := azure.PromptConfirmation("Apply these changes to all clusters?")
	if err != nil {
		return err
	}

	if !confirmed {
		fmt.Println("Operation cancelled")
		return nil
	}

	fmt.Println("\nApplying weight changes...")
	updateResults := kubernetes.UpdateAllHTTPRoutes(routesToUpdate, weight1, weight2, maxWorkers)

	fmt.Println("\nResults:")
	var updateErrors bool
	for _, result := range updateResults {
		if result.Error != nil {
			fmt.Printf("  ✗ %s: FAILED - %v\n", result.ClusterName, result.Error)
			updateErrors = true
		} else {
			fmt.Printf("  ✓ %s: Successfully updated to weight1=%d, weight2=%d\n", result.ClusterName, result.CurrentWeight1, result.CurrentWeight2)
		}
	}

	if updateErrors {
		return fmt.Errorf("errors occurred while updating HTTPRoutes on some clusters")
	}

	fmt.Println("\n✓ All HTTPRoutes updated successfully")
	return nil
}

func runStatus() error {
	statusCmd := flag.NewFlagSet("status", flag.ExitOnError)
	serviceowner := statusCmd.String("serviceowner", "", "Optional: specific serviceowner ID (e.g., ttd, brg, skd)")
	useCache := statusCmd.Bool("use-cache", false, "Use cached data without refreshing from Azure")
	statusCmd.BoolVar(useCache, "uc", false, "Use cached data without refreshing from Azure (shorthand)")

	statusCmd.Parse(os.Args[2:])

	args := statusCmd.Args()
	if len(args) != 3 {
		return fmt.Errorf("usage: runtime-health status [flags] <environment> <resource-type> <namespace/name>\n\n" +
			"Arguments:\n" +
			"  environment     at22, tt02, or prod\n" +
			"  resource-type   hr (helmrelease) or ks (kustomization) or dep (deployment)\n" +
			"  namespace/name  Resource location (e.g., default/my-app)\n\n" +
			"Flags:\n" +
			"  -serviceowner string\n" +
			"                  Optional: specific serviceowner ID (e.g., ttd, brg, skd)\n" +
			"  -use-cache, -uc\n" +
			"                  Use cached data without refreshing from Azure")
	}

	environment := args[0]
	resourceTypeStr := args[1]
	namespaceAndName := args[2]

	if environment != "at22" && environment != "at24" && environment != "tt02" && environment != "prod" {
		return fmt.Errorf("invalid environment: %s (expected: at22, tt02, or prod)", environment)
	}

	resourceType, err := kubernetes.ParseResourceType(resourceTypeStr)
	if err != nil {
		return err
	}

	namespace, name, err := kubernetes.ParseNamespaceAndName(namespaceAndName)
	if err != nil {
		return err
	}

	fmt.Println("Validating prerequisites...")

	if err := azure.ValidateAzCLI(); err != nil {
		return err
	}

	if err := kubernetes.ValidateKubectl(); err != nil {
		return err
	}

	if err := azure.ValidateUserLogin(); err != nil {
		return err
	}

	fmt.Printf("Discovering AKS clusters for environment: %s", environment)
	if *serviceowner != "" {
		fmt.Printf(" (serviceowner: %s)", *serviceowner)
	}
	fmt.Println()

	clusters, err := azure.GetClusters(environment, *serviceowner, *useCache)
	if err != nil {
		return err
	}

	fmt.Printf("Found %d cluster(s)\n", len(clusters))

	fmt.Println("Ensuring cluster credentials...")
	if err := azure.EnsureAllCredentials(clusters); err != nil {
		return err
	}

	clusterNames := make([]string, len(clusters))
	for i, cluster := range clusters {
		clusterNames[i] = cluster.Name
	}

	fmt.Printf("Querying %s %s/%s across %d cluster(s)...\n",
		resourceType, namespace, name, len(clusters))

	maxWorkers := 16
	results := kubernetes.QueryAllClusters(clusterNames, resourceType, namespace, name, maxWorkers)

	fmt.Println()
	output.PrintResults(os.Stdout, results)

	return nil
}

// ExecResult represents the result of executing a command on a cluster
type ExecResult struct {
	ClusterName string
	ExitCode    int
	Stdout      string
	Stderr      string
	Error       error
}

// getContextFlag returns the context flag name for a given command
func getContextFlag(command string) (string, error) {
	contextFlags := map[string]string{
		"kubectl": "--context",
		"flux":    "--context",
		"helm":    "--kube-context",
	}

	if flag, ok := contextFlags[command]; ok {
		return flag, nil
	}

	return "", fmt.Errorf("unsupported command: %s (supported: kubectl, flux, helm)", command)
}

func runExec() error {
	execCmd := flag.NewFlagSet("exec", flag.ExitOnError)
	serviceowner := execCmd.String("serviceowner", "", "Optional: specific serviceowner ID (e.g., ttd, brg, skd)")
	useCache := execCmd.Bool("use-cache", false, "Use cached data without refreshing from Azure")
	execCmd.BoolVar(useCache, "uc", false, "Use cached data without refreshing from Azure (shorthand)")
	dryRun := execCmd.Bool("dry-run", false, "Show what would be executed without running")

	execCmd.Parse(os.Args[2:])
	args := execCmd.Args()

	if len(args) < 2 {
		return fmt.Errorf("usage: runtime-health exec [flags] <environment> <command> [args...]\n\n" +
			"Arguments:\n" +
			"  environment     at22, at24, tt02, or prod\n" +
			"  command         kubectl, flux, or helm\n" +
			"  args...         Arguments to pass to the command\n\n" +
			"Flags:\n" +
			"  -serviceowner string\n" +
			"                  Optional: specific serviceowner ID (e.g., ttd, brg, skd)\n" +
			"  -use-cache, -uc\n" +
			"                  Use cached data without refreshing from Azure\n" +
			"  -dry-run\n" +
			"                  Show what would be executed without running\n\n" +
			"Examples:\n" +
			"  runtime-health exec tt02 kubectl get pods -n default\n" +
			"  runtime-health exec prod flux get kustomizations -A\n" +
			"  runtime-health exec -serviceowner ttd at22 helm list -A")
	}

	environment := args[0]
	command := args[1]
	commandArgs := args[2:]

	// Validate environment
	if environment != "at22" && environment != "at24" && environment != "tt02" && environment != "prod" {
		return fmt.Errorf("invalid environment: %s (expected: at22, at24, tt02, or prod)", environment)
	}

	// Validate command and get context flag
	contextFlag, err := getContextFlag(command)
	if err != nil {
		return err
	}

	// Validate that the command binary exists
	if _, err := exec.LookPath(command); err != nil {
		return fmt.Errorf("command not found: %s (please ensure %s is installed and in PATH)", command, command)
	}

	fmt.Println("Validating prerequisites...")

	if err := azure.ValidateAzCLI(); err != nil {
		return err
	}

	if err := kubernetes.ValidateKubectl(); err != nil {
		return err
	}

	if err := azure.ValidateUserLogin(); err != nil {
		return err
	}

	fmt.Printf("Discovering AKS clusters for environment: %s", environment)
	if *serviceowner != "" {
		fmt.Printf(" (serviceowner: %s)", *serviceowner)
	}
	fmt.Println()

	clusters, err := azure.GetClusters(environment, *serviceowner, *useCache)
	if err != nil {
		return err
	}

	fmt.Printf("Found %d cluster(s)\n", len(clusters))

	if len(clusters) == 0 {
		return fmt.Errorf("no clusters found")
	}

	fmt.Println("Ensuring cluster credentials...")
	if err := azure.EnsureAllCredentials(clusters); err != nil {
		return err
	}

	clusterNames := make([]string, len(clusters))
	for i, cluster := range clusters {
		clusterNames[i] = cluster.Name
	}

	// Build the base command for display
	baseCommand := command
	if len(commandArgs) > 0 {
		baseCommand = command + " " + strings.Join(commandArgs, " ")
	}

	// Show confirmation prompt
	fmt.Printf("\nCommand to execute: %s\n", baseCommand)
	fmt.Printf("Clusters (%d):\n", len(clusterNames))
	for _, name := range clusterNames {
		fmt.Printf("  - %s\n", name)
	}
	fmt.Printf("\nExample (first cluster):\n")
	exampleCmd := append([]string{command}, commandArgs...)
	exampleCmd = append(exampleCmd, contextFlag, clusterNames[0])
	fmt.Printf("  %s\n", strings.Join(exampleCmd, " "))

	if *dryRun {
		fmt.Println("\nDry-run mode: No commands will be executed")
		return nil
	}

	fmt.Println()
	confirmed, err := azure.PromptConfirmation(fmt.Sprintf("Execute this command on all %d clusters?", len(clusterNames)))
	if err != nil {
		return err
	}

	if !confirmed {
		fmt.Println("Operation cancelled")
		return nil
	}

	fmt.Printf("\nExecuting command on %d cluster(s)...\n", len(clusterNames))

	// Execute commands in parallel using worker pool
	maxWorkers := 16
	if len(clusterNames) < maxWorkers {
		maxWorkers = len(clusterNames)
	}

	jobs := make(chan string, len(clusterNames))
	results := make(chan ExecResult, len(clusterNames))

	var wg sync.WaitGroup

	// Start workers
	for w := 0; w < maxWorkers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for clusterName := range jobs {
				result := executeCommand(command, commandArgs, contextFlag, clusterName)
				results <- result
			}
		}()
	}

	// Send jobs
	for _, clusterName := range clusterNames {
		jobs <- clusterName
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

	// Display summary table
	fmt.Println("\nResults:")
	fmt.Println(strings.Repeat("-", 80))
	fmt.Printf("%-40s %-10s %-10s %s\n", "CLUSTER", "STATUS", "EXIT CODE", "ERROR")
	fmt.Println(strings.Repeat("-", 80))

	var successCount, failureCount int
	var failedResults []ExecResult

	for _, result := range allResults {
		if result.Error != nil || result.ExitCode != 0 {
			failureCount++
			failedResults = append(failedResults, result)
			errMsg := ""
			if result.Error != nil {
				errMsg = result.Error.Error()
			} else if result.Stderr != "" {
				// Truncate stderr for table display
				errMsg = strings.Split(result.Stderr, "\n")[0]
				if len(errMsg) > 40 {
					errMsg = errMsg[:37] + "..."
				}
			}
			fmt.Printf("%-40s %-10s %-10d %s\n", result.ClusterName, "✗ FAILED", result.ExitCode, errMsg)
		} else {
			successCount++
			fmt.Printf("%-40s %-10s %-10d\n", result.ClusterName, "✓ SUCCESS", result.ExitCode)
		}
	}

	fmt.Println(strings.Repeat("-", 80))
	fmt.Printf("Summary: %d succeeded, %d failed\n", successCount, failureCount)

	// Show detailed output for failed clusters
	if len(failedResults) > 0 {
		fmt.Println("\n--- Detailed output for failed clusters ---")
		for _, result := range failedResults {
			fmt.Printf("\n[%s] Exit code: %d\n", result.ClusterName, result.ExitCode)
			if result.Error != nil {
				fmt.Printf("Error: %v\n", result.Error)
			}
			if result.Stderr != "" {
				fmt.Printf("Stderr:\n%s\n", result.Stderr)
			}
			if result.Stdout != "" {
				fmt.Printf("Stdout:\n%s\n", result.Stdout)
			}
		}
	}

	if failureCount > 0 {
		return fmt.Errorf("command failed on %d/%d clusters", failureCount, len(clusterNames))
	}

	fmt.Println("\n✓ Command executed successfully on all clusters")
	return nil
}

// executeCommand executes a command on a specific cluster
func executeCommand(command string, args []string, contextFlag string, clusterName string) ExecResult {
	// Build the full command with context
	cmdArgs := append(args, contextFlag, clusterName)

	cmd := exec.Command(command, cmdArgs...)

	stdout, err := cmd.Output()
	var stderr []byte
	var exitCode int

	if err != nil {
		// Try to get exit code and stderr
		if exitErr, ok := err.(*exec.ExitError); ok {
			stderr = exitErr.Stderr
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
		Stderr:      string(stderr),
		Error:       nil,
	}
}
