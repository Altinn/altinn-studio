package kubernetes_test

import (
	"slices"
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"altinn.studio/runtime-health/internal/kubernetes"
)

func backendRef(name string, weight *int32) gatewayv1.HTTPBackendRef {
	return gatewayv1.HTTPBackendRef{BackendRef: gatewayv1.BackendRef{
		BackendObjectReference: gatewayv1.BackendObjectReference{Name: gatewayv1.ObjectName(name)},
		Weight:                 weight,
	}}
}

func TestHTTPRouteBackendsListsEveryBackendWithItsWeight(t *testing.T) {
	zero := int32(0)
	route := &gatewayv1.HTTPRoute{Spec: gatewayv1.HTTPRouteSpec{Rules: []gatewayv1.HTTPRouteRule{
		{BackendRefs: []gatewayv1.HTTPBackendRef{backendRef("pdf3-proxy", nil), backendRef("pdf3-relay", &zero)}},
	}}}

	got := kubernetes.HTTPRouteBackends(route)

	// An unset weight is 1 in the Gateway API.
	want := []string{"pdf3-proxy=1", "pdf3-relay=0"}
	if !slices.Equal(got, want) {
		t.Fatalf("HTTPRouteBackends() = %v, want %v", got, want)
	}
}

func TestHTTPRouteConditionsCollectsEveryParent(t *testing.T) {
	route := &gatewayv1.HTTPRoute{Status: gatewayv1.HTTPRouteStatus{RouteStatus: gatewayv1.RouteStatus{
		Parents: []gatewayv1.RouteParentStatus{
			{Conditions: []metav1.Condition{{Type: "Accepted", Status: metav1.ConditionTrue}}},
			{Conditions: []metav1.Condition{{Type: "ResolvedRefs", Status: metav1.ConditionFalse}}},
		},
	}}}

	got := kubernetes.HTTPRouteConditions(route)

	if len(got) != 2 || got[0].Type != "Accepted" || got[1].Type != "ResolvedRefs" {
		t.Fatalf("HTTPRouteConditions() = %v, want Accepted and ResolvedRefs", got)
	}
}
