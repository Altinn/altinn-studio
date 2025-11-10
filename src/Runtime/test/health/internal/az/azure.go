package az

import (
	"encoding/json"
	"fmt"
	"os/exec"
)

type Cluster struct {
	Name           string `json:"name"`
	ResourceGroup  string `json:"resourceGroup"`
	Location       string `json:"location"`
	SubscriptionID string `json:"subscriptionId,omitempty"` // Not from Azure API, added by us
}

type resourceGraphResponse struct {
	Data      []Cluster `json:"data"`
	SkipToken string    `json:"$skipToken,omitempty"`
	Count     int       `json:"count"`
}

// ListContainerRuntimes queries all AKS clusters across all subscriptions using Azure Resource Graph
// This is much faster than ListAllClusters as it uses a single query instead of one per subscription
func ListClusters() ([]Cluster, error) {
	query := "resources | where type =~ 'microsoft.containerservice/managedclusters' | project name, resourceGroup, location, subscriptionId"

	var allClusters []Cluster
	var skipToken string
	pageNum := 0 // Create a map for quick environment lookup

	for {
		pageNum++

		args := []string{"graph", "query", "-q", query, "--first", "1000", "-o", "json"}
		if skipToken != "" {
			args = append(args, "--skip-token", skipToken)
		}

		cmd := exec.Command("az", args...)
		output, err := cmd.CombinedOutput()
		if err != nil {
			return nil, fmt.Errorf("failed to query AKS clusters via Resource Graph (page %d): %w (output: %s)", pageNum, err, string(output))
		}

		var response resourceGraphResponse
		if err := json.Unmarshal(output, &response); err != nil {
			return nil, fmt.Errorf("failed to parse Resource Graph response (page %d): %w", pageNum, err)
		}

		allClusters = append(allClusters, response.Data...)

		if response.SkipToken == "" {
			break
		}
		skipToken = response.SkipToken
	}

	return allClusters, nil
}

// EnsureCredentials ensures credentials are available for the cluster
// This must be called sequentially, not in parallel, as it mutates kube config
func EnsureCredentials(cluster *Cluster) error {
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
