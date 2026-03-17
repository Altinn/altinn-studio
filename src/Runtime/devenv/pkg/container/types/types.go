// Package types defines the shared container runtime data types used across implementations.
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

const runtimeNameUnknown = "Unknown"

const (
	buildCLIDocker = "docker"
	buildCLIPodman = "podman"
)

// ContainerPlatform describes the local container platform product in use.
type ContainerPlatform int

// Supported container platforms.
const (
	PlatformUnknown ContainerPlatform = iota
	PlatformDocker
	PlatformPodman
	PlatformColima
)

func (p ContainerPlatform) String() string {
	switch p {
	case PlatformUnknown:
		return runtimeNameUnknown
	case PlatformDocker:
		return "Docker"
	case PlatformPodman:
		return "Podman"
	case PlatformColima:
		return "Colima"
	default:
		return runtimeNameUnknown
	}
}

// BuildCLI returns the CLI binary used for shell-out build semantics on this platform.
func (p ContainerPlatform) BuildCLI() string {
	switch p {
	case PlatformUnknown:
		return ""
	case PlatformDocker, PlatformColima:
		return buildCLIDocker
	case PlatformPodman:
		return buildCLIPodman
	default:
		return ""
	}
}

// ContainerAccessMode describes how the client communicates with the platform.
type ContainerAccessMode int

// Supported access modes.
const (
	AccessUnknown ContainerAccessMode = iota
	AccessDockerEngineAPI
	AccessPodmanCLI
)

func (m ContainerAccessMode) String() string {
	switch m {
	case AccessUnknown:
		return runtimeNameUnknown
	case AccessDockerEngineAPI:
		return "Docker Engine API"
	case AccessPodmanCLI:
		return "Podman CLI"
	default:
		return runtimeNameUnknown
	}
}

// DetectionSource describes which detection path resolved the selected toolchain.
type DetectionSource int

// Supported detection sources.
const (
	SourceUnknown DetectionSource = iota
	SourceDefault
	SourceDockerHostEnv
	SourceDockerContext
	SourceKnownSocket
	SourcePodmanCLI
)

func (s DetectionSource) String() string {
	switch s {
	case SourceUnknown:
		return runtimeNameUnknown
	case SourceDefault:
		return "Default"
	case SourceDockerHostEnv:
		return "DOCKER_HOST"
	case SourceDockerContext:
		return "Docker Context"
	case SourceKnownSocket:
		return "Known Socket"
	case SourcePodmanCLI:
		return "Podman CLI"
	default:
		return runtimeNameUnknown
	}
}

// ContainerToolchain describes the selected platform and how this package talks to it.
type ContainerToolchain struct {
	SocketPath string
	Platform   ContainerPlatform
	AccessMode ContainerAccessMode
	Source     DetectionSource
}

// PortMapping defines a container port binding.
type PortMapping struct {
	HostIP        string // e.g., "127.0.0.1" or "" for all interfaces
	HostPort      string
	ContainerPort string
	Protocol      string // "tcp" or "udp", defaults to "tcp"
}

// VolumeMount defines a bind mount.
type VolumeMount struct {
	HostPath      string
	ContainerPath string
	ReadOnly      bool
}

// ContainerConfig defines options for creating a container.
type ContainerConfig struct {
	Labels        map[string]string
	Name          string
	Image         string
	User          string
	RestartPolicy string
	ExtraHosts    []string
	Volumes       []VolumeMount
	Networks      []string
	Ports         []PortMapping
	Env           []string
	Command       []string
	CapAdd        []string
	Detach        bool
}

// ImageInfo contains metadata about an image.
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
	Labels map[string]string
	Name   string
	Driver string
}

// NetworkInfo contains information about a network.
type NetworkInfo struct {
	Labels map[string]string
	ID     string
	Name   string
	Driver string
}
