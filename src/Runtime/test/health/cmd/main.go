package main

import (
	"flag"
	"fmt"
	"os"

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

func run() error {
	if len(os.Args) < 2 {
		return fmt.Errorf("usage: runtime-health <command> [arguments]\n\nAvailable commands:\n  status\tCheck status of resources across clusters")
	}

	command := os.Args[1]

	switch command {
	case "status":
		return runStatus()
	case "set-weight":
		return runSetWeight()
	default:
		return fmt.Errorf("unknown command: %s\n\nAvailable commands:\n  status\tCheck status of resources across clusters", command)
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
