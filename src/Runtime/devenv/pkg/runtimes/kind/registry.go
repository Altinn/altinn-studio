package kind

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
)

var isCI = os.Getenv("CI") != ""

const (
	registryName   = "kind-registry"
	registryPort   = "5001"
	configFilePerm = 0o600

	registryDockerName = "kind-registry-docker"
	registryDockerPort = "5002"
	registryK8sName    = "kind-registry-k8s"
	registryK8sPort    = "5003"
	registryGhcrName   = "kind-registry-ghcr"
	registryGhcrPort   = "5004"
)

func addProxyRegistries(
	graph *resource.Graph,
	cachePath string,
	image *resource.PulledImage,
	proxyEnabled *bool,
) ([]resource.KindRegistryMirror, error) {
	proxies := []struct {
		name      string
		host      string
		hostPort  string
		remoteURL string
	}{
		{registryDockerName, "docker.io", registryDockerPort, "https://registry-1.docker.io"},
		{registryK8sName, "registry.k8s.io", registryK8sPort, "https://registry.k8s.io"},
		{registryGhcrName, "ghcr.io", registryGhcrPort, "https://ghcr.io"},
	}

	mirrors := make([]resource.KindRegistryMirror, 0, len(proxies))
	for _, proxy := range proxies {
		config := proxyRegistryConfigFile(cachePath, proxy.name, proxy.remoteURL, proxyEnabled)
		if err := addRuntimeResource(graph, config); err != nil {
			return nil, fmt.Errorf("add proxy registry config %s: %w", proxy.name, err)
		}
		container := proxyRegistryContainer(image, config, proxy.name, proxy.hostPort, proxyEnabled)
		if err := addRuntimeResource(graph, container); err != nil {
			return nil, fmt.Errorf("add proxy registry container %s: %w", proxy.name, err)
		}
		mirrors = append(mirrors, resource.KindRegistryMirror{
			Enabled:  proxyEnabled,
			Host:     proxy.host,
			Endpoint: resource.Ref(container),
			Upstream: proxy.remoteURL,
		})
	}
	return mirrors, nil
}

func registryContainer(image *resource.PulledImage) *resource.Container {
	return &resource.Container{
		Name:          registryName,
		Image:         resource.Ref(image),
		RestartPolicy: "always",
		Ports: []types.PortMapping{
			{
				HostIP:        "127.0.0.1",
				HostPort:      registryPort,
				ContainerPort: "5000",
			},
		},
		HealthCheck: registryHealthCheck(),
		Lifecycle: resource.ContainerLifecycleOptions{
			WaitForReady: true,
		},
	}
}

func proxyRegistryConfigFile(cachePath, name, remoteURL string, proxyEnabled *bool) *resource.LocalFile {
	return &resource.LocalFile{
		Enabled: proxyEnabled,
		Name:    "registry-config-" + name,
		Path:    filepath.Join(cachePath, "registry-configs", name, "config.yml"),
		Content: []byte(getRegistryProxyConfig(remoteURL)),
		Mode:    configFilePerm,
	}
}

func proxyRegistryContainer(
	image *resource.PulledImage,
	config *resource.LocalFile,
	name string,
	hostPort string,
	proxyEnabled *bool,
) *resource.Container {
	return &resource.Container{
		Enabled:       proxyEnabled,
		Name:          name,
		Image:         resource.Ref(image),
		RestartPolicy: "always",
		DependsOn:     resource.Deps(config),
		Ports: []types.PortMapping{
			{
				HostIP:        "127.0.0.1",
				HostPort:      hostPort,
				ContainerPort: "5000",
			},
		},
		Volumes: []types.VolumeMount{
			{
				HostPath:      config.Path,
				ContainerPath: "/etc/docker/registry/config.yml",
				Type:          types.VolumeMountTypeBind,
			},
		},
		HealthCheck: registryHealthCheck(),
		Lifecycle: resource.ContainerLifecycleOptions{
			WaitForReady: true,
		},
	}
}

func registryHealthCheck() *types.HealthCheck {
	return &types.HealthCheck{
		Test:        []string{"CMD-SHELL", "wget -q -O- http://localhost:5000/v2/ >/dev/null"},
		Interval:    1 * time.Second,
		Timeout:     1 * time.Second,
		Retries:     registryHealthCheckRetries,
		StartPeriod: 1 * time.Second,
	}
}

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
