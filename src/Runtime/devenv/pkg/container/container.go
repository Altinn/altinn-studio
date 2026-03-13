// Package container provides a unified interface for Docker and Podman container runtimes.
package container

import (
	"context"
	"io"

	"altinn.studio/devenv/pkg/container/types"
)

//nolint:revive // These aliases intentionally preserve the shared types package naming at call sites.
type (
	ContainerPlatform   = types.ContainerPlatform
	ContainerAccessMode = types.ContainerAccessMode
	DetectionSource     = types.DetectionSource
	ContainerToolchain  = types.ContainerToolchain
	PortMapping         = types.PortMapping
	VolumeMount         = types.VolumeMount
	ContainerConfig     = types.ContainerConfig
	ImageInfo           = types.ImageInfo
	ContainerState      = types.ContainerState
	ContainerInfo       = types.ContainerInfo
	NetworkConfig       = types.NetworkConfig
	NetworkInfo         = types.NetworkInfo
)

// ErrContainerNotFound is returned when a container does not exist.
var ErrContainerNotFound = types.ErrContainerNotFound

// ErrNetworkNotFound is returned when a network does not exist.
var ErrNetworkNotFound = types.ErrNetworkNotFound

// ErrImageNotFound is returned when an image does not exist.
var ErrImageNotFound = types.ErrImageNotFound

// Re-exported platform, access mode, and detection source constants.
const (
	PlatformUnknown       = types.PlatformUnknown
	PlatformDocker        = types.PlatformDocker
	PlatformPodman        = types.PlatformPodman
	PlatformColima        = types.PlatformColima
	AccessUnknown         = types.AccessUnknown
	AccessDockerEngineAPI = types.AccessDockerEngineAPI
	AccessPodmanCLI       = types.AccessPodmanCLI
	SourceUnknown         = types.SourceUnknown
	SourceDefault         = types.SourceDefault
	SourceDockerHostEnv   = types.SourceDockerHostEnv
	SourceDockerContext   = types.SourceDockerContext
	SourceKnownSocket     = types.SourceKnownSocket
	SourcePodmanCLI       = types.SourcePodmanCLI
)

// ContainerClient provides a common interface for docker and podman operations.
//
//nolint:revive,interfacebloat // ContainerClient is the domain term used throughout devenv and intentionally aggregates runtime operations.
type ContainerClient interface {
	// Build builds a container image from a Dockerfile
	Build(ctx context.Context, contextPath, dockerfile, tag string) error

	// BuildWithProgress builds a container image and emits best-effort progress updates.
	BuildWithProgress(
		ctx context.Context,
		contextPath, dockerfile, tag string,
		onProgress types.ProgressHandler,
	) error

	// Push pushes an image to a registry
	Push(ctx context.Context, image string) error

	// CreateContainer creates and optionally starts a container
	CreateContainer(ctx context.Context, cfg types.ContainerConfig) (containerID string, err error)

	// ContainerState returns the state of a container.
	// Returns ErrContainerNotFound if the container does not exist.
	ContainerState(ctx context.Context, nameOrID string) (types.ContainerState, error)

	// ContainerNetworks returns the networks the container is attached to
	ContainerNetworks(ctx context.Context, nameOrID string) ([]string, error)

	// Exec executes a command in a running container
	Exec(ctx context.Context, container string, cmd []string) error

	// ExecWithIO executes a command with custom I/O streams
	ExecWithIO(ctx context.Context, container string, cmd []string, stdin io.Reader, stdout, stderr io.Writer) error

	// NetworkConnect connects a container to a network
	NetworkConnect(ctx context.Context, network, container string) error

	// ImageInspect returns metadata about an image
	ImageInspect(ctx context.Context, image string) (types.ImageInfo, error)

	// ImagePull pulls an image from a registry
	ImagePull(ctx context.Context, image string) error

	// ImagePullWithProgress pulls an image and emits best-effort progress updates.
	ImagePullWithProgress(ctx context.Context, image string, onProgress types.ProgressHandler) error

	// ContainerInspect returns detailed information about a container.
	// Returns ErrContainerNotFound if the container does not exist.
	ContainerInspect(ctx context.Context, nameOrID string) (types.ContainerInfo, error)

	// ContainerStart starts an existing container
	ContainerStart(ctx context.Context, nameOrID string) error

	// ContainerStop stops a running container.
	// The timeout parameter specifies seconds to wait before killing.
	// If timeout is nil, a default timeout is used.
	ContainerStop(ctx context.Context, nameOrID string, timeout *int) error

	// ContainerRemove removes a container.
	// If force is true, the container is killed before removal.
	ContainerRemove(ctx context.Context, nameOrID string, force bool) error

	// NetworkCreate creates a new network.
	// Returns the network ID.
	NetworkCreate(ctx context.Context, cfg types.NetworkConfig) (string, error)

	// NetworkInspect returns information about a network.
	// Returns ErrNetworkNotFound if the network does not exist.
	NetworkInspect(ctx context.Context, nameOrID string) (types.NetworkInfo, error)

	// NetworkRemove removes a network.
	NetworkRemove(ctx context.Context, nameOrID string) error

	// ContainerLogs returns a stream of container logs.
	// If follow is true, the stream will continue until the context is cancelled.
	// If tail is non-empty, it limits the number of lines from the end (e.g., "100" or "all").
	ContainerLogs(ctx context.Context, nameOrID string, follow bool, tail string) (io.ReadCloser, error)

	// ContainerWait blocks until the container exits and returns the exit code.
	ContainerWait(ctx context.Context, nameOrID string) (exitCode int, err error)

	// Toolchain returns the selected platform and access mode.
	Toolchain() ContainerToolchain

	// Close releases resources held by the client
	Close() error
}
