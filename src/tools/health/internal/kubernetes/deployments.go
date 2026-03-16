package kubernetes

import (
	"context"
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetDeployment retrieves a Deployment resource from the cluster.
func GetDeployment(ctx context.Context, runtime KubernetesRuntime, namespace, name string) (*appsv1.Deployment, error) {
	client := runtime.GetKubernetesClient()
	clientset, err := client.Clientset()
	if err != nil {
		return nil, fmt.Errorf("failed to get clientset: %w", err)
	}

	deployment, err := clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get deployment %s/%s: %w", namespace, name, err)
	}

	return deployment, nil
}
