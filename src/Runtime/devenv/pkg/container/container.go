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
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"altinn.studio/devenv/pkg/container/dockerapi"
	"altinn.studio/devenv/pkg/container/podman"
	"altinn.studio/devenv/pkg/container/types"
)

const dockerContextTimeout = 5 * time.Second

// Cached detection result
var (
	detectMu              sync.Mutex
	detectionSucceeded    bool
	detectedType          runtimeType
	detectedSocketPath    string // cached socket path for runtimePodmanSocket
	detectRuntimeFn       = detectRuntime
	newClientForTypeFn    = newClientForType
	errNoContainerRuntime = errors.New("no container runtime found")
	errUnknownRuntimeType = errors.New("unknown runtime type")
)

type runtimeType int

const (
	runtimeUnknown runtimeType = iota
	runtimeDocker
	runtimePodmanSocket
	runtimePodmanCLI
)

func (rt runtimeType) installation() RuntimeInstallation {
	switch rt {
	case runtimeUnknown:
		return InstallationUnknown
	case runtimeDocker:
		return InstallationDocker
	case runtimePodmanSocket, runtimePodmanCLI:
		return InstallationPodman
	default:
		return InstallationUnknown
	}
}

//nolint:revive // These aliases intentionally preserve the shared types package naming at call sites.
type (
	RuntimeInstallation = types.RuntimeInstallation
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

// Re-exported installation and runtime name constants.
const (
	InstallationUnknown        = types.InstallationUnknown
	InstallationDocker         = types.InstallationDocker
	InstallationPodman         = types.InstallationPodman
	RuntimeNameDockerEngineAPI = types.RuntimeNameDockerEngineAPI
	RuntimeNamePodmanCLI       = types.RuntimeNamePodmanCLI
)

// ContainerClient provides a common interface for docker and podman operations.
//
//nolint:revive,interfacebloat // ContainerClient is the domain term used throughout devenv and intentionally aggregates runtime operations.
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

	// Installation returns the actual container runtime installed.
	// This distinguishes Docker from Podman even when using Docker-compatible API.
	Installation() RuntimeInstallation

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
	detectMu.Lock()
	if !detectionSucceeded {
		rt, socketPath, err := detectRuntimeFn(ctx)
		if err != nil {
			detectMu.Unlock()
			return nil, err
		}
		detectedType = rt
		detectedSocketPath = socketPath
		detectionSucceeded = true
	}
	rt := detectedType
	detectMu.Unlock()

	// Create a new client based on cached detection result
	return newClientForTypeFn(ctx, rt)
}

// detectRuntime performs runtime detection.
func detectRuntime(ctx context.Context) (runtimeType, string, error) {
	// Check if DOCKER_HOST explicitly points to podman
	dockerHost := os.Getenv("DOCKER_HOST")
	if dockerHost != "" && strings.Contains(dockerHost, "podman.sock") {
		// DOCKER_HOST points to podman socket, verify it works
		cli, err := dockerapi.NewPodmanCompat(ctx)
		if err == nil {
			closeClient(cli)
			return runtimePodmanSocket, "", nil
		}
		// Socket specified but not responding, try CLI
		if _, err := exec.LookPath("podman"); err == nil {
			return runtimePodmanCLI, "", nil
		}
	}

	// Try Docker Engine API (checks DOCKER_HOST or default /var/run/docker.sock)
	if cli, err := dockerapi.New(ctx); err == nil {
		closeClient(cli)
		// Check if docker CLI is available
		if _, lookErr := exec.LookPath("docker"); lookErr == nil {
			return runtimeDocker, "", nil
		}
		// Docker API works but docker CLI missing - check for podman CLI
		// This handles podman-mac-helper scenarios where Podman provides
		// Docker-compatible API but only podman CLI is installed
		if _, lookErr := exec.LookPath("podman"); lookErr == nil {
			return runtimePodmanSocket, "", nil
		}
		// Neither CLI available - fall through to other detection methods
	}

	// Try active docker context endpoint.
	// The Docker Go SDK's client.FromEnv does not read docker contexts, only
	// DOCKER_HOST. On macOS, Colima and Docker Desktop register themselves as
	// docker contexts, so we query the active context for the socket endpoint.
	if rt, socketPath, ok := tryDockerContext(ctx); ok {
		return rt, socketPath, nil
	}

	// Try well-known Docker-compatible socket paths (Colima, Docker Desktop)
	if socketPath := findDockerSocket(ctx); socketPath != "" {
		return runtimeDocker, socketPath, nil
	}

	// Try Podman sockets (Docker-compat API)
	if socketPath := findPodmanSocket(ctx); socketPath != "" {
		return runtimePodmanSocket, socketPath, nil
	}

	// Fall back to Podman CLI
	if _, err := exec.LookPath("podman"); err == nil {
		return runtimePodmanCLI, "", nil
	}

	return runtimeUnknown, "", fmt.Errorf(
		"%w (tried Docker API, docker context, Docker-compatible sockets, Podman socket, Podman CLI)",
		errNoContainerRuntime,
	)
}

// newClientForType creates a new client based on the detected runtime type.
func newClientForType(ctx context.Context, rt runtimeType) (ContainerClient, error) {
	install := rt.installation()
	switch rt {
	case runtimeDocker:
		if detectedSocketPath != "" {
			client, err := dockerapi.NewWithHost(ctx, "unix://"+detectedSocketPath)
			if err != nil {
				return nil, fmt.Errorf("create docker client: %w", err)
			}
			return client, nil
		}
		client, err := dockerapi.NewWithInstallation(ctx, install)
		if err != nil {
			return nil, fmt.Errorf("create docker client: %w", err)
		}
		return client, nil
	case runtimePodmanSocket:
		if detectedSocketPath != "" {
			client, err := dockerapi.NewPodmanCompatWithHost(ctx, "unix://"+detectedSocketPath, install)
			if err != nil {
				return nil, fmt.Errorf("create podman socket client: %w", err)
			}
			return client, nil
		}
		client, err := dockerapi.NewPodmanCompatWithInstallation(ctx, install)
		if err != nil {
			return nil, fmt.Errorf("create podman compat client: %w", err)
		}
		return client, nil
	case runtimePodmanCLI:
		client, err := podman.New(ctx)
		if err != nil {
			return nil, fmt.Errorf("create podman client: %w", err)
		}
		return client, nil
	case runtimeUnknown:
		return nil, errUnknownRuntimeType
	default:
		return nil, fmt.Errorf("%w: %d", errUnknownRuntimeType, rt)
	}
}

// tryDockerContext queries the active docker context for its endpoint and tries to connect.
// This handles Colima, Docker Desktop, and other runtimes that register as docker contexts.
func tryDockerContext(ctx context.Context) (runtimeType, string, bool) {
	if _, err := exec.LookPath("docker"); err != nil {
		return runtimeUnknown, "", false
	}

	ctxTimeout, cancel := context.WithTimeout(ctx, dockerContextTimeout)
	defer cancel()

	cmd := exec.CommandContext(ctxTimeout, "docker", "context", "inspect", "--format", "{{.Endpoints.docker.Host}}")
	output, err := cmd.Output()
	if err != nil {
		return runtimeUnknown, "", false
	}

	endpoint := strings.TrimSpace(string(output))
	if endpoint == "" || !strings.HasPrefix(endpoint, "unix://") {
		return runtimeUnknown, "", false
	}

	cli, err := dockerapi.NewWithHost(ctx, endpoint)
	if err != nil {
		return runtimeUnknown, "", false
	}
	closeClient(cli)

	socketPath := strings.TrimPrefix(endpoint, "unix://")
	return runtimeDocker, socketPath, true
}

// findDockerSocket checks well-known Docker-compatible socket paths and returns the first working one.
// This covers Colima and Docker Desktop on macOS when docker CLI is not installed
// (and thus docker context is unavailable).
func findDockerSocket(ctx context.Context) string {
	for _, socketPath := range dockerSocketPaths() {
		if !fileExists(socketPath) {
			continue
		}

		cli, err := dockerapi.NewWithHost(ctx, "unix://"+socketPath)
		if err == nil {
			closeClient(cli)
			return socketPath
		}
	}
	return ""
}

// dockerSocketPaths returns Docker-compatible socket locations to check on macOS.
func dockerSocketPaths() []string {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil
	}

	var paths []string

	// Colima: ~/.colima/<profile>/docker.sock
	colimaDir := filepath.Join(home, ".colima")
	if entries, err := os.ReadDir(colimaDir); err == nil {
		for _, e := range entries {
			if e.IsDir() {
				paths = append(paths, filepath.Join(colimaDir, e.Name(), "docker.sock"))
			}
		}
	}

	// Docker Desktop (newer macOS path): ~/.docker/run/docker.sock
	paths = append(paths, filepath.Join(home, ".docker", "run", "docker.sock"))

	return paths
}

// findPodmanSocket checks for available Podman sockets and returns the first working one
func findPodmanSocket(ctx context.Context) string {
	for _, socketPath := range podmanSocketPaths() {
		if !fileExists(socketPath) {
			continue
		}

		cli, err := dockerapi.NewPodmanCompatWithHost(ctx, "unix://"+socketPath, InstallationPodman)
		if err == nil {
			closeClient(cli)
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

//nolint:errcheck,gosec // Runtime detection cleanup is best-effort.
func closeClient(cli interface{ Close() error }) {
	cli.Close()
}

// Compile-time interface checks.
var (
	_ ContainerClient = (*dockerapi.Client)(nil)
	_ ContainerClient = (*podman.Client)(nil)
)
