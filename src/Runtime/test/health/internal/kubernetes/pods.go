package kubernetes

import (
	"context"
	"fmt"
	"strings"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

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

// GetPodInfo queries pods for a deployment and returns age and restart information.
// Returns (age, restarts) where:
// - age is the age of the newest pod (e.g., "5m", "2h")
// - restarts is slash-separated restart counts for all pods (e.g., "0/2/1" for 3 pods)
func GetPodInfo(ctx context.Context, runtime KubernetesRuntime, namespace string, matchLabels map[string]string) (string, string) {
	// Build label selector
	var labelSelectors []string
	for key, value := range matchLabels {
		labelSelectors = append(labelSelectors, fmt.Sprintf("%s=%s", key, value))
	}
	labelSelector := strings.Join(labelSelectors, ",")

	// Get clientset
	client := runtime.GetKubernetesClient()
	clientset, err := client.Clientset()
	if err != nil {
		errMsg := fmt.Sprintf("ERROR: %v", err)
		return errMsg, errMsg
	}

	// List pods with label selector
	podList, err := clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil {
		errMsg := fmt.Sprintf("ERROR: %v", err)
		return errMsg, errMsg
	}

	if len(podList.Items) == 0 {
		return "NO PODS", "NO PODS"
	}

	// Find newest pod for age calculation
	newestPod := podList.Items[0]
	for _, pod := range podList.Items[1:] {
		if pod.CreationTimestamp.After(newestPod.CreationTimestamp.Time) {
			newestPod = pod
		}
	}

	age := time.Since(newestPod.CreationTimestamp.Time)
	ageStr := formatAge(age)

	// Calculate restart counts for all pods
	var restartCounts []string
	for _, pod := range podList.Items {
		totalRestarts := 0
		for _, container := range pod.Status.ContainerStatuses {
			totalRestarts += int(container.RestartCount)
		}
		restartCounts = append(restartCounts, fmt.Sprintf("%d", totalRestarts))
	}
	restartsStr := strings.Join(restartCounts, "/")

	return ageStr, restartsStr
}
