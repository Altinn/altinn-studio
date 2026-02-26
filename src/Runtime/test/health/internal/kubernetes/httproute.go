package kubernetes

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

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

// GetHTTPRoute fetches an HTTPRoute from a cluster using the Gateway API client
func GetHTTPRoute(ctx context.Context, runtime KubernetesRuntime, namespace string, name string) (*gatewayv1.HTTPRoute, error) {
	client := runtime.GetKubernetesClient()
	gwClient, err := client.GatewayClient()
	if err != nil {
		return nil, fmt.Errorf("failed to get gateway client: %w", err)
	}

	route, err := gwClient.GatewayV1().HTTPRoutes(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get httproute %s/%s: %w", namespace, name, err)
	}

	return route, nil
}

// ValidateHTTPRouteStructure validates that the HTTPRoute has exactly 1 rule with 2 backendRefs
func ValidateHTTPRouteStructure(route *gatewayv1.HTTPRoute) error {
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
func UpdateHTTPRouteWeights(ctx context.Context, runtime KubernetesRuntime, namespace string, name string, weight1 int, weight2 int, hasReconcileAnnotation bool, hasAnyAnnotations bool) error {
	client := runtime.GetKubernetesClient()
	patch, err := buildWeightPatch(weight1, weight2, hasReconcileAnnotation, hasAnyAnnotations)
	if err != nil {
		return err
	}

	gwClient, err := client.GatewayClient()
	if err != nil {
		return fmt.Errorf("failed to get gateway client: %w", err)
	}

	_, err = gwClient.GatewayV1().HTTPRoutes(namespace).Patch(
		ctx,
		name,
		types.JSONPatchType,
		[]byte(patch),
		metav1.PatchOptions{},
	)
	if err != nil {
		return fmt.Errorf("failed to patch httproute %s/%s: %w", namespace, name, err)
	}

	return nil
}

// GetHTTPRouteFromCluster fetches and validates an HTTPRoute from a cluster
func GetHTTPRouteFromCluster(ctx context.Context, runtime KubernetesRuntime, namespace string, name string) HTTPRouteResult {
	result := HTTPRouteResult{
		ClusterName: runtime.GetName(),
		Namespace:   namespace,
		Name:        name,
	}

	route, err := GetHTTPRoute(ctx, runtime, namespace, name)
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
		result.Error = fmt.Errorf("httproute in %s does not have weight", runtime.GetName())
		return result
	}

	result.CurrentWeight1 = int(*currentWeight1)
	result.CurrentWeight2 = int(*currentWeight2)

	// Check if annotations exist and if the specific reconcile annotation exists
	result.HasAnyAnnotations = route.Annotations != nil
	if result.HasAnyAnnotations {
		_, exists := route.Annotations["kustomize.toolkit.fluxcd.io/reconcile"]
		result.HasReconcileAnnotation = exists
	}

	return result
}

// GetAllHTTPRoutes fetches HTTPRoutes from all clusters in parallel
func GetAllHTTPRoutes(runtimes []KubernetesRuntime, namespace string, name string, maxWorkers int) []HTTPRouteResult {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	jobs := make(chan KubernetesRuntime, len(runtimes))
	results := make(chan HTTPRouteResult, len(runtimes))

	for w := 0; w < maxWorkers; w++ {
		go func() {
			for runtime := range jobs {
				result := GetHTTPRouteFromCluster(ctx, runtime, namespace, name)
				results <- result
			}
		}()
	}

	for _, runtime := range runtimes {
		jobs <- runtime
	}
	close(jobs)

	var routeResults []HTTPRouteResult
	for i := 0; i < len(runtimes); i++ {
		routeResults = append(routeResults, <-results)
	}
	close(results)

	return routeResults
}

// UpdateAllHTTPRoutes updates HTTPRoutes on clusters in parallel using JSON Patch
func UpdateAllHTTPRoutes(runtimes []KubernetesRuntime, routesToUpdate []HTTPRouteResult, weight1 int, weight2 int, maxWorkers int) []HTTPRouteResult {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	jobs := make(chan HTTPRouteResult, len(routesToUpdate))
	results := make(chan HTTPRouteResult, len(routesToUpdate))

	runtimeByClusterName := make(map[string]KubernetesRuntime, len(runtimes))
	for _, runtime := range runtimes {
		runtimeByClusterName[runtime.GetName()] = runtime
	}

	for w := 0; w < maxWorkers; w++ {
		go func() {
			for routeResult := range jobs {
				result := HTTPRouteResult{
					ClusterName: routeResult.ClusterName,
					Namespace:   routeResult.Namespace,
					Name:        routeResult.Name,
				}

				runtime, ok := runtimeByClusterName[routeResult.ClusterName]
				if !ok {
					result.Error = fmt.Errorf("client not found for cluster %s", routeResult.ClusterName)
					results <- result
					continue
				}

				if err := UpdateHTTPRouteWeights(ctx, runtime, routeResult.Namespace, routeResult.Name, weight1, weight2, routeResult.HasReconcileAnnotation, routeResult.HasAnyAnnotations); err != nil {
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
