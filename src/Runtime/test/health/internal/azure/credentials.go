package azure

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// GetAllContexts retrieves all kubectl context names
func GetAllContexts() ([]string, error) {
	cmd := exec.Command("kubectl", "config", "get-contexts", "-o", "name")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to get kubectl contexts: %w (output: %s)", err, string(output))
	}

	outputStr := strings.TrimSpace(string(output))
	if outputStr == "" {
		return []string{}, nil
	}

	contexts := strings.Split(outputStr, "\n")
	return contexts, nil
}

// CheckContextExists checks if a kubectl context exists in the provided list
func CheckContextExists(clusterName string, contexts []string) bool {
	for _, context := range contexts {
		if context == clusterName {
			return true
		}
	}
	return false
}

// EnsureCredentials ensures credentials are available for the cluster
// This must be called sequentially, not in parallel, as it mutates kube config
func EnsureCredentials(cluster Cluster) error {
	args := []string{
		"aks", "get-credentials",
		"--resource-group", cluster.ResourceGroup,
		"--name", cluster.Name,
		"--overwrite-existing",
	}

	if cluster.SubscriptionID == "" {
		return fmt.Errorf("cluster has no subscription ID: %s", cluster.Name)
	}
	args = append(args, "--subscription", cluster.SubscriptionID)

	cmd := exec.Command("az", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to get credentials for cluster %s: %w (output: %s)",
			cluster.Name, err, string(output))
	}

	return nil
}

// PromptConfirmation prompts the user for confirmation
func PromptConfirmation(message string) (bool, error) {
	fmt.Printf("%s [Y/n]: ", message)

	reader := bufio.NewReader(os.Stdin)
	response, err := reader.ReadString('\n')
	if err != nil {
		return false, fmt.Errorf("failed to read user input: %w", err)
	}

	response = strings.ToLower(strings.TrimSpace(response))

	if response == "" || response == "y" || response == "yes" {
		return true, nil
	}

	return false, nil
}

// EnsureAllCredentials ensures credentials for all clusters sequentially
// Prompts the user for confirmation before proceeding
func EnsureAllCredentials(clusters []Cluster) error {
	if len(clusters) == 0 {
		return nil
	}

	fmt.Println("\nChecking existing kubectl contexts...")
	existingContexts, err := GetAllContexts()
	if err != nil {
		return err
	}

	var missingClusters []Cluster
	var existingClusters []Cluster

	for _, cluster := range clusters {
		if CheckContextExists(cluster.Name, existingContexts) {
			existingClusters = append(existingClusters, cluster)
		} else {
			missingClusters = append(missingClusters, cluster)
		}
	}

	if len(existingClusters) > 0 {
		fmt.Printf("\n✓ Found %d existing context(s):\n", len(existingClusters))
	}

	if len(missingClusters) == 0 {
		fmt.Println("\n✓ All cluster credentials are already available")
		return nil
	}

	fmt.Printf("\nThe following %d cluster(s) need credentials:\n", len(missingClusters))
	for i, cluster := range missingClusters {
		fmt.Printf("  %d. %s (subscription: %s)\n", i+1, cluster.Name, cluster.SubscriptionID)
	}
	fmt.Println()

	confirmed, err := PromptConfirmation("Do you want to proceed with retrieving credentials?")
	if err != nil {
		return err
	}

	if !confirmed {
		return fmt.Errorf("credential retrieval cancelled by user")
	}

	fmt.Println("\nRetrieving credentials...")
	for i, cluster := range missingClusters {
		fmt.Printf("  [%d/%d] Getting credentials for %s...\n", i+1, len(missingClusters), cluster.Name)
		if err := EnsureCredentials(cluster); err != nil {
			return err
		}
	}

	fmt.Println("✓ All credentials retrieved successfully")
	return nil
}
