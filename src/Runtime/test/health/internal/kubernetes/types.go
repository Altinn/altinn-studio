package kubernetes

import "altinn.studio/runtime-health/internal/runtimes"

// KubernetesRuntime represents a container runtime based on Kubernetes.
// It embeds the base ContainerRuntime and adds Kubernetes-specific capabilities.
type KubernetesRuntime interface {
	runtimes.ContainerRuntime
	GetKubernetesClient() *ClusterClient
}
