package grafanaapi

import (
	"fmt"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

var (
	GroupVersion     = schema.GroupVersion{Group: "grafana.integreatly.org", Version: "v1beta1"}
	GroupVersionKind = GroupVersion.WithKind("Grafana")
)

func AddToScheme(scheme *runtime.Scheme) error {
	scheme.AddKnownTypeWithName(GroupVersionKind, &unstructured.Unstructured{})
	scheme.AddKnownTypeWithName(GroupVersion.WithKind("GrafanaList"), &unstructured.UnstructuredList{})
	metav1.AddToGroupVersion(scheme, GroupVersion)
	return nil
}

func NewGrafana(namespace, name string) *unstructured.Unstructured {
	grafana := &unstructured.Unstructured{}
	grafana.SetGroupVersionKind(GroupVersionKind)
	grafana.SetNamespace(namespace)
	grafana.SetName(name)
	return grafana
}

func NewGrafanaWithExternalURL(namespace, name, url string) *unstructured.Unstructured {
	grafana := NewGrafana(namespace, name)
	if err := unstructured.SetNestedField(grafana.Object, url, "spec", "external", "url"); err != nil {
		panic(err)
	}
	return grafana
}

func ExternalURL(grafana *unstructured.Unstructured) (url string, hasExternal bool, err error) {
	external, found, err := unstructured.NestedMap(grafana.Object, "spec", "external")
	if err != nil {
		return "", false, fmt.Errorf("read spec.external: %w", err)
	}
	if !found || external == nil {
		return "", false, nil
	}

	url, _, err = unstructured.NestedString(grafana.Object, "spec", "external", "url")
	if err != nil {
		return "", true, fmt.Errorf("read spec.external.url: %w", err)
	}
	return url, true, nil
}
