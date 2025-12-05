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

// stripPodmanProviderMessage removes the "enabling experimental podman provider"
// message that kind outputs when using podman as the container runtime
func stripPodmanProviderMessage(output string) string {
	const podmanMsg = "enabling experimental podman provider"
	lines := strings.Split(output, "\n")
	var filtered []string
	for _, line := range lines {
		if strings.TrimSpace(line) != podmanMsg {
			filtered = append(filtered, line)
		}
	}
	return strings.Join(filtered, "\n")
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
		return nil, fmt.Errorf("kind get clusters failed: %s: %w", stripPodmanProviderMessage(string(output)), err)
	}
	filtered := stripPodmanProviderMessage(string(output))
	if strings.Contains(filtered, "No kind clusters found") {
		return []string{}, nil
	}

	clusters := strings.Split(strings.TrimSpace(filtered), "\n")
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
		filtered := stripPodmanProviderMessage(string(output))
		if len(filtered) > 0 {
			fmt.Printf("Command output:\n%s\n", filtered)
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
		return fmt.Errorf("failed to delete cluster: %w\nOutput: %s", err, stripPodmanProviderMessage(string(output)))
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

	filtered := stripPodmanProviderMessage(string(output))
	nodes := strings.Split(strings.TrimSpace(filtered), "\n")
	var result []string
	for _, node := range nodes {
		node = strings.TrimSpace(node)
		if node != "" {
			result = append(result, node)
		}
	}

	return result, nil
}
