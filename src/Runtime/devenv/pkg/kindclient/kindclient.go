// Package kindclient wraps the official Kind library behind a small repository-local API.
package kindclient

import (
	"fmt"

	"sigs.k8s.io/kind/pkg/apis/config/v1alpha4"
	"sigs.k8s.io/kind/pkg/cluster"
)

// KindClient wraps kind cluster operations using the official Go library.
type KindClient struct {
	provider *cluster.Provider
}

// New creates a new KindClient.
func New() *KindClient {
	return &KindClient{
		provider: cluster.NewProvider(),
	}
}

// GetClusters returns a list of all kind clusters.
func (c *KindClient) GetClusters() ([]string, error) {
	clusters, err := c.provider.List()
	if err != nil {
		return nil, fmt.Errorf("list kind clusters: %w", err)
	}
	return clusters, nil
}

// CreateCluster creates a new kind cluster using the specified config.
func (c *KindClient) CreateCluster(name string, config *v1alpha4.Cluster) error {
	if err := c.provider.Create(name, cluster.CreateWithV1Alpha4Config(config)); err != nil {
		return fmt.Errorf("create kind cluster %s: %w", name, err)
	}
	return nil
}

// DeleteCluster deletes a kind cluster by name.
func (c *KindClient) DeleteCluster(name string) error {
	if err := c.provider.Delete(name, ""); err != nil {
		return fmt.Errorf("delete kind cluster %s: %w", name, err)
	}
	return nil
}

// GetNodes returns a list of nodes for the specified cluster.
func (c *KindClient) GetNodes(clusterName string) ([]string, error) {
	nodes, err := c.provider.ListNodes(clusterName)
	if err != nil {
		return nil, fmt.Errorf("list nodes for kind cluster %s: %w", clusterName, err)
	}
	result := make([]string, len(nodes))
	for i, n := range nodes {
		result[i] = n.String()
	}
	return result, nil
}
