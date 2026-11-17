package kubernetes

import (
	"context"
	"fmt"
	"strconv"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

// reconcileAnnotation makes Flux skip an object. A route that has it no longer follows its manifests.
const reconcileAnnotation = "kustomize.toolkit.fluxcd.io/reconcile"

// GetHTTPRoute fetches an HTTPRoute from a cluster using the Gateway API client.
func GetHTTPRoute(
	ctx context.Context,
	runtime KubernetesRuntime,
	namespace string,
	name string,
) (*gatewayv1.HTTPRoute, error) {
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

// HTTPRouteBackends lists the backends of every rule in a route as name=weight.
func HTTPRouteBackends(route *gatewayv1.HTTPRoute) []string {
	var backends []string
	for _, rule := range route.Spec.Rules {
		for _, ref := range rule.BackendRefs {
			// The Gateway API defaults an unset weight to 1.
			weight := 1
			if ref.Weight != nil {
				weight = int(*ref.Weight)
			}
			backends = append(backends, string(ref.Name)+"="+strconv.Itoa(weight))
		}
	}
	return backends
}

// HTTPRouteConditions returns the conditions that the route's parents report.
func HTTPRouteConditions(route *gatewayv1.HTTPRoute) []metav1.Condition {
	var conditions []metav1.Condition
	for _, parent := range route.Status.Parents {
		conditions = append(conditions, parent.Conditions...)
	}
	return conditions
}
