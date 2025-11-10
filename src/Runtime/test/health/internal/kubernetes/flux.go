package kubernetes

import (
	"context"
	"fmt"

	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	kustomizev1 "github.com/fluxcd/kustomize-controller/api/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
)

// GetHelmRelease retrieves a FluxCD HelmRelease resource from the cluster.
func GetHelmRelease(ctx context.Context, runtime KubernetesRuntime, namespace, name string) (*helmv2.HelmRelease, error) {
	client := runtime.GetKubernetesClient()
	dynamicClient, err := client.DynamicClient()
	if err != nil {
		return nil, fmt.Errorf("failed to get dynamic client: %w", err)
	}

	gvr := helmv2.GroupVersion.WithResource("helmreleases")
	unstructured, err := dynamicClient.Resource(gvr).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get helmrelease %s/%s: %w", namespace, name, err)
	}

	// Convert unstructured to typed HelmRelease
	var helmRelease helmv2.HelmRelease
	if err := k8sruntime.DefaultUnstructuredConverter.FromUnstructured(unstructured.Object, &helmRelease); err != nil {
		return nil, fmt.Errorf("failed to convert helmrelease: %w", err)
	}

	return &helmRelease, nil
}

// GetKustomization retrieves a FluxCD Kustomization resource from the cluster.
func GetKustomization(ctx context.Context, runtime KubernetesRuntime, namespace, name string) (*kustomizev1.Kustomization, error) {
	client := runtime.GetKubernetesClient()
	dynamicClient, err := client.DynamicClient()
	if err != nil {
		return nil, fmt.Errorf("failed to get dynamic client: %w", err)
	}

	gvr := kustomizev1.GroupVersion.WithResource("kustomizations")
	unstructured, err := dynamicClient.Resource(gvr).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get kustomization %s/%s: %w", namespace, name, err)
	}

	// Convert unstructured to typed Kustomization
	var kustomization kustomizev1.Kustomization
	if err := k8sruntime.DefaultUnstructuredConverter.FromUnstructured(unstructured.Object, &kustomization); err != nil {
		return nil, fmt.Errorf("failed to convert kustomization: %w", err)
	}

	return &kustomization, nil
}
