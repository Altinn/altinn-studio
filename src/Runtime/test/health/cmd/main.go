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
	default:
		return fmt.Errorf("unknown command: %s\n\nAvailable commands:\n  status\tCheck status of resources across clusters", command)
	}
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
			"  resource-type   hr (helmrelease) or ks (kustomization)\n" +
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

	if environment != "at22" && environment != "tt02" && environment != "prod" {
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
