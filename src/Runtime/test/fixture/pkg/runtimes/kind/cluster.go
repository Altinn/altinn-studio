package kind

import (
	"fmt"
)

// clusterExists checks if a kind cluster with the given name exists
func (r *KindContainerRuntime) clusterExists() (bool, error) {
	clusters, err := r.KindClient.GetClusters()
	if err != nil {
		return false, fmt.Errorf("checking kind clusters: %w", err)
	}

	for _, cluster := range clusters {
		if cluster == r.clusterName {
			return true, nil
		}
	}

	return false, nil
}

// createCluster creates a new kind cluster using the specified config
func (r *KindContainerRuntime) createCluster() error {
	fmt.Printf("Creating kind cluster %s...\n", r.clusterName)

	if err := r.KindClient.CreateCluster(r.configPath); err != nil {
		return fmt.Errorf("failed to create cluster: %w", err)
	}

	fmt.Printf("Cluster %s created successfully\n", r.clusterName)
	return nil
}

// setKubectlContext sets the kubectl context to the kind cluster
func (r *KindContainerRuntime) setKubectlContext() error {
	contextName := fmt.Sprintf("kind-%s", r.clusterName)
	fmt.Printf("Setting kubectl context to %s...\n", contextName)

	if err := r.KubernetesClient.ConfigUseContext(contextName); err != nil {
		return err
	}

	return nil
}
