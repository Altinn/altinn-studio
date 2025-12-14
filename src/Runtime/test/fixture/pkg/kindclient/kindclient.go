package kindclient

import (
	"sigs.k8s.io/kind/pkg/apis/config/v1alpha4"
	"sigs.k8s.io/kind/pkg/cluster"
)

// KindClient wraps kind cluster operations using the official Go library
type KindClient struct {
	provider *cluster.Provider
}

// New creates a new KindClient
func New() *KindClient {
	return &KindClient{
		provider: cluster.NewProvider(),
	}
}

// GetClusters returns a list of all kind clusters
func (c *KindClient) GetClusters() ([]string, error) {
	return c.provider.List()
}

// CreateCluster creates a new kind cluster using the specified config
func (c *KindClient) CreateCluster(name string, config *v1alpha4.Cluster) error {
	return c.provider.Create(name, cluster.CreateWithV1Alpha4Config(config))
}

// DeleteCluster deletes a kind cluster by name
func (c *KindClient) DeleteCluster(name string) error {
	return c.provider.Delete(name, "")
}

// GetNodes returns a list of nodes for the specified cluster
func (c *KindClient) GetNodes(clusterName string) ([]string, error) {
	nodes, err := c.provider.ListNodes(clusterName)
	if err != nil {
		return nil, err
	}
	result := make([]string, len(nodes))
	for i, n := range nodes {
		result[i] = n.String()
	}
	return result, nil
}
