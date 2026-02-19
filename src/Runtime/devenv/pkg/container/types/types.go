package types

import "errors"

// ErrContainerNotFound is returned when a container does not exist.
var ErrContainerNotFound = errors.New("container not found")

// ErrNetworkNotFound is returned when a network does not exist.
var ErrNetworkNotFound = errors.New("network not found")

// ErrImageNotFound is returned when an image does not exist.
var ErrImageNotFound = errors.New("image not found")

// defaultPodmanCapabilities are capabilities that Docker includes by default but Podman doesn't.
// Adding these ensures consistent behavior across runtimes.
// See: https://github.com/containers/common/pull/1240
var defaultPodmanCapabilities = [...]string{"NET_RAW", "MKNOD", "AUDIT_WRITE"}

// DefaultPodmanCapabilities returns a copy of default Podman capabilities.
// Returning a copy prevents accidental global mutation by callers.
func DefaultPodmanCapabilities() []string {
	caps := make([]string, len(defaultPodmanCapabilities))
	copy(caps, defaultPodmanCapabilities[:])
	return caps
}

// MergeCapabilities combines default capabilities with explicit ones, removing duplicates.
func MergeCapabilities(defaults, explicit []string) []string {
	seen := make(map[string]bool)
	var result []string

	for _, cap := range defaults {
		if !seen[cap] {
			seen[cap] = true
			result = append(result, cap)
		}
	}
	for _, cap := range explicit {
		if !seen[cap] {
			seen[cap] = true
			result = append(result, cap)
		}
	}
	return result
}

// Runtime name constants returned by ContainerClient.Name()
const (
	RuntimeNameDockerEngineAPI = "Docker Engine API"
	RuntimeNamePodmanCLI       = "Podman CLI"
)

// RuntimeInstallation represents the actual container runtime installed on the system.
// This is independent of the transport mechanism used to communicate with the runtime.
type RuntimeInstallation int

const (
	InstallationUnknown RuntimeInstallation = iota
	InstallationDocker
	InstallationPodman
)

func (i RuntimeInstallation) String() string {
	switch i {
	case InstallationDocker:
		return "Docker"
	case InstallationPodman:
		return "Podman"
	default:
		return "Unknown"
	}
}

// PortMapping defines a container port binding
type PortMapping struct {
	HostIP        string // e.g., "127.0.0.1" or "" for all interfaces
	HostPort      string
	ContainerPort string
	Protocol      string // "tcp" or "udp", defaults to "tcp"
}

// VolumeMount defines a bind mount
type VolumeMount struct {
	HostPath      string
	ContainerPath string
	ReadOnly      bool
}

// ContainerConfig defines options for creating a container
type ContainerConfig struct {
	Name          string
	Image         string
	Command       []string // optional override
	Env           []string // KEY=VALUE pairs
	Ports         []PortMapping
	Volumes       []VolumeMount
	ExtraHosts    []string // "hostname:ip" pairs (e.g., "host.docker.internal:172.17.0.1")
	Networks      []string // networks to attach (first is primary)
	RestartPolicy string   // "no", "always", "on-failure", "unless-stopped"
	Detach        bool
	Labels        map[string]string
	User          string   // "uid:gid" to run as (e.g., "1000:1000")
	CapAdd        []string // Linux capabilities to add (e.g., "NET_RAW", "MKNOD")
}

// ImageInfo contains metadata about an image
type ImageInfo struct {
	ID   string // image ID (sha256:...)
	Size int64  // image size in bytes
}

// ContainerState represents the state of a container.
type ContainerState struct {
	Status   string // "created", "running", "paused", "restarting", "removing", "exited", "dead"
	Running  bool
	Paused   bool
	ExitCode int
}

// ContainerInfo contains detailed information about a container.
type ContainerInfo struct {
	ID      string
	Name    string
	Image   string // image reference used to create the container
	ImageID string // resolved image ID (sha256:...)
	Labels  map[string]string
	State   ContainerState
}

// NetworkConfig defines options for creating a network.
type NetworkConfig struct {
	Name   string
	Driver string // "bridge", "host", "none" (default: "bridge")
	Labels map[string]string
}

// NetworkInfo contains information about a network.
type NetworkInfo struct {
	ID     string
	Name   string
	Driver string
	Labels map[string]string
}
