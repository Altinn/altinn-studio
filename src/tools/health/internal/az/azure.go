package az

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os/exec"
)

var errClusterMissingSubscriptionID = errors.New("cluster has no subscription ID")
var errInvalidDiscoveryResponse = errors.New("invalid Resource Graph response")

type Cluster struct {
	Name           string `json:"name"`
	ResourceGroup  string `json:"resourceGroup"`
	Location       string `json:"location"`
	SubscriptionID string `json:"subscriptionId"`
}

//nolint:tagliatelle // Azure CLI emits snake_case keys, unlike the Resource Graph REST API.
type resourceGraphResponse struct {
	TotalRecords *int      `json:"total_records"`
	SkipToken    string    `json:"skip_token"`
	Data         []Cluster `json:"data"`
	Count        int       `json:"count"`
}

// ListClusters queries AKS clusters across accessible subscriptions using Azure Resource Graph.
func ListClusters() ([]Cluster, error) {
	query := "resources | where type =~ 'microsoft.containerservice/managedclusters' | project id, name, resourceGroup, location, subscriptionId"

	var allClusters []Cluster
	var skipToken string
	seenTokens := make(map[string]bool)
	pageNum := 0

	for {
		pageNum++

		args := make([]string, 0, 7)
		args = append(args, "graph", "query", "-q", query, "--first", "1000", "-o", "json")
		if skipToken != "" {
			args = append(args, "--skip-token", skipToken)
		}

		//nolint:gosec // The executable is fixed to az; only its arguments vary.
		cmd := exec.CommandContext(context.Background(), "az", args...)
		output, err := cmd.CombinedOutput()
		if err != nil {
			return nil, fmt.Errorf(
				"failed to query AKS clusters via Resource Graph (page %d): %w (output: %s)",
				pageNum,
				err,
				string(output),
			)
		}

		var response resourceGraphResponse
		if err := json.Unmarshal(output, &response); err != nil {
			return nil, fmt.Errorf("failed to parse Resource Graph response (page %d): %w", pageNum, err)
		}
		if err := response.validate(); err != nil {
			return nil, fmt.Errorf("resource graph page %d: %w", pageNum, err)
		}
		allClusters = append(allClusters, response.Data...)

		if response.SkipToken == "" {
			if len(allClusters) != *response.TotalRecords {
				return nil, fmt.Errorf(
					"%w: discovered %d of %d clusters",
					errInvalidDiscoveryResponse,
					len(allClusters),
					*response.TotalRecords,
				)
			}
			break
		}
		if seenTokens[response.SkipToken] {
			return nil, fmt.Errorf("%w: repeated continuation token", errInvalidDiscoveryResponse)
		}
		seenTokens[response.SkipToken] = true
		skipToken = response.SkipToken
	}

	return allClusters, nil
}

func (r *resourceGraphResponse) validate() error {
	if r.Data == nil || r.TotalRecords == nil || r.Count != len(r.Data) {
		return fmt.Errorf("%w: missing data or inconsistent count", errInvalidDiscoveryResponse)
	}
	for _, cluster := range r.Data {
		if cluster.Name == "" || cluster.ResourceGroup == "" || cluster.SubscriptionID == "" {
			return fmt.Errorf("%w: missing cluster identity", errInvalidDiscoveryResponse)
		}
	}
	return nil
}

// EnsureCredentials ensures credentials are available for the cluster
// This must be called sequentially, not in parallel, as it mutates kube config.
func EnsureCredentials(cluster *Cluster, kubeconfigPath string) error {
	if cluster.SubscriptionID == "" {
		return fmt.Errorf("%w: %s", errClusterMissingSubscriptionID, cluster.Name)
	}
	args := []string{
		"aks", "get-credentials",
		"--resource-group", cluster.ResourceGroup,
		"--name", cluster.Name,
		"--overwrite-existing",
		"--file", kubeconfigPath,
		"--subscription", cluster.SubscriptionID,
	}

	//nolint:gosec // The executable is fixed to az; only its arguments vary.
	cmd := exec.CommandContext(context.Background(), "az", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to get credentials for cluster %s: %w (output: %s)",
			cluster.Name, err, string(output))
	}

	return nil
}
