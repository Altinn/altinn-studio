package types

import "errors"

// ErrContainerNotFound is returned when a container does not exist.
var ErrContainerNotFound = errors.New("container not found")

// Runtime name constants returned by ContainerClient.Name()
const (
	RuntimeNameDockerEngineAPI = "Docker Engine API"
	RuntimeNamePodmanCLI       = "Podman CLI"
)

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
	Network       string // initial network to attach
	RestartPolicy string // "no", "always", "on-failure", "unless-stopped"
	Detach        bool
	Labels        map[string]string
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
