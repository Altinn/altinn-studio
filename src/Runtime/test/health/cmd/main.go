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
	return `usage: go run cmd/main.go <command> [arguments]

Available commands:
  help            Print CLI usage
  init            Discover clusters and configure credentials
  status          Check status of resources across clusters
  set-weight      Update HTTPRoute weights
  exec            Execute kubectl/helm/flux commands across clusters

Examples:
  # Discover clusters and fetch credentials (single or multiple environments)
  go run cmd/main.go init tt02
  go run cmd/main.go init at22,at24
  go run cmd/main.go init -s ttd tt02,prod

  # Check resource status
  go run cmd/main.go status tt02 hr traefik/altinn-traefik
  go run cmd/main.go status tt02 ks runtime-pdf3/pdf3-app
  go run cmd/main.go status at22,at24 dep runtime-pdf3/pdf3-proxy
  go run cmd/main.go status -s ttd tt02,prod ks runtime-pdf3/pdf3-app

  # Update HTTPRoute weights
  go run cmd/main.go set-weight tt02 pdf/pdf3-migration 50 50
  go run cmd/main.go set-weight at22,at24 pdf/pdf3-migration 0 100
  go run cmd/main.go set-weight --dry-run tt02,prod pdf/pdf3-migration 0 100

  # Execute commands across clusters
  go run cmd/main.go exec tt02 kubectl get pods -n default
  go run cmd/main.go exec at22,at24 flux get kustomizations -A
  go run cmd/main.go exec -s ttd prod,tt02 helm list -A

Run 'go run cmd/main.go <command> -h' for more information on a specific command.`
}

func run() error {
	if len(os.Args) < 2 {
		return fmt.Errorf(printUsage())
	}

	command := os.Args[1]

	switch command {
	case "help":
		fmt.Println(printUsage())
		os.Exit(0)
		return nil
	case "init":
		return runInit()
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

func validateEnvironments(environmentsStr string) ([]string, error) {
	validEnvs := map[string]bool{
		"at22": true,
		"at23": true,
		"at24": true,
		"yt01": true,
		"tt02": true,
		"prod": true,
	}

	environments := strings.Split(environmentsStr, ",")
	var validated []string

	for _, env := range environments {
		env = strings.TrimSpace(env)
		if env == "" {
			continue
		}
		if !validEnvs[env] {
			return nil, fmt.Errorf("invalid environment: %s (expected: at22, at23, at24, yt01, tt02, prod)", env)
		}
		validated = append(validated, env)
	}

	if len(validated) == 0 {
		return nil, fmt.Errorf("no valid environments provided")
	}

	return validated, nil
}

func runSetWeight() error {
	setWeightCmd := flag.NewFlagSet("set-weight", flag.ExitOnError)
	serviceowner := setWeightCmd.String("service-owner", "", "Optional: specific serviceowner ID (e.g., ttd, brg, skd)")
	setWeightCmd.StringVar(serviceowner, "s", "", "Optional: specific serviceowner ID (shorthand)")
	dryRun := setWeightCmd.Bool("dry-run", false, "Show what would change without applying")

	setWeightCmd.Parse(os.Args[2:])
	args := setWeightCmd.Args()

	if len(args) != 4 {
		return fmt.Errorf("usage: go run cmd/main.go set-weight [flags] <environments> <namespace/name> <weight1> <weight2>\n\n" +
			"Arguments:\n" +
			"  environments    Comma-separated list: at22, at23, at24, yt01, tt02, prod (e.g., tt02 or at22,at24)\n" +
			"  namespace/name  HTTPRoute location (e.g., pdf/pdf3-migration)\n" +
			"  weight1         Weight for first backendRef (0-100)\n" +
			"  weight2         Weight for second backendRef (0-100)\n\n" +
			"Flags:\n" +
			"  -s, --service-owner string\n" +
			"                  Optional: specific serviceowner ID (e.g., ttd, brg, skd)\n" +
			"  --dry-run\n" +
			"                  Show what would change without applying")
	}

	environments, err := validateEnvironments(args[0])
	if err != nil {
		return err
	}

	namespaceAndName := args[1]
	namespace, name, err := kubernetes.ParseNamespaceAndName(namespaceAndName)
	if err != nil {
		return err
	}

	// Parse and validate weights
	var weight1, weight2 int
	if _, err := fmt.Sscanf(args[2], "%d", &weight1); err != nil {
		return fmt.Errorf("invalid weight1: %s (must be an integer)", args[2])
	}
	if _, err := fmt.Sscanf(args[3], "%d", &weight2); err != nil {
		return fmt.Errorf("invalid weight2: %s (must be an integer)", args[3])
	}

	if weight1 < 0 || weight2 < 0 {
		return fmt.Errorf("weights must be non-negative integers (got weight1=%d, weight2=%d)", weight1, weight2)
	}

	if weight1+weight2 != 100 {
		return fmt.Errorf("weights must sum to 100 (got weight1=%d + weight2=%d = %d)", weight1, weight2, weight1+weight2)
	}

	fmt.Println("Validating prerequisites...")

	if err := kubernetes.ValidateKubectl(); err != nil {
		return err
	}

	envStr := strings.Join(environments, ", ")
	fmt.Printf("Finding clusters for environment(s): %s", envStr)
	if *serviceowner != "" {
		fmt.Printf(" (serviceowner: %s)", *serviceowner)
	}
	fmt.Println()

	// Get all kubectl contexts and filter by environments and serviceowner
	contexts, err := kubernetes.GetAllContextDetails()
	if err != nil {
		return err
	}

	clusterNames := kubernetes.FilterContextsByEnvironment(contexts, environments, *serviceowner)

	if len(clusterNames) == 0 {
		return fmt.Errorf("no matching clusters found\n\n"+
			"Run 'go run cmd/main.go init %s%s' to discover and configure clusters",
			args[0],
			func() string {
				if *serviceowner != "" {
					return fmt.Sprintf(" -s %s", *serviceowner)
				}
				return ""
			}())
	}

	fmt.Printf("Found %d cluster(s)\n", len(clusterNames))

	fmt.Printf("Fetching current HTTPRoute %s/%s from %d cluster(s)...\n", namespace, name, len(clusterNames))

	maxWorkers := 16
	results := kubernetes.GetAllHTTPRoutes(clusterNames, namespace, name, maxWorkers)

	// Check for errors and identify clusters that need changes, grouped by environment
	var routesToUpdate []kubernetes.HTTPRouteResult
	for i, environment := range environments {
		if i > 0 {
			fmt.Println()
		}

		// Filter results for this environment
		var envResults []kubernetes.HTTPRouteResult
		for _, result := range results {
			if strings.HasSuffix(result.ClusterName, "-"+environment+"-aks") {
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
					fmt.Printf("  → %s: weight1=%d, weight2=%d (will change)\n", result.ClusterName, result.CurrentWeight1, result.CurrentWeight2)
					routesToUpdate = append(routesToUpdate, result)
				} else {
					fmt.Printf("  ✓ %s: weight1=%d, weight2=%d (already correct)\n", result.ClusterName, result.CurrentWeight1, result.CurrentWeight2)
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

	// Group results by environment
	fmt.Println("\nResults:")
	var updateErrors bool
	for i, environment := range environments {
		if i > 0 {
			fmt.Println()
		}

		// Filter results for this environment
		var envResults []kubernetes.HTTPRouteResult
		for _, result := range updateResults {
			if strings.HasSuffix(result.ClusterName, "-"+environment+"-aks") {
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
				fmt.Printf("  ✓ %s: Successfully updated to weight1=%d, weight2=%d\n", result.ClusterName, result.CurrentWeight1, result.CurrentWeight2)
			}
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
	serviceowner := statusCmd.String("service-owner", "", "Optional: specific serviceowner ID (e.g., ttd, brg, skd)")
	statusCmd.StringVar(serviceowner, "s", "", "Optional: specific serviceowner ID (shorthand)")

	statusCmd.Parse(os.Args[2:])

	args := statusCmd.Args()
	if len(args) != 3 {
		return fmt.Errorf("usage: go run cmd/main.go status [flags] <environments> <resource-type> <namespace/name>\n\n" +
			"Arguments:\n" +
			"  environments    Comma-separated list: at22, at23, at24, yt01, tt02, prod (e.g., tt02 or at22,at24)\n" +
			"  resource-type   hr (helmrelease) or ks (kustomization) or dep (deployment)\n" +
			"  namespace/name  Resource location (e.g., default/my-app)\n\n" +
			"Flags:\n" +
			"  -s, --service-owner string\n" +
			"                  Optional: specific serviceowner ID (e.g., ttd, brg, skd)")
	}

	environments, err := validateEnvironments(args[0])
	if err != nil {
		return err
	}

	resourceTypeStr := args[1]
	namespaceAndName := args[2]

	resourceType, err := kubernetes.ParseResourceType(resourceTypeStr)
	if err != nil {
		return err
	}

	namespace, name, err := kubernetes.ParseNamespaceAndName(namespaceAndName)
	if err != nil {
		return err
	}

	fmt.Println("Validating prerequisites...")

	if err := kubernetes.ValidateKubectl(); err != nil {
		return err
	}

	envStr := strings.Join(environments, ", ")
	fmt.Printf("Finding clusters for environment(s): %s", envStr)
	if *serviceowner != "" {
		fmt.Printf(" (serviceowner: %s)", *serviceowner)
	}
	fmt.Println()

	// Get all kubectl contexts and filter by environments and serviceowner
	contexts, err := kubernetes.GetAllContextDetails()
	if err != nil {
		return err
	}

	clusterNames := kubernetes.FilterContextsByEnvironment(contexts, environments, *serviceowner)

	if len(clusterNames) == 0 {
		return fmt.Errorf("no matching clusters found\n\n"+
			"Run 'go run cmd/main.go init %s%s' to discover and configure clusters",
			args[0],
			func() string {
				if *serviceowner != "" {
					return fmt.Sprintf(" -s %s", *serviceowner)
				}
				return ""
			}())
	}

	fmt.Printf("Found %d cluster(s)\n", len(clusterNames))

	fmt.Printf("Querying %s %s/%s across %d cluster(s)...\n",
		resourceType, namespace, name, len(clusterNames))

	maxWorkers := 16
	results := kubernetes.QueryAllClusters(clusterNames, resourceType, namespace, name, maxWorkers)

	// Group results by environment
	fmt.Println()
	for i, environment := range environments {
		if i > 0 {
			fmt.Println()
		}

		// Filter results for this environment
		var envResults []kubernetes.QueryResult
		for _, result := range results {
			// Check if cluster name ends with -<environment>-aks
			if strings.HasSuffix(result.ClusterName, "-"+environment+"-aks") {
				envResults = append(envResults, result)
			}
		}

		if len(envResults) > 0 {
			fmt.Printf("=== Environment: %s ===\n", environment)
			output.PrintResults(os.Stdout, envResults)
		}
	}

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
	serviceowner := execCmd.String("service-owner", "", "Optional: specific serviceowner ID (e.g., ttd, brg, skd)")
	execCmd.StringVar(serviceowner, "s", "", "Optional: specific serviceowner ID (shorthand)")
	dryRun := execCmd.Bool("dry-run", false, "Show what would be executed without running")

	execCmd.Parse(os.Args[2:])
	args := execCmd.Args()

	if len(args) < 2 {
		return fmt.Errorf("usage: go run cmd/main.go exec [flags] <environments> <command> [args...]\n\n" +
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
	if _, err := exec.LookPath(command); err != nil {
		return fmt.Errorf("command not found: %s (please ensure %s is installed and in PATH)", command, command)
	}

	fmt.Println("Validating prerequisites...")

	if err := kubernetes.ValidateKubectl(); err != nil {
		return err
	}

	envStr := strings.Join(environments, ", ")
	fmt.Printf("Finding clusters for environment(s): %s", envStr)
	if *serviceowner != "" {
		fmt.Printf(" (serviceowner: %s)", *serviceowner)
	}
	fmt.Println()

	// Get all kubectl contexts and filter by environments and serviceowner
	contexts, err := kubernetes.GetAllContextDetails()
	if err != nil {
		return err
	}

	clusterNames := kubernetes.FilterContextsByEnvironment(contexts, environments, *serviceowner)

	if len(clusterNames) == 0 {
		return fmt.Errorf("no matching clusters found\n\n"+
			"Run 'go run cmd/main.go init %s%s' to discover and configure clusters",
			args[0],
			func() string {
				if *serviceowner != "" {
					return fmt.Sprintf(" -s %s", *serviceowner)
				}
				return ""
			}())
	}

	fmt.Printf("Found %d cluster(s)\n", len(clusterNames))

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
	maxWorkers := min(16, len(clusterNames))

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

	// Group results by environment
	fmt.Println("\nResults:")
	var totalSuccessCount, totalFailureCount int
	var allFailedResults []ExecResult

	for i, environment := range environments {
		if i > 0 {
			fmt.Println()
		}

		// Filter results for this environment
		var envResults []ExecResult
		for _, result := range allResults {
			if strings.HasSuffix(result.ClusterName, "-"+environment+"-aks") {
				envResults = append(envResults, result)
			}
		}

		if len(envResults) == 0 {
			continue
		}

		fmt.Printf("=== Environment: %s ===\n", environment)
		fmt.Println(strings.Repeat("-", 80))
		fmt.Printf("%-40s %-10s %-10s %s\n", "CLUSTER", "STATUS", "EXIT CODE", "ERROR")
		fmt.Println(strings.Repeat("-", 80))

		var successCount, failureCount int
		var failedResults []ExecResult

		for _, result := range envResults {
			if result.Error != nil || result.ExitCode != 0 {
				failureCount++
				failedResults = append(failedResults, result)
				allFailedResults = append(allFailedResults, result)
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

		totalSuccessCount += successCount
		totalFailureCount += failureCount
	}

	// Show detailed output for failed clusters
	if len(allFailedResults) > 0 {
		fmt.Println("\n--- Detailed output for failed clusters ---")
		for _, result := range allFailedResults {
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

	if totalFailureCount > 0 {
		return fmt.Errorf("command failed on %d/%d clusters", totalFailureCount, len(clusterNames))
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

func runInit() error {
	initCmd := flag.NewFlagSet("init", flag.ExitOnError)
	serviceowner := initCmd.String("service-owner", "", "Optional: specific serviceowner ID (e.g., ttd, brg, skd)")
	initCmd.StringVar(serviceowner, "s", "", "Optional: specific serviceowner ID (shorthand)")

	initCmd.Parse(os.Args[2:])
	args := initCmd.Args()

	if len(args) != 1 {
		return fmt.Errorf("usage: go run cmd/main.go init [flags] <environments>\n\n" +
			"Arguments:\n" +
			"  environments    Comma-separated list: at22, at23, at24, yt01, tt02, prod (e.g., tt02 or at22,at24)\n\n" +
			"Flags:\n" +
			"  -s, --service-owner string\n" +
			"                  Optional: specific serviceowner ID (e.g., ttd, brg, skd)\n\n" +
			"Description:\n" +
			"  Discovers AKS clusters for the specified environment(s) and ensures\n" +
			"  kubectl credentials are configured. Maintains a cache of discovered\n" +
			"  clusters in .cache/clusters.json")
	}

	environments, err := validateEnvironments(args[0])
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

	// Get all kubectl contexts once
	fmt.Println("Checking kubectl contexts...")
	contexts, err := azure.GetAllContexts()
	if err != nil {
		return err
	}

	// Query Azure once for all clusters
	fmt.Println("Querying all AKS clusters via Azure Resource Graph...")
	allAzureClusters, err := azure.ListAllClustersViaResourceGraph()
	if err != nil {
		return err
	}

	// Process each environment separately with separate prompts
	var allDiscoveredClusters []azure.Cluster
	totalNewClusters := 0
	totalCredentialsFetched := 0

	for i, environment := range environments {
		if i > 0 {
			fmt.Println()
		}

		fmt.Printf("=== Environment: %s ===\n", environment)
		if *serviceowner != "" {
			fmt.Printf("Service owner filter: %s\n", *serviceowner)
		}

		// Filter by this environment (FilterClusters already excludes "studio" clusters)
		envClusters := azure.FilterClusters(allAzureClusters, []string{environment}, *serviceowner)

		if len(envClusters) == 0 {
			fmt.Println("No clusters found matching the specified criteria")
			continue
		}

		fmt.Printf("Found %d cluster(s) in Azure\n", len(envClusters))

		// Categorize clusters
		var existingContexts []string
		var missingClusters []azure.Cluster

		for _, cluster := range envClusters {
			if azure.CheckContextExists(cluster.Name, contexts) {
				existingContexts = append(existingContexts, cluster.Name)
			} else {
				missingClusters = append(missingClusters, cluster)
			}
		}

		// Display status
		fmt.Println("\nCluster status:")
		for _, name := range existingContexts {
			fmt.Printf("  ✓ %s (credentials already configured)\n", name)
		}
		for _, cluster := range missingClusters {
			fmt.Printf("  → %s (needs credentials)\n", cluster.Name)
		}

		// Fetch missing credentials if needed
		if len(missingClusters) > 0 {
			fmt.Printf("\n%d cluster(s) need credentials\n", len(missingClusters))
			confirmed, err := azure.PromptConfirmation(fmt.Sprintf("Fetch credentials for %s clusters?", environment))
			if err != nil {
				return err
			}

			if confirmed {
				fmt.Println("\nFetching credentials...")
				for _, cluster := range missingClusters {
					fmt.Printf("  Fetching credentials for %s...\n", cluster.Name)
					if err := azure.EnsureCredentials(cluster); err != nil {
						fmt.Printf("  ✗ Failed: %v\n", err)
						return fmt.Errorf("failed to fetch credentials for %s: %w", cluster.Name, err)
					}
					fmt.Printf("  ✓ Success\n")
					totalCredentialsFetched++
				}
			} else {
				fmt.Println("Skipped credential fetching")
			}
		} else {
			fmt.Println("\nAll clusters already have configured credentials")
		}

		allDiscoveredClusters = append(allDiscoveredClusters, envClusters...)
		totalNewClusters += len(envClusters)
	}

	// Save all discovered clusters to merged cache
	if len(allDiscoveredClusters) > 0 {
		fmt.Println("\n=== Updating cache ===")
		if err := azure.SaveClustersToCache(allDiscoveredClusters); err != nil {
			return fmt.Errorf("failed to save cache: %w", err)
		}
		fmt.Println("Cache updated successfully")
	}

	// Display summary
	fmt.Println("\n=== Summary ===")
	fmt.Printf("  Environments processed: %s\n", strings.Join(environments, ", "))
	fmt.Printf("  Total clusters discovered: %d\n", totalNewClusters)
	if totalCredentialsFetched > 0 {
		fmt.Printf("  Credentials fetched: %d\n", totalCredentialsFetched)
	}
	fmt.Printf("  Cache file: .cache/clusters.json\n")

	fmt.Println("\n✓ Initialization complete")
	return nil
}
