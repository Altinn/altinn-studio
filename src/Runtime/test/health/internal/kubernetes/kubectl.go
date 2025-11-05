package kubernetes

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"altinn.studio/runtime-health/internal/flux"
)

// DeploymentResource represents a Kubernetes Deployment resource
type DeploymentResource struct {
	APIVersion string        `json:"apiVersion"`
	Kind       string        `json:"kind"`
	Metadata   flux.Metadata `json:"metadata"`
	Spec       struct {
		Selector struct {
			MatchLabels map[string]string `json:"matchLabels"`
		} `json:"selector"`
	} `json:"spec"`
	Status flux.Status `json:"status"`
}

// ValidateKubectl checks if kubectl is installed and available
func ValidateKubectl() error {
	cmd := exec.Command("kubectl", "version", "--client")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("kubectl not found or not working: %w", err)
	}
	return nil
}

// formatAge converts a duration to a human-readable age string
func formatAge(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	}
	if d < time.Hour {
		return fmt.Sprintf("%dm", int(d.Minutes()))
	}
	if d < 24*time.Hour {
		return fmt.Sprintf("%dh", int(d.Hours()))
	}
	return fmt.Sprintf("%dd", int(d.Hours()/24))
}

// Pod represents a Kubernetes Pod with minimal fields
type Pod struct {
	Metadata struct {
		CreationTimestamp time.Time `json:"creationTimestamp"`
	} `json:"metadata"`
}

// PodList represents a list of Kubernetes Pods
type PodList struct {
	Items []Pod `json:"items"`
}

// GetNewestPodAge queries pods for a deployment and returns the age of the newest pod
func GetNewestPodAge(ctx context.Context, clusterName string, namespace string, matchLabels map[string]string) string {
	var labelSelectors []string
	for key, value := range matchLabels {
		labelSelectors = append(labelSelectors, fmt.Sprintf("%s=%s", key, value))
	}
	labelSelector := strings.Join(labelSelectors, ",")

	cmd := exec.CommandContext(ctx,
		"kubectl",
		"get", "pods",
		"-n", namespace,
		"--context", clusterName,
		"-l", labelSelector,
		"-o", "json")

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Sprintf("ERROR: %v", err)
	}

	var podList PodList
	if err := json.Unmarshal(output, &podList); err != nil {
		return fmt.Sprintf("PARSE ERROR: %v", err)
	}

	if len(podList.Items) == 0 {
		return "NO PODS"
	}

	newestPod := podList.Items[0]
	for _, pod := range podList.Items[1:] {
		if pod.Metadata.CreationTimestamp.After(newestPod.Metadata.CreationTimestamp) {
			newestPod = pod
		}
	}

	age := time.Since(newestPod.Metadata.CreationTimestamp)
	return formatAge(age)
}

// ResourceType represents the type of Kubernetes resource
type ResourceType string

const (
	HelmRelease   ResourceType = "helmrelease"
	Kustomization ResourceType = "kustomization"
	Deployment    ResourceType = "deployment"
)

// QueryResult represents the result of a kubectl query
type QueryResult struct {
	ClusterName string
	Namespace   string
	Name        string
	Conditions  []flux.Condition
	PodAge      *string // Only populated for Deployment resources
	Error       error
}

// GetResourceStatus queries a FluxCD resource and returns its status
func GetResourceStatus(ctx context.Context, clusterName string, resourceType ResourceType, namespace string, name string) QueryResult {
	result := QueryResult{
		ClusterName: clusterName,
		Namespace:   namespace,
		Name:        name,
	}

	var resourceName string
	switch resourceType {
	case HelmRelease:
		resourceName = "helmrelease.helm.toolkit.fluxcd.io"
	case Kustomization:
		resourceName = "kustomization.kustomize.toolkit.fluxcd.io"
	case Deployment:
		resourceName = "deployment"
	}

	cmd := exec.CommandContext(ctx,
		"kubectl",
		"get", resourceName,
		name,
		"-n", namespace,
		"--context", clusterName,
		"-o", "json")

	output, err := cmd.CombinedOutput()
	if err != nil {
		result.Error = fmt.Errorf("kubectl error: %w (output: %s)", err, string(output))
		return result
	}

	switch resourceType {
	case HelmRelease:
		var hr flux.HelmRelease
		if err := json.Unmarshal(output, &hr); err != nil {
			result.Error = fmt.Errorf("failed to parse HelmRelease: %w", err)
			return result
		}
		result.Conditions = flux.GetLatestCondition(hr.Status.Conditions)
	case Kustomization:
		var ks flux.Kustomization
		if err := json.Unmarshal(output, &ks); err != nil {
			result.Error = fmt.Errorf("failed to parse Kustomization: %w", err)
			return result
		}
		result.Conditions = flux.GetLatestCondition(ks.Status.Conditions)
	case Deployment:
		var dep DeploymentResource
		if err := json.Unmarshal(output, &dep); err != nil {
			result.Error = fmt.Errorf("failed to parse Deployment: %w", err)
			return result
		}
		result.Conditions = flux.GetLatestCondition(dep.Status.Conditions)

		podAge := GetNewestPodAge(ctx, clusterName, namespace, dep.Spec.Selector.MatchLabels)
		result.PodAge = &podAge
	}

	if len(result.Conditions) == 0 {
		result.Error = fmt.Errorf("no conditions found in resource status")
	}

	return result
}

// ParseNamespaceAndName parses the namespace/name format
func ParseNamespaceAndName(input string) (namespace string, name string, err error) {
	parts := strings.Split(input, "/")
	if len(parts) != 2 {
		return "", "", fmt.Errorf("invalid format: expected namespace/name, got: %s", input)
	}
	return parts[0], parts[1], nil
}

// ParseResourceType parses the resource type string
func ParseResourceType(input string) (ResourceType, error) {
	switch strings.ToLower(input) {
	case "hr", "helmrelease":
		return HelmRelease, nil
	case "ks", "kustomization":
		return Kustomization, nil
	case "dep", "deployment":
		return Deployment, nil
	default:
		return "", fmt.Errorf("invalid resource type: %s (expected: hr, ks, or dep)", input)
	}
}

// QueryAllClusters queries all clusters in parallel with a worker pool
func QueryAllClusters(clusters []string, resourceType ResourceType, namespace string, name string, maxWorkers int) []QueryResult {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	jobs := make(chan string, len(clusters))
	results := make(chan QueryResult, len(clusters))

	for w := 0; w < maxWorkers; w++ {
		go func() {
			for clusterName := range jobs {
				result := GetResourceStatus(ctx, clusterName, resourceType, namespace, name)
				results <- result
			}
		}()
	}

	for _, cluster := range clusters {
		jobs <- cluster
	}
	close(jobs)

	var queryResults []QueryResult
	for i := 0; i < len(clusters); i++ {
		queryResults = append(queryResults, <-results)
	}
	close(results)

	return queryResults
}
