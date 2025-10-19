package kind

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
)

const (
	registryName = "kind-registry"
	registryPort = "5001"

	// Proxy registries
	registryDockerName = "kind-registry-docker"
	registryDockerPort = "5002"
	registryK8sName    = "kind-registry-k8s"
	registryK8sPort    = "5003"
	registryGhcrName   = "kind-registry-ghcr"
	registryGhcrPort   = "5004"
)

// getRegistryProxyConfig generates a Docker Registry v2 config.yml for pull-through caching
func getRegistryProxyConfig(remoteURL string) string {
	return fmt.Sprintf(`version: 0.1
log:
  fields:
    service: registry
storage:
  cache:
    blobdescriptor: inmemory
  filesystem:
    rootdirectory: /var/lib/registry
http:
  addr: :5000
  headers:
    X-Content-Type-Options: [nosniff]
health:
  storagedriver:
    enabled: true
    interval: 10s
    threshold: 3
proxy:
  remoteurl: %s
`, remoteURL)
}

// isRegistryRunning checks if the registry container is running
func (r *KindContainerRuntime) isRegistryRunning() (bool, error) {
	output, err := r.ContainerClient.Inspect(registryName, "{{.State.Running}}")
	if err != nil {
		// Container doesn't exist
		return false, nil
	}

	return output == "true", nil
}

// createRegistry creates and starts the registry container
func (r *KindContainerRuntime) createRegistry() error {
	fmt.Printf("Creating registry container %s...\n", registryName)

	args := []string{
		"run",
		"-d",
		"--restart=always",
		"-p", fmt.Sprintf("127.0.0.1:%s:5000", registryPort),
		"--network", "bridge",
		"--name", registryName,
		"registry:2",
	}

	if err := r.ContainerClient.Run(args...); err != nil {
		return fmt.Errorf("failed to create registry container: %w", err)
	}

	fmt.Printf("✓ Registry container %s created\n", registryName)
	return nil
}

// createProxyRegistry creates and starts a proxy registry container
func (r *KindContainerRuntime) createProxyRegistry(name, hostPort, remoteURL string) error {
	fmt.Printf("Creating proxy registry %s for %s...\n", name, remoteURL)

	// Create config directory for this registry
	configDir := filepath.Join(r.cachePath, "registry-configs", name)
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	// Write config.yml
	configPath := filepath.Join(configDir, "config.yml")
	configContent := getRegistryProxyConfig(remoteURL)
	if err := os.WriteFile(configPath, []byte(configContent), 0644); err != nil {
		return fmt.Errorf("failed to write registry config: %w", err)
	}

	// Start registry container with config volume mount
	args := []string{
		"run",
		"-d",
		"--restart=always",
		"-p", fmt.Sprintf("127.0.0.1:%s:5000", hostPort),
		"--network", "bridge",
		"--name", name,
		"-v", fmt.Sprintf("%s:/etc/docker/registry/config.yml", configPath),
		"registry:2",
	}

	if err := r.ContainerClient.Run(args...); err != nil {
		return fmt.Errorf("failed to create proxy registry container: %w", err)
	}

	fmt.Printf("✓ Proxy registry %s created\n", name)
	return nil
}

// isProxyRegistryRunning checks if a proxy registry container is running
func (r *KindContainerRuntime) isProxyRegistryRunning(name string) (bool, error) {
	output, err := r.ContainerClient.Inspect(name, "{{.State.Running}}")
	if err != nil {
		// Container doesn't exist
		return false, nil
	}

	return output == "true", nil
}

// startProxyRegistries ensures all proxy registry containers are running
func (r *KindContainerRuntime) startProxyRegistries() error {
	// Define proxy registries
	proxies := []struct {
		name      string
		hostPort  string
		remoteURL string
	}{
		{registryDockerName, registryDockerPort, "https://registry-1.docker.io"},
		{registryK8sName, registryK8sPort, "https://registry.k8s.io"},
		{registryGhcrName, registryGhcrPort, "https://ghcr.io"},
	}

	for _, proxy := range proxies {
		running, err := r.isProxyRegistryRunning(proxy.name)
		if err != nil {
			return err
		}

		if !running {
			if err := r.createProxyRegistry(proxy.name, proxy.hostPort, proxy.remoteURL); err != nil {
				return err
			}
		} else {
			fmt.Printf("Proxy registry %s already running\n", proxy.name)
		}
	}

	return nil
}

// isRegistryConnectedToKindNetwork checks if the registry is connected to the kind network
func (r *KindContainerRuntime) isRegistryConnectedToKindNetwork() (bool, error) {
	output, err := r.ContainerClient.Inspect(registryName, "{{json .NetworkSettings.Networks.kind}}")
	if err != nil {
		return false, fmt.Errorf("failed to inspect registry network: %w", err)
	}

	return output != "null", nil
}

// connectRegistryToKindNetwork connects the registry container to the kind network
func (r *KindContainerRuntime) connectRegistryToKindNetwork() error {
	// Check if already connected
	connected, err := r.isRegistryConnectedToKindNetwork()
	if err != nil {
		return err
	}

	if connected {
		fmt.Println("Registry already connected to kind network")
		return nil
	}

	fmt.Println("Connecting registry to kind network...")

	if err := r.ContainerClient.NetworkConnect("kind", registryName); err != nil {
		return fmt.Errorf("failed to connect registry to kind network: %w", err)
	}

	fmt.Println("✓ Registry connected to kind network")
	return nil
}

// getKindNodes returns a list of kind cluster nodes
func (r *KindContainerRuntime) getKindNodes() ([]string, error) {
	return r.KindClient.GetNodes(r.clusterName)
}

// configureRegistryInNodes configures containerd in all kind nodes to use the local registry
func (r *KindContainerRuntime) configureRegistryInNodes() error {
	fmt.Println("Configuring registry in kind nodes...")

	nodes, err := r.getKindNodes()
	if err != nil {
		return err
	}

	// Configure localhost:5001 (local registry)
	if err := r.configureRegistryMirror(nodes, fmt.Sprintf("localhost:%s", registryPort), registryName, ""); err != nil {
		return err
	}

	// Configure docker.io mirror
	if err := r.configureRegistryMirror(nodes, "docker.io", registryDockerName, "https://registry-1.docker.io"); err != nil {
		return err
	}

	// Configure registry.k8s.io mirror
	if err := r.configureRegistryMirror(nodes, "registry.k8s.io", registryK8sName, "https://registry.k8s.io"); err != nil {
		return err
	}

	// Configure ghcr.io mirror
	if err := r.configureRegistryMirror(nodes, "ghcr.io", registryGhcrName, "https://ghcr.io"); err != nil {
		return err
	}

	fmt.Printf("✓ Configured registry mirrors in %d nodes\n", len(nodes))
	return nil
}

// configureRegistryMirror configures a registry mirror in all kind nodes
func (r *KindContainerRuntime) configureRegistryMirror(nodes []string, registry, mirrorName, upstreamURL string) error {
	registryDir := fmt.Sprintf("/etc/containerd/certs.d/%s", registry)

	// Create the hosts.toml content
	var hostsToml string
	if upstreamURL != "" {
		// For external registries with upstream fallback
		hostsToml = fmt.Sprintf(`server = "%s"

[host."http://%s:5000"]
  capabilities = ["pull", "resolve"]
`, upstreamURL, mirrorName)
	} else {
		// For localhost registry (no fallback)
		hostsToml = fmt.Sprintf("[host.\"http://%s:5000\"]\n", mirrorName)
	}

	for _, node := range nodes {
		// Create registry directory in node
		if err := r.ContainerClient.Exec(node, "mkdir", "-p", registryDir); err != nil {
			return fmt.Errorf("failed to create registry dir in node %s: %w", node, err)
		}

		// Write hosts.toml to node
		if err := r.ContainerClient.ExecWithStdin(node, bytes.NewBufferString(hostsToml), "cp", "/dev/stdin", fmt.Sprintf("%s/hosts.toml", registryDir)); err != nil {
			return fmt.Errorf("failed to write hosts.toml in node %s: %w", node, err)
		}
	}

	return nil
}

// createRegistryConfigMap creates a ConfigMap documenting the local registry
func (r *KindContainerRuntime) createRegistryConfigMap() error {
	fmt.Println("Creating local-registry-hosting ConfigMap...")

	configMapYAML := fmt.Sprintf(`apiVersion: v1
kind: ConfigMap
metadata:
  name: local-registry-hosting
  namespace: kube-public
data:
  localRegistryHosting.v1: |
    host: "localhost:%s"
    help: "https://kind.sigs.k8s.io/docs/user/local-registry/"
`, registryPort)

	if err := r.KubernetesClient.ApplyManifest(configMapYAML); err != nil {
		return fmt.Errorf("failed to create registry ConfigMap: %w", err)
	}

	fmt.Println("✓ Registry ConfigMap created")
	return nil
}

// startRegistry ensures the container registry is running and configured
// This function is idempotent - it can be called multiple times safely
func (r *KindContainerRuntime) startRegistry() error {
	// Check if registry is running
	running, err := r.isRegistryRunning()
	if err != nil {
		return err
	}

	// Create registry if not running
	if !running {
		if err := r.createRegistry(); err != nil {
			return err
		}
	} else {
		fmt.Printf("Registry %s already running\n", registryName)
	}

	// Start proxy registries for pull-through caching
	if err := r.startProxyRegistries(); err != nil {
		return fmt.Errorf("failed to start proxy registries: %w", err)
	}

	return nil
}

func (r *KindContainerRuntime) configureRegistry() error {
	// Connect registry to kind network
	if err := r.connectRegistryToKindNetwork(); err != nil {
		return err
	}

	// Connect proxy registries to kind network
	if err := r.connectProxyRegistriesToKindNetwork(); err != nil {
		return err
	}

	// Configure registry in kind nodes
	if err := r.configureRegistryInNodes(); err != nil {
		return err
	}

	// Create registry ConfigMap
	if err := r.createRegistryConfigMap(); err != nil {
		return err
	}

	return nil
}

// connectProxyRegistriesToKindNetwork connects all proxy registries to the kind network
func (r *KindContainerRuntime) connectProxyRegistriesToKindNetwork() error {
	proxyNames := []string{registryDockerName, registryK8sName, registryGhcrName}

	for _, name := range proxyNames {
		// Check if already connected
		output, err := r.ContainerClient.Inspect(name, "{{json .NetworkSettings.Networks.kind}}")
		if err != nil {
			return fmt.Errorf("failed to inspect %s network: %w", name, err)
		}

		if output == "null" {
			fmt.Printf("Connecting %s to kind network...\n", name)
			if err := r.ContainerClient.NetworkConnect("kind", name); err != nil {
				return fmt.Errorf("failed to connect %s to kind network: %w", name, err)
			}
			fmt.Printf("✓ %s connected to kind network\n", name)
		} else {
			fmt.Printf("%s already connected to kind network\n", name)
		}
	}

	return nil
}
