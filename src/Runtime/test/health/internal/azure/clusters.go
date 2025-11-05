package azure

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"

	"altinn.studio/runtime-health/internal/cache"
)

// Cluster represents an AKS cluster
type Cluster struct {
	Name           string `json:"name"`
	ResourceGroup  string `json:"resourceGroup"`
	Location       string `json:"location"`
	SubscriptionID string `json:"subscriptionId,omitempty"` // Not from Azure API, added by us
}

// ResourceGraphResponse represents the response from Azure Resource Graph query
type ResourceGraphResponse struct {
	Data      []Cluster `json:"data"`
	SkipToken string    `json:"$skipToken,omitempty"`
	Count     int       `json:"count"`
}

// ListAllClustersViaResourceGraph queries all AKS clusters across all subscriptions using Azure Resource Graph
// This is much faster than ListAllClusters as it uses a single query instead of one per subscription
func ListAllClustersViaResourceGraph() ([]Cluster, error) {
	query := "resources | where type =~ 'microsoft.containerservice/managedclusters' | project name, resourceGroup, location, subscriptionId"

	var allClusters []Cluster
	var skipToken string
	pageNum := 0

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

		var response ResourceGraphResponse
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

// FilterClusters filters clusters by environment and optional serviceowner
// Cluster naming pattern: <serviceowner>-<environment>-aks
// Serviceowner must be 2-8 lowercase ASCII letters
func FilterClusters(clusters []Cluster, environment string, serviceowner string) []Cluster {
	var filtered []Cluster

	for _, cluster := range clusters {
		if !strings.HasSuffix(cluster.Name, "-"+environment+"-aks") {
			continue
		}

		expectedSuffix := "-" + environment + "-aks"
		clusterServiceowner := strings.TrimSuffix(cluster.Name, expectedSuffix)

		if len(clusterServiceowner) < 2 || len(clusterServiceowner) > 8 {
			continue
		}
		validServiceowner := true
		for _, c := range clusterServiceowner {
			if c < 'a' || c > 'z' {
				validServiceowner = false
				break
			}
		}
		if !validServiceowner {
			continue
		}

		if serviceowner != "" {
			if clusterServiceowner != serviceowner {
				continue
			}
		}

		filtered = append(filtered, cluster)
	}

	return filtered
}

// GetClusters is a convenience function that lists and filters clusters with caching
func GetClusters(environment string, serviceowner string, forceUseCache bool) ([]Cluster, error) {
	var allClusters []Cluster

	cacheKey := fmt.Sprintf("clusters-%s", environment)

	if forceUseCache {
		cached, err := cache.GetStale(cacheKey, &allClusters)
		if err != nil {
			return nil, fmt.Errorf("cache error: %w", err)
		}
		if !cached {
			return nil, fmt.Errorf("no cached data available for environment: %s (use without --use-cache to fetch from Azure)", environment)
		}
		fmt.Println("Using cached cluster data")
	} else {
		cached, err := cache.Get(cacheKey, &allClusters)
		if err != nil {
			return nil, fmt.Errorf("cache error: %w", err)
		}

		if !cached {
			fmt.Println("Querying all AKS clusters via Azure Resource Graph...")
			allClusters, err = ListAllClustersViaResourceGraph()
			if err != nil {
				if isRateLimitError(err) {
					fmt.Println("WARNING: Azure rate limit exceeded, attempting to use stale cache...")

					staleFound, staleErr := cache.GetStale(cacheKey, &allClusters)
					if staleErr != nil {
						return nil, fmt.Errorf("cache error while handling rate limit: %w", staleErr)
					}
					if staleFound {
						fmt.Println("Using stale cached data due to rate limiting")
					} else {
						return nil, fmt.Errorf("rate limited and no cached data available. Please try again later or run with --use-cache if you have recent cached data")
					}
				} else {
					return nil, fmt.Errorf("failed to query clusters: %w", err)
				}
			} else {
				allClusters = FilterClusters(allClusters, environment, "")
				fmt.Printf("Found %d cluster(s) for environment %s\n", len(allClusters), environment)

				if err := cache.Set(cacheKey, allClusters); err != nil {
					fmt.Printf("Warning: failed to cache clusters: %v\n", err)
				}
			}
		}
	}

	filtered := allClusters
	if serviceowner != "" {
		filtered = FilterClusters(allClusters, environment, serviceowner)
	}

	if len(filtered) == 0 {
		if serviceowner != "" {
			return nil, fmt.Errorf("no AKS cluster found matching pattern: %s-%s-aks", serviceowner, environment)
		}
		return nil, fmt.Errorf("no AKS clusters found for environment: %s", environment)
	}

	return filtered, nil
}

// isRateLimitError checks if an error is due to Azure rate limiting
func isRateLimitError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	return strings.Contains(errStr, "RateLimiting") || strings.Contains(errStr, "throttled")
}
