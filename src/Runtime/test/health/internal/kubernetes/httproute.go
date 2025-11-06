package kubernetes

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"time"
)

// HTTPRouteBackendRef represents a backend reference in an HTTPRoute (minimal for validation)
type HTTPRouteBackendRef struct {
	Weight *int `json:"weight,omitempty"`
}

// HTTPRouteRule represents a rule in an HTTPRoute (minimal for validation)
type HTTPRouteRule struct {
	BackendRefs []HTTPRouteBackendRef `json:"backendRefs"`
}

// HTTPRouteSpec represents the spec field of an HTTPRoute (minimal for validation)
type HTTPRouteSpec struct {
	Rules []HTTPRouteRule `json:"rules"`
}

// HTTPRouteMetadata represents the metadata field (minimal for validation)
type HTTPRouteMetadata struct {
	Annotations map[string]string `json:"annotations,omitempty"`
}

// HTTPRoute represents a Gateway API HTTPRoute resource (minimal fields for validation only)
type HTTPRoute struct {
	Metadata HTTPRouteMetadata `json:"metadata"`
	Spec     HTTPRouteSpec     `json:"spec"`
}

// HTTPRouteResult represents the result of an HTTPRoute operation
type HTTPRouteResult struct {
	ClusterName            string
	Namespace              string
	Name                   string
	CurrentWeight1         int
	CurrentWeight2         int
	HasReconcileAnnotation bool // Whether the reconcile annotation already exists
	HasAnyAnnotations      bool // Whether the annotations map exists
	Error                  error
}

// GetHTTPRoute fetches an HTTPRoute from a cluster
func GetHTTPRoute(ctx context.Context, clusterName string, namespace string, name string) (*HTTPRoute, error) {
	cmd := exec.CommandContext(ctx,
		"kubectl",
		"get", "httproute.gateway.networking.k8s.io",
		name,
		"-n", namespace,
		"--context", clusterName,
		"-o", "json")

	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("kubectl error: %w (output: %s)", err, string(output))
	}

	var route HTTPRoute
	if err := json.Unmarshal(output, &route); err != nil {
		return nil, fmt.Errorf("failed to parse HTTPRoute: %w", err)
	}

	return &route, nil
}

// ValidateHTTPRouteStructure validates that the HTTPRoute has exactly 1 rule with 2 backendRefs
func ValidateHTTPRouteStructure(route *HTTPRoute) error {
	if len(route.Spec.Rules) != 1 {
		return fmt.Errorf("HTTPRoute must have exactly 1 rule, found %d", len(route.Spec.Rules))
	}

	backendRefs := route.Spec.Rules[0].BackendRefs
	if len(backendRefs) != 2 {
		return fmt.Errorf("HTTPRoute rule must have exactly 2 backendRefs, found %d", len(backendRefs))
	}

	return nil
}

// JSONPatchOperation represents a single JSON Patch operation
type JSONPatchOperation struct {
	Op    string      `json:"op"`
	Path  string      `json:"path"`
	Value interface{} `json:"value,omitempty"`
}

// buildWeightPatch constructs a JSON Patch document to update weights and optionally add the reconcile annotation
func buildWeightPatch(weight1, weight2 int, hasReconcileAnnotation bool, hasAnyAnnotations bool) (string, error) {
	var operations []JSONPatchOperation

	// Add annotation to disable flux reconciliation only if it doesn't already exist
	// Note: '/' in annotation key must be escaped as '~1' per RFC 6902
	if !hasReconcileAnnotation {
		if !hasAnyAnnotations {
			// If annotations object doesn't exist, create it with the annotation
			operations = append(operations, JSONPatchOperation{
				Op:   "add",
				Path: "/metadata/annotations",
				Value: map[string]string{
					"kustomize.toolkit.fluxcd.io/reconcile": "disabled",
				},
			})
		} else {
			// If annotations exists but not the reconcile annotation, add the specific annotation key
			operations = append(operations, JSONPatchOperation{
				Op:    "add",
				Path:  "/metadata/annotations/kustomize.toolkit.fluxcd.io~1reconcile",
				Value: "disabled",
			})
		}
	}

	// Replace weights
	operations = append(operations,
		JSONPatchOperation{
			Op:    "add",
			Path:  "/spec/rules/0/backendRefs/0/weight",
			Value: weight1,
		},
		JSONPatchOperation{
			Op:    "add",
			Path:  "/spec/rules/0/backendRefs/1/weight",
			Value: weight2,
		},
	)

	patchBytes, err := json.Marshal(operations)
	if err != nil {
		return "", fmt.Errorf("failed to marshal JSON patch: %w", err)
	}

	return string(patchBytes), nil
}

// UpdateHTTPRouteWeights updates the weights of an HTTPRoute and adds the flux reconcile annotation using JSON Patch
func UpdateHTTPRouteWeights(ctx context.Context, clusterName string, namespace string, name string, weight1 int, weight2 int, hasReconcileAnnotation bool, hasAnyAnnotations bool) error {
	patch, err := buildWeightPatch(weight1, weight2, hasReconcileAnnotation, hasAnyAnnotations)
	if err != nil {
		return err
	}

	cmd := exec.CommandContext(ctx,
		"kubectl",
		"patch", "httproute.gateway.networking.k8s.io",
		name,
		"-n", namespace,
		"--context", clusterName,
		"--type=json",
		"-p", patch)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("kubectl patch error: %w (output: %s)", err, string(output))
	}

	return nil
}

// buildRemoveAnnotationPatch constructs a JSON Patch document to remove the reconcile annotation
func buildRemoveAnnotationPatch() (string, error) {
	operations := []JSONPatchOperation{
		{
			Op:   "remove",
			Path: "/metadata/annotations/kustomize.toolkit.fluxcd.io~1reconcile",
		},
	}

	patchBytes, err := json.Marshal(operations)
	if err != nil {
		return "", fmt.Errorf("failed to marshal JSON patch: %w", err)
	}

	return string(patchBytes), nil
}

// RemoveReconcileAnnotation removes the reconcile annotation from an HTTPRoute using JSON Patch
func RemoveReconcileAnnotation(ctx context.Context, clusterName string, namespace string, name string) error {
	patch, err := buildRemoveAnnotationPatch()
	if err != nil {
		return err
	}

	cmd := exec.CommandContext(ctx,
		"kubectl",
		"patch", "httproute.gateway.networking.k8s.io",
		name,
		"-n", namespace,
		"--context", clusterName,
		"--type=json",
		"-p", patch)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("kubectl patch error: %w (output: %s)", err, string(output))
	}

	return nil
}

// GetHTTPRouteFromCluster fetches and validates an HTTPRoute from a cluster
func GetHTTPRouteFromCluster(ctx context.Context, clusterName string, namespace string, name string) HTTPRouteResult {
	result := HTTPRouteResult{
		ClusterName: clusterName,
		Namespace:   namespace,
		Name:        name,
	}

	route, err := GetHTTPRoute(ctx, clusterName, namespace, name)
	if err != nil {
		result.Error = err
		return result
	}

	if err := ValidateHTTPRouteStructure(route); err != nil {
		result.Error = err
		return result
	}

	currentWeight1 := route.Spec.Rules[0].BackendRefs[0].Weight
	currentWeight2 := route.Spec.Rules[0].BackendRefs[1].Weight
	if currentWeight1 == nil || currentWeight2 == nil {
		result.Error = fmt.Errorf("httproute in %s does not have weight", clusterName)
		return result
	}

	result.CurrentWeight1 = *currentWeight1
	result.CurrentWeight2 = *currentWeight2

	// Check if annotations exist and if the specific reconcile annotation exists
	result.HasAnyAnnotations = route.Metadata.Annotations != nil
	if result.HasAnyAnnotations {
		_, exists := route.Metadata.Annotations["kustomize.toolkit.fluxcd.io/reconcile"]
		result.HasReconcileAnnotation = exists
	}

	return result
}

// GetAllHTTPRoutes fetches HTTPRoutes from all clusters in parallel
func GetAllHTTPRoutes(clusters []string, namespace string, name string, maxWorkers int) []HTTPRouteResult {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	jobs := make(chan string, len(clusters))
	results := make(chan HTTPRouteResult, len(clusters))

	for w := 0; w < maxWorkers; w++ {
		go func() {
			for clusterName := range jobs {
				result := GetHTTPRouteFromCluster(ctx, clusterName, namespace, name)
				results <- result
			}
		}()
	}

	for _, cluster := range clusters {
		jobs <- cluster
	}
	close(jobs)

	var routeResults []HTTPRouteResult
	for i := 0; i < len(clusters); i++ {
		routeResults = append(routeResults, <-results)
	}
	close(results)

	return routeResults
}

// UpdateAllHTTPRoutes updates HTTPRoutes on clusters in parallel using JSON Patch
func UpdateAllHTTPRoutes(routesToUpdate []HTTPRouteResult, weight1 int, weight2 int, maxWorkers int) []HTTPRouteResult {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	jobs := make(chan HTTPRouteResult, len(routesToUpdate))
	results := make(chan HTTPRouteResult, len(routesToUpdate))

	for w := 0; w < maxWorkers; w++ {
		go func() {
			for routeResult := range jobs {
				result := HTTPRouteResult{
					ClusterName: routeResult.ClusterName,
					Namespace:   routeResult.Namespace,
					Name:        routeResult.Name,
				}

				if err := UpdateHTTPRouteWeights(ctx, routeResult.ClusterName, routeResult.Namespace, routeResult.Name, weight1, weight2, routeResult.HasReconcileAnnotation, routeResult.HasAnyAnnotations); err != nil {
					result.Error = err
					results <- result
					continue
				}

				result.CurrentWeight1 = weight1
				result.CurrentWeight2 = weight2
				results <- result
			}
		}()
	}

	for _, routeResult := range routesToUpdate {
		jobs <- routeResult
	}
	close(jobs)

	var updateResults []HTTPRouteResult
	for i := 0; i < len(routesToUpdate); i++ {
		updateResults = append(updateResults, <-results)
	}
	close(results)

	return updateResults
}
