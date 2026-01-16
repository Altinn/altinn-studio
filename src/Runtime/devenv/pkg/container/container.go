// Package container provides a unified interface for Docker and Podman container runtimes.
//
// # Implementation Strategy
//
// This package uses two different approaches for each runtime:
//
//   - Docker: Uses the Docker Engine API via github.com/docker/docker/client SDK.
//     This provides direct socket communication without shelling out.
//
//   - Podman: Uses CLI-based execution. While Podman does offer a Docker-compatible
//     API socket, it's not enabled by default and requires explicit configuration
//     (systemd socket activation or `podman system service`).
//
// # Podman Docker API Compatibility
//
// Podman implements Docker-compatible API endpoints (pkg/api/handlers/compat/ in Podman source).
// When Podman's Docker-compat socket is enabled, the Docker SDK client can connect to it.
// The compatibility is sufficient for common orchestration tasks:
//
//   - Container lifecycle: create, start, stop, remove, inspect, logs
//   - Image operations: pull, push, build
//   - Network and volume management
//
// Caveats:
//   - Some edge cases may differ in behavior
//   - Podman-specific features (pods, rootless nuances) only available via Libpod API
//   - Some Docker-specific features may not be fully implemented
//
// For environments where Podman's Docker socket is available, the docker.Client
// implementation can be reused by pointing DOCKER_HOST to the Podman socket.
package container

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"altinn.studio/devenv/pkg/container/dockerapi"
	"altinn.studio/devenv/pkg/container/podman"
	"altinn.studio/devenv/pkg/container/types"
)

// Cached detection result
var (
	detectOnce   sync.Once
	detectedType runtimeType
	detectErr    error
)

type runtimeType int

const (
	runtimeUnknown runtimeType = iota
	runtimeDocker
	runtimePodmanSocket
	runtimePodmanCLI
)

// Re-export types and constants for convenience
type (
	PortMapping     = types.PortMapping
	VolumeMount     = types.VolumeMount
	ContainerConfig = types.ContainerConfig
	ImageInfo       = types.ImageInfo
	ContainerState  = types.ContainerState
	ContainerInfo   = types.ContainerInfo
	NetworkConfig   = types.NetworkConfig
	NetworkInfo     = types.NetworkInfo
)

// ErrContainerNotFound is returned when a container does not exist.
var ErrContainerNotFound = types.ErrContainerNotFound

// ErrNetworkNotFound is returned when a network does not exist.
var ErrNetworkNotFound = types.ErrNetworkNotFound

const (
	RuntimeNameDockerEngineAPI = types.RuntimeNameDockerEngineAPI
	RuntimeNamePodmanCLI       = types.RuntimeNamePodmanCLI
)

// ContainerClient provides a common interface for docker and podman operations
type ContainerClient interface {
	// Build builds a container image from a Dockerfile
	Build(ctx context.Context, contextPath, dockerfile, tag string) error

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

	// Name returns the runtime name ("docker" or "podman")
	Name() string

	// Close releases resources held by the client
	Close() error
}

// Detect detects which container runtime is available on the system.
// The detection result is cached, but each call returns a new client instance.
//
// Detection strategy (inspired by testcontainers-go):
//  1. Check DOCKER_HOST env var - if set and contains "podman.sock", treat as Podman
//  2. Try Docker Engine API connection (respects DOCKER_HOST, checks default socket)
//  3. Try Podman socket paths (rootless and root)
//  4. Fall back to Podman CLI if socket not available but CLI is
//
// When a Podman socket is detected, it uses the Docker Engine API client since
// Podman implements Docker-compatible API endpoints.
func Detect(ctx context.Context) (ContainerClient, error) {
	detectOnce.Do(func() {
		detectedType, detectErr = detectRuntime(ctx)
	})

	if detectErr != nil {
		return nil, detectErr
	}

	// Create a new client based on cached detection result
	return newClientForType(ctx, detectedType)
}

// detectRuntime performs the actual runtime detection (called once via sync.Once)
func detectRuntime(ctx context.Context) (runtimeType, error) {
	// Check if DOCKER_HOST explicitly points to podman
	dockerHost := os.Getenv("DOCKER_HOST")
	if dockerHost != "" && strings.Contains(dockerHost, "podman.sock") {
		// DOCKER_HOST points to podman socket, verify it works
		cli, err := dockerapi.NewPodmanCompat(ctx)
		if err == nil {
			_ = cli.Close()
			return runtimePodmanSocket, nil
		}
		// Socket specified but not responding, try CLI
		if _, err := exec.LookPath("podman"); err == nil {
			return runtimePodmanCLI, nil
		}
	}

	// Try Docker Engine API (checks DOCKER_HOST or default /var/run/docker.sock)
	if cli, err := dockerapi.New(ctx); err == nil {
		_ = cli.Close()
		// Check if docker CLI is available
		if _, lookErr := exec.LookPath("docker"); lookErr == nil {
			return runtimeDocker, nil
		}
		// Docker API works but docker CLI missing - check for podman CLI
		// This handles podman-mac-helper scenarios where Podman provides
		// Docker-compatible API but only podman CLI is installed
		if _, lookErr := exec.LookPath("podman"); lookErr == nil {
			return runtimePodmanSocket, nil
		}
		// Neither CLI available - fall through to other detection methods
	}

	// Try Podman sockets (Docker-compat API)
	if socketPath := findPodmanSocket(ctx); socketPath != "" {
		return runtimePodmanSocket, nil
	}

	// Fall back to Podman CLI
	if _, err := exec.LookPath("podman"); err == nil {
		return runtimePodmanCLI, nil
	}

	return runtimeUnknown, fmt.Errorf("no container runtime found (tried Docker API, Podman socket, Podman CLI)")
}

// newClientForType creates a new client based on the detected runtime type
func newClientForType(ctx context.Context, rt runtimeType) (ContainerClient, error) {
	switch rt {
	case runtimeDocker:
		return dockerapi.New(ctx)
	case runtimePodmanSocket:
		return dockerapi.NewPodmanCompat(ctx)
	case runtimePodmanCLI:
		return podman.New(ctx)
	default:
		return nil, fmt.Errorf("unknown runtime type")
	}
}

// findPodmanSocket checks for available Podman sockets and returns the first working one
func findPodmanSocket(ctx context.Context) string {
	for _, socketPath := range podmanSocketPaths() {
		if !fileExists(socketPath) {
			continue
		}

		// Set DOCKER_HOST temporarily to try this socket
		oldHost := os.Getenv("DOCKER_HOST")
		_ = os.Setenv("DOCKER_HOST", "unix://"+socketPath)

		cli, err := dockerapi.NewPodmanCompat(ctx)

		// Restore original DOCKER_HOST
		if oldHost != "" {
			_ = os.Setenv("DOCKER_HOST", oldHost)
		} else {
			_ = os.Unsetenv("DOCKER_HOST")
		}

		if err == nil {
			_ = cli.Close()
			return socketPath
		}
	}
	return ""
}

// podmanSocketPaths returns Podman socket locations to check, in order of preference.
func podmanSocketPaths() []string {
	var paths []string

	// Rootless: XDG_RUNTIME_DIR/podman/podman.sock (primary for rootless)
	if xdg := os.Getenv("XDG_RUNTIME_DIR"); xdg != "" {
		paths = append(paths, filepath.Join(xdg, "podman", "podman.sock"))
	}

	// Rootless: /run/user/${uid}/podman/podman.sock
	paths = append(paths, fmt.Sprintf("/run/user/%d/podman/podman.sock", os.Getuid()))

	// Root: /run/podman/podman.sock
	paths = append(paths, "/run/podman/podman.sock")

	// macOS: ~/.local/share/containers/podman/machine/*/podman.sock
	if home, err := os.UserHomeDir(); err == nil {
		machineDir := filepath.Join(home, ".local", "share", "containers", "podman", "machine")
		if entries, err := os.ReadDir(machineDir); err == nil {
			for _, e := range entries {
				if e.IsDir() {
					paths = append(paths, filepath.Join(machineDir, e.Name(), "podman.sock"))
				}
			}
		}
	}

	return paths
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// Compile-time interface checks
var (
	_ ContainerClient = (*dockerapi.Client)(nil)
	_ ContainerClient = (*podman.Client)(nil)
)
