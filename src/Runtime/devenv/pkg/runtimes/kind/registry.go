package kind

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"altinn.studio/devenv/pkg/container"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var isCI = os.Getenv("CI") != ""

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
func (r *KindContainerRuntime) isRegistryRunning(ctx context.Context) (bool, error) {
	state, err := r.ContainerClient.ContainerState(ctx, registryName)
	if errors.Is(err, container.ErrContainerNotFound) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return state.Running, nil
}

// createRegistry creates and starts the registry container
func (r *KindContainerRuntime) createRegistry(ctx context.Context) error {
	fmt.Printf("Creating registry container %s...\n", registryName)

	cfg := container.ContainerConfig{
		Name:          registryName,
		Image:         "registry:2",
		Detach:        true,
		RestartPolicy: "always",
		Networks:      []string{"bridge"},
		Ports: []container.PortMapping{
			{
				HostIP:        "127.0.0.1",
				HostPort:      registryPort,
				ContainerPort: "5000",
			},
		},
	}

	if _, err := r.ContainerClient.CreateContainer(ctx, cfg); err != nil {
		return fmt.Errorf("failed to create registry container: %w", err)
	}

	fmt.Printf("✓ Registry container %s created\n", registryName)
	return nil
}

// createProxyRegistry creates and starts a proxy registry container
func (r *KindContainerRuntime) createProxyRegistry(ctx context.Context, name, hostPort, remoteURL string) error {
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

	cfg := container.ContainerConfig{
		Name:          name,
		Image:         "registry:2",
		Detach:        true,
		RestartPolicy: "always",
		Networks:      []string{"bridge"},
		Ports: []container.PortMapping{
			{
				HostIP:        "127.0.0.1",
				HostPort:      hostPort,
				ContainerPort: "5000",
			},
		},
		Volumes: []container.VolumeMount{
			{
				HostPath:      configPath,
				ContainerPath: "/etc/docker/registry/config.yml",
			},
		},
	}

	if _, err := r.ContainerClient.CreateContainer(ctx, cfg); err != nil {
		return fmt.Errorf("failed to create proxy registry container: %w", err)
	}

	fmt.Printf("✓ Proxy registry %s created\n", name)
	return nil
}

// isProxyRegistryRunning checks if a proxy registry container is running
func (r *KindContainerRuntime) isProxyRegistryRunning(ctx context.Context, name string) (bool, error) {
	state, err := r.ContainerClient.ContainerState(ctx, name)
	if errors.Is(err, container.ErrContainerNotFound) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return state.Running, nil
}

// startProxyRegistries ensures all proxy registry containers are running
func (r *KindContainerRuntime) startProxyRegistries(ctx context.Context) error {
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
		running, err := r.isProxyRegistryRunning(ctx, proxy.name)
		if err != nil {
			return err
		}

		if !running {
			if err := r.createProxyRegistry(ctx, proxy.name, proxy.hostPort, proxy.remoteURL); err != nil {
				return err
			}
		} else {
			fmt.Printf("Proxy registry %s already running\n", proxy.name)
		}
	}

	return nil
}

// isRegistryConnectedToKindNetwork checks if the registry is connected to the kind network
func (r *KindContainerRuntime) isRegistryConnectedToKindNetwork(ctx context.Context) (bool, error) {
	networks, err := r.ContainerClient.ContainerNetworks(ctx, registryName)
	if err != nil {
		return false, fmt.Errorf("failed to get registry networks: %w", err)
	}
	return slices.Contains(networks, "kind"), nil
}

// connectRegistryToKindNetwork connects the registry container to the kind network
func (r *KindContainerRuntime) connectRegistryToKindNetwork(ctx context.Context) error {
	// Check if already connected
	connected, err := r.isRegistryConnectedToKindNetwork(ctx)
	if err != nil {
		return err
	}

	if connected {
		fmt.Println("Registry already connected to kind network")
		return nil
	}

	fmt.Println("Connecting registry to kind network...")

	if err := r.ContainerClient.NetworkConnect(ctx, "kind", registryName); err != nil {
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
func (r *KindContainerRuntime) configureRegistryInNodes(ctx context.Context) error {
	fmt.Println("Configuring registry in kind nodes...")

	nodes, err := r.getKindNodes()
	if err != nil {
		return err
	}

	// Configure localhost:5001 (local registry)
	if err := r.configureRegistryMirror(ctx, nodes, fmt.Sprintf("localhost:%s", registryPort), registryName, ""); err != nil {
		return err
	}

	if !isCI {
		if err := r.configureRegistryMirror(ctx, nodes, "docker.io", registryDockerName, "https://registry-1.docker.io"); err != nil {
			return err
		}
		if err := r.configureRegistryMirror(ctx, nodes, "registry.k8s.io", registryK8sName, "https://registry.k8s.io"); err != nil {
			return err
		}
		if err := r.configureRegistryMirror(ctx, nodes, "ghcr.io", registryGhcrName, "https://ghcr.io"); err != nil {
			return err
		}
	}

	fmt.Printf("✓ Configured registry mirrors in %d nodes\n", len(nodes))
	return nil
}

// configureRegistryMirror configures a registry mirror in all kind nodes
func (r *KindContainerRuntime) configureRegistryMirror(ctx context.Context, nodes []string, registry, mirrorName, upstreamURL string) error {
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
		if err := r.ContainerClient.Exec(ctx, node, []string{"mkdir", "-p", registryDir}); err != nil {
			return fmt.Errorf("failed to create registry dir in node %s: %w", node, err)
		}

		// Write hosts.toml to node
		if err := r.ContainerClient.ExecWithIO(ctx, node, []string{"cp", "/dev/stdin", fmt.Sprintf("%s/hosts.toml", registryDir)}, bytes.NewBufferString(hostsToml), nil, nil); err != nil {
			return fmt.Errorf("failed to write hosts.toml in node %s: %w", node, err)
		}
	}

	return nil
}

// createRegistryConfigMap creates a ConfigMap documenting the local registry
// returns true if the configmap was added or updated, false otherwise
func (r *KindContainerRuntime) createRegistryConfigMap() (bool, error) {
	fmt.Println("Creating local-registry-hosting ConfigMap...")

	cm := &corev1.ConfigMap{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "ConfigMap",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "local-registry-hosting",
			Namespace: "kube-public",
		},
		Data: map[string]string{
			"localRegistryHosting.v1": fmt.Sprintf(`host: "localhost:%s"
help: "https://kind.sigs.k8s.io/docs/user/local-registry/"
`, registryPort),
		},
	}

	output, err := r.KubernetesClient.ApplyObjects(cm)
	if err != nil {
		return false, fmt.Errorf("failed to create registry ConfigMap: %w", err)
	}

	if strings.Contains(output, "unchanged") {
		fmt.Println("✓ Registry ConfigMap created")
		return false, nil
	} else {
		fmt.Println("✓ Registry ConfigMap changed")
		return true, nil
	}
}

// startRegistry ensures the container registry is running and configured
// This function is idempotent - it can be called multiple times safely
func (r *KindContainerRuntime) startRegistry(ctx context.Context) error {
	// Check if registry is running
	running, err := r.isRegistryRunning(ctx)
	if err != nil {
		return err
	}

	// Create registry if not running
	if !running {
		if err := r.createRegistry(ctx); err != nil {
			return err
		}
	} else {
		fmt.Printf("Registry %s already running\n", registryName)
	}

	if !isCI {
		if err := r.startProxyRegistries(ctx); err != nil {
			return fmt.Errorf("failed to start proxy registries: %w", err)
		}
	}

	return nil
}

func (r *KindContainerRuntime) configureRegistry(ctx context.Context) error {
	if wasChanged, err := r.createRegistryConfigMap(); err != nil {
		return err
	} else if !wasChanged {
		// If we configmap was already there, then we must have configured
		// everything else as well
		return nil
	}

	// Connect registry to kind network
	if err := r.connectRegistryToKindNetwork(ctx); err != nil {
		return err
	}

	if !isCI {
		if err := r.connectProxyRegistriesToKindNetwork(ctx); err != nil {
			return err
		}
	}

	// Configure registry in kind nodes
	if err := r.configureRegistryInNodes(ctx); err != nil {
		return err
	}

	return nil
}

// connectProxyRegistriesToKindNetwork connects all proxy registries to the kind network
func (r *KindContainerRuntime) connectProxyRegistriesToKindNetwork(ctx context.Context) error {
	proxyNames := []string{registryDockerName, registryK8sName, registryGhcrName}

	for _, name := range proxyNames {
		// Check if already connected
		networks, err := r.ContainerClient.ContainerNetworks(ctx, name)
		if err != nil {
			if errors.Is(err, container.ErrContainerNotFound) {
				return fmt.Errorf("proxy registry %s is not running; start proxy registries before configuring networking: %w", name, err)
			}
			return fmt.Errorf("failed to get %s networks: %w", name, err)
		}

		if !slices.Contains(networks, "kind") {
			fmt.Printf("Connecting %s to kind network...\n", name)
			if err := r.ContainerClient.NetworkConnect(ctx, "kind", name); err != nil {
				return fmt.Errorf("failed to connect %s to kind network: %w", name, err)
			}
			fmt.Printf("✓ %s connected to kind network\n", name)
		} else {
			fmt.Printf("%s already connected to kind network\n", name)
		}
	}

	return nil
}
