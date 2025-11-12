package kubernetes

import (
	"context"
	"fmt"
	"strings"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ResourceType represents the type of Kubernetes resource
type ResourceType string

const (
	HelmReleaseResourceType   ResourceType = "helmrelease"
	KustomizationResourceType ResourceType = "kustomization"
	DeploymentResourceType    ResourceType = "deployment"
	HTTPRouteResourceType     ResourceType = "httproute"
)

// QueryResult represents the result of a resource query
type QueryResult struct {
	ClusterName            string
	Namespace              string
	Name                   string
	Conditions             []metav1.Condition
	PodAge                 *string            // Only populated for Deployment resources
	PodRestarts            *string            // Only populated for Deployment resources
	Weight1                *int               // Only populated for HTTPRoute resources
	Weight2                *int               // Only populated for HTTPRoute resources
	HasReconcileAnnotation *bool              // Only populated for HTTPRoute resources
	Annotations            map[string]string  // Only populated for HTTPRoute resources
	Error                  error
}

// GetResourceStatus queries a resource (FluxCD or Deployment) and returns its status
func GetResourceStatus(ctx context.Context, runtime KubernetesRuntime, resourceType ResourceType, namespace string, name string) QueryResult {
	result := QueryResult{
		ClusterName: runtime.GetName(),
		Namespace:   namespace,
		Name:        name,
	}

	switch resourceType {
	case HelmReleaseResourceType:
		hr, err := GetHelmRelease(ctx, runtime, namespace, name)
		if err != nil {
			result.Error = fmt.Errorf("failed to get helmrelease: %w", err)
			return result
		}
		result.Conditions = GetLatestCondition(hr.Status.Conditions)

	case KustomizationResourceType:
		ks, err := GetKustomization(ctx, runtime, namespace, name)
		if err != nil {
			result.Error = fmt.Errorf("failed to get kustomization: %w", err)
			return result
		}
		result.Conditions = GetLatestCondition(ks.Status.Conditions)

	case DeploymentResourceType:
		dep, err := GetDeployment(ctx, runtime, namespace, name)
		if err != nil {
			result.Error = fmt.Errorf("failed to get deployment: %w", err)
			return result
		}

		// Extract conditions from deployment status
		var conditions []metav1.Condition
		for _, c := range dep.Status.Conditions {
			conditions = append(conditions, metav1.Condition{
				Type:               string(c.Type),
				Status:             metav1.ConditionStatus(c.Status),
				Reason:             c.Reason,
				Message:            c.Message,
				LastTransitionTime: c.LastTransitionTime,
			})
		}
		result.Conditions = GetLatestCondition(conditions)

		// Get pod information
		podAge, podRestarts := GetPodInfo(ctx, runtime, namespace, dep.Spec.Selector.MatchLabels)
		result.PodAge = &podAge
		result.PodRestarts = &podRestarts

	case HTTPRouteResourceType:
		routeResult := GetHTTPRouteFromCluster(ctx, runtime, namespace, name)
		if routeResult.Error != nil {
			result.Error = routeResult.Error
			return result
		}

		// Populate HTTPRoute-specific fields
		result.Weight1 = &routeResult.CurrentWeight1
		result.Weight2 = &routeResult.CurrentWeight2
		result.HasReconcileAnnotation = &routeResult.HasReconcileAnnotation

		// Get full HTTPRoute to extract annotations
		route, err := GetHTTPRoute(ctx, runtime, namespace, name)
		if err != nil {
			result.Error = fmt.Errorf("failed to get httproute annotations: %w", err)
			return result
		}
		if route.Annotations != nil {
			result.Annotations = route.Annotations
		}

		// HTTPRoutes don't have conditions, so we'll skip that check for this resource type
		return result
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
		return HelmReleaseResourceType, nil
	case "ks", "kustomization":
		return KustomizationResourceType, nil
	case "dep", "deployment":
		return DeploymentResourceType, nil
	case "httproute":
		return HTTPRouteResourceType, nil
	default:
		return "", fmt.Errorf("invalid resource type: %s (expected: hr, ks, dep, or httproute)", input)
	}
}

// QueryAllClusters queries all clusters in parallel with a worker pool
func QueryAllClusters(runtimes []KubernetesRuntime, resourceType ResourceType, namespace string, name string, maxWorkers int) []QueryResult {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	jobs := make(chan KubernetesRuntime, len(runtimes))
	results := make(chan QueryResult, len(runtimes))

	for w := 0; w < maxWorkers; w++ {
		go func() {
			for runtime := range jobs {
				result := GetResourceStatus(ctx, runtime, resourceType, namespace, name)
				results <- result
			}
		}()
	}

	for _, runtime := range runtimes {
		jobs <- runtime
	}
	close(jobs)

	var queryResults []QueryResult
	for i := 0; i < len(runtimes); i++ {
		queryResults = append(queryResults, <-results)
	}
	close(results)

	return queryResults
}

// GetLatestCondition returns conditions with the most recent timestamp
// If multiple conditions share the same latest timestamp, all are returned
// in their original order. Otherwise, only the most recent condition is returned.
func GetLatestCondition(conditions []metav1.Condition) []metav1.Condition {
	if len(conditions) == 0 {
		return nil
	}

	// Find the latest timestamp
	latestTime := conditions[0].LastTransitionTime.Time
	for _, cond := range conditions[1:] {
		if cond.LastTransitionTime.Time.After(latestTime) {
			latestTime = cond.LastTransitionTime.Time
		}
	}

	// Collect all conditions with the latest timestamp
	var result []metav1.Condition
	for _, cond := range conditions {
		if cond.LastTransitionTime.Time.Equal(latestTime) {
			result = append(result, cond)
		}
	}

	return result
}
