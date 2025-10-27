package kindcli

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// KindClient wraps kind CLI operations
type KindClient struct {
	kindBin string
}

// New creates a new KindClient with the given kind binary path
func New(kindBinPath string) (*KindClient, error) {
	if _, err := os.Stat(kindBinPath); err != nil {
		return nil, fmt.Errorf("kind binary stat error: %w", err)
	}
	return &KindClient{
		kindBin: kindBinPath,
	}, nil
}

// GetClusters returns a list of all kind clusters
func (c *KindClient) GetClusters() ([]string, error) {
	cmd := exec.Command(c.kindBin, "get", "clusters")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("kind get clusters failed: %s: %w", string(output), err)
	}
	if strings.Contains(string(output), "No kind clusters found") {
		return []string{}, nil
	}

	clusters := strings.Split(strings.TrimSpace(string(output)), "\n")
	var result []string
	for _, cluster := range clusters {
		cluster = strings.TrimSpace(cluster)
		if cluster != "" {
			result = append(result, cluster)
		}
	}

	return result, nil
}

// CreateCluster creates a new kind cluster using the specified config file
func (c *KindClient) CreateCluster(configPath string) error {
	cmd := exec.Command(c.kindBin, "create", "cluster", "--config", configPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		// Print output only on failure
		if len(output) > 0 {
			fmt.Printf("Command output:\n%s\n", string(output))
		}
		return fmt.Errorf("failed to create cluster: %w", err)
	}
	return nil
}

// DeleteCluster deletes a kind cluster by name
func (c *KindClient) DeleteCluster(name string) error {
	cmd := exec.Command(c.kindBin, "delete", "cluster", "--name", name)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to delete cluster: %w\nOutput: %s", err, string(output))
	}
	return nil
}

// GetNodes returns a list of nodes for the specified cluster
func (c *KindClient) GetNodes(clusterName string) ([]string, error) {
	cmd := exec.Command(c.kindBin, "get", "nodes", "--name", clusterName)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to get kind nodes: %w", err)
	}

	nodes := strings.Split(strings.TrimSpace(string(output)), "\n")
	var result []string
	for _, node := range nodes {
		node = strings.TrimSpace(node)
		if node != "" {
			result = append(result, node)
		}
	}

	return result, nil
}
