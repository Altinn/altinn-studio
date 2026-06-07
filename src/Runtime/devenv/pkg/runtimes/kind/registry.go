package kind

import (
	"fmt"
	"os"
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
