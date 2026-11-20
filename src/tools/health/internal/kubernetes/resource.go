package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var (
	errNoResourceConditions = errors.New("no conditions found in resource status")
	errInvalidNamespacedRef = errors.New("invalid namespace/name format")
	errInvalidResourceType  = errors.New("invalid resource type")
)

// ResourceType represents the type of Kubernetes resource.
type ResourceType string

const (
	HelmReleaseResourceType   ResourceType = "helmrelease"
	KustomizationResourceType ResourceType = "kustomization"
	DeploymentResourceType    ResourceType = "deployment"
	HTTPRouteResourceType     ResourceType = "httproute"
)

// QueryResult represents the result of a resource query.
type QueryResult struct {
	Error                  error
	PodAge                 *string
	PodRestarts            *string
	HasReconcileAnnotation *bool
	Annotations            map[string]string
	ClusterName            string
	Namespace              string
	Name                   string
	Conditions             []metav1.Condition
	// Backends is set for an HTTPRoute, as name=weight.
	Backends []string
}

// GetResourceStatus queries a resource (FluxCD or Deployment) and returns its status.
func GetResourceStatus(
	ctx context.Context,
	runtime KubernetesRuntime,
	resourceType ResourceType,
	namespace string,
	name string,
) QueryResult {
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
		route, err := GetHTTPRoute(ctx, runtime, namespace, name)
		if err != nil {
			result.Error = err
			return result
		}

		result.Backends = HTTPRouteBackends(route)
		_, hasReconcileAnnotation := route.Annotations[reconcileAnnotation]
		result.HasReconcileAnnotation = &hasReconcileAnnotation
		result.Annotations = route.Annotations
		result.Conditions = HTTPRouteConditions(route)

		// A route's conditions are per parent, and a route without status has none yet.
		return result
	}

	if len(result.Conditions) == 0 {
		result.Error = errNoResourceConditions
	}

	return result
}

// ParseNamespaceAndName parses the namespace/name format.
func ParseNamespaceAndName(input string) (namespace string, name string, err error) {
	parts := strings.Split(input, "/")
	if len(parts) != 2 {
		return "", "", fmt.Errorf("%w: expected namespace/name, got %q", errInvalidNamespacedRef, input)
	}
	return parts[0], parts[1], nil
}

// ParseResourceType parses the resource type string.
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
		return "", fmt.Errorf("%w: %s (expected: hr, ks, dep, or httproute)", errInvalidResourceType, input)
	}
}

// QueryAllClusters queries all clusters in parallel with a worker pool.
func QueryAllClusters(
	runtimes []KubernetesRuntime,
	resourceType ResourceType,
	namespace string,
	name string,
	maxWorkers int,
) []QueryResult {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	jobs := make(chan KubernetesRuntime, len(runtimes))
	results := make(chan QueryResult, len(runtimes))

	for range maxWorkers {
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

	queryResults := make([]QueryResult, 0, len(runtimes))
	for range runtimes {
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
		if cond.LastTransitionTime.After(latestTime) {
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
