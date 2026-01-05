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

	if err := r.KindClient.CreateCluster(r.clusterName, r.kindConfig); err != nil {
		return fmt.Errorf("failed to create cluster: %w", err)
	}

	fmt.Printf("Cluster %s created successfully\n", r.clusterName)
	return nil
}
