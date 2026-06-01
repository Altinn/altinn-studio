package container

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"altinn.studio/devenv/pkg/container/dockerapi"
	"altinn.studio/devenv/pkg/container/podman"
	"altinn.studio/devenv/pkg/processutil"
)

const dockerContextTimeout = 5 * time.Second

// EnvContainerToolchain overrides automatic container toolchain detection.
const EnvContainerToolchain = "STUDIO_CONTAINER_TOOLCHAIN"

type detectorDeps struct {
	lookupPath             func(string) (string, error)
	detectPlatform         func(context.Context) (ContainerPlatform, error)
	detectPlatformWithHost func(context.Context, string) (ContainerPlatform, error)
	dockerContextHost      func(context.Context) (string, error)
	dockerSocketPaths      func() []string
	podmanSocketPaths      func() []string
	fileExists             func(string) bool
	newClient              func(context.Context, ContainerToolchain) (ContainerClient, error)
}

type detector struct {
	deps               detectorDeps
	toolchain          ContainerToolchain
	mu                 sync.Mutex
	detectionSucceeded bool
}

var (
	defaultDetector       = newDetector(detectorDeps{})
	errNoContainerRuntime = errors.New("no container runtime found")
	errUnsupportedTool    = errors.New("unsupported container toolchain")
	errUnknownTransport   = errors.New("unknown container transport")
)

type toolchainPreference string

const (
	toolchainPreferenceAuto                  toolchainPreference = "auto"
	toolchainPreferenceDocker                toolchainPreference = "docker"
	toolchainPreferenceColima                toolchainPreference = "colima"
	toolchainPreferencePodman                toolchainPreference = "podman"
	toolchainPreferencePodmanCLI             toolchainPreference = "podman-cli"
	toolchainPreferencePodmanDockerEngineAPI toolchainPreference = "podman-docker-engine-api"
)

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
	return defaultDetector.Detect(ctx)
}

// Detect resolves and caches the available container runtime.
func (d *detector) Detect(ctx context.Context) (ContainerClient, error) {
	d.mu.Lock()
	if !d.detectionSucceeded {
		toolchain, err := d.detectToolchain(ctx)
		if err != nil {
			d.mu.Unlock()
			return nil, err
		}
		d.toolchain = toolchain
		d.detectionSucceeded = true
	}
	toolchain := d.toolchain
	d.mu.Unlock()

	return d.deps.newClient(ctx, toolchain)
}

func newDetector(deps detectorDeps) *detector {
	if deps.lookupPath == nil {
		deps.lookupPath = exec.LookPath
	}
	if deps.detectPlatform == nil {
		deps.detectPlatform = dockerapi.DetectPlatform
	}
	if deps.detectPlatformWithHost == nil {
		deps.detectPlatformWithHost = dockerapi.DetectPlatformWithHost
	}
	if deps.dockerContextHost == nil {
		deps.dockerContextHost = activeDockerContextHost
	}
	if deps.dockerSocketPaths == nil {
		deps.dockerSocketPaths = dockerSocketPaths
	}
	if deps.podmanSocketPaths == nil {
		deps.podmanSocketPaths = podmanSocketPaths
	}
	if deps.fileExists == nil {
		deps.fileExists = fileExists
	}
	if deps.newClient == nil {
		deps.newClient = newClientForTransport
	}

	return &detector{deps: deps}
}

func (d *detector) detectToolchain(ctx context.Context) (ContainerToolchain, error) {
	preference, err := toolchainPreferenceFromEnv()
	if err != nil {
		return ContainerToolchain{}, err
	}

	switch preference {
	case toolchainPreferenceAuto:
		return d.detectAutoToolchain(ctx)
	case toolchainPreferenceDocker:
		return d.detectDockerEngineAPIPlatform(ctx, preference, PlatformDocker)
	case toolchainPreferenceColima:
		return d.detectDockerEngineAPIPlatform(ctx, preference, PlatformColima)
	case toolchainPreferencePodman:
		if toolchain, err := d.detectDockerEngineAPIPlatform(ctx, preference, PlatformPodman); err == nil {
			return toolchain, nil
		}
		if toolchain, ok := d.detectPodmanCLIToolchain(); ok {
			return toolchain, nil
		}
		return ContainerToolchain{}, noRuntimeForPreference(preference)
	case toolchainPreferencePodmanCLI:
		if toolchain, ok := d.detectPodmanCLIToolchain(); ok {
			return toolchain, nil
		}
		return ContainerToolchain{}, noRuntimeForPreference(preference)
	case toolchainPreferencePodmanDockerEngineAPI:
		return d.detectDockerEngineAPIPlatform(ctx, preference, PlatformPodman)
	default:
		return ContainerToolchain{}, noRuntimeForPreference(preference)
	}
}

func toolchainPreferenceFromEnv() (toolchainPreference, error) {
	raw := strings.TrimSpace(os.Getenv(EnvContainerToolchain))
	if raw == "" {
		return toolchainPreferenceAuto, nil
	}

	preference := toolchainPreference(strings.ToLower(raw))
	switch preference {
	case toolchainPreferenceAuto,
		toolchainPreferenceDocker,
		toolchainPreferenceColima,
		toolchainPreferencePodman,
		toolchainPreferencePodmanCLI,
		toolchainPreferencePodmanDockerEngineAPI:
		return preference, nil
	default:
		return "", fmt.Errorf(
			"%w: %s=%q (supported: auto, docker, colima, podman, podman-cli, podman-docker-engine-api)",
			errUnsupportedTool,
			EnvContainerToolchain,
			raw,
		)
	}
}

func (d *detector) detectAutoToolchain(ctx context.Context) (ContainerToolchain, error) {
	dockerHost := strings.TrimSpace(os.Getenv("DOCKER_HOST"))
	if dockerHost != "" {
		if toolchain, ok := d.detectDefaultToolchain(ctx, true); ok {
			return toolchain, nil
		}
		return ContainerToolchain{}, fmt.Errorf("%w (DOCKER_HOST=%q)", errNoContainerRuntime, dockerHost)
	}

	if toolchain, ok := d.detectDefaultToolchain(ctx, false); ok {
		return toolchain, nil
	}

	if toolchain, ok := d.tryDockerContext(ctx); ok {
		return toolchain, nil
	}
	if toolchain, ok := d.findDockerSocket(ctx); ok {
		return toolchain, nil
	}
	if toolchain, ok := d.findPodmanSocket(ctx); ok {
		return toolchain, nil
	}

	if _, err := d.deps.lookupPath("podman"); err == nil {
		return ContainerToolchain{
			Platform:   PlatformPodman,
			AccessMode: AccessPodmanCLI,
			Source:     SourcePodmanCLI,
			SocketPath: "",
			SELinux:    false,
		}, nil
	}

	return ContainerToolchain{}, fmt.Errorf(
		"%w (tried Docker API, docker context, Docker-compatible sockets, Podman socket, Podman CLI)",
		errNoContainerRuntime,
	)
}

func (d *detector) detectDockerEngineAPIPlatform(
	ctx context.Context,
	preference toolchainPreference,
	platform ContainerPlatform,
) (ContainerToolchain, error) {
	dockerHost := strings.TrimSpace(os.Getenv("DOCKER_HOST"))
	if toolchain, ok := d.detectDefaultToolchain(ctx, dockerHost != ""); ok && toolchain.Platform == platform {
		return toolchain, nil
	}
	if toolchain, ok := d.tryDockerContext(ctx); ok && toolchain.Platform == platform {
		return toolchain, nil
	}
	if toolchain, ok := d.findDockerSocketPlatform(ctx, platform); ok {
		return toolchain, nil
	}
	if toolchain, ok := d.findPodmanSocket(ctx); ok && toolchain.Platform == platform {
		return toolchain, nil
	}

	return ContainerToolchain{}, noRuntimeForPreference(preference)
}

func (d *detector) detectPodmanCLIToolchain() (ContainerToolchain, bool) {
	if _, err := d.deps.lookupPath("podman"); err != nil {
		return ContainerToolchain{}, false
	}

	return ContainerToolchain{
		Platform:   PlatformPodman,
		AccessMode: AccessPodmanCLI,
		Source:     SourcePodmanCLI,
		SocketPath: "",
		SELinux:    false,
	}, true
}

func noRuntimeForPreference(preference toolchainPreference) error {
	return fmt.Errorf("%w for %s=%q", errNoContainerRuntime, EnvContainerToolchain, preference)
}

func newClientForTransport(ctx context.Context, toolchain ContainerToolchain) (ContainerClient, error) {
	switch toolchain.AccessMode {
	case AccessDockerEngineAPI:
		if toolchain.SocketPath != "" {
			client, err := dockerapi.NewWithHost(ctx, "unix://"+toolchain.SocketPath, toolchain)
			if err != nil {
				return nil, fmt.Errorf("create container client: %w", err)
			}
			return client, nil
		}
		client, err := dockerapi.New(ctx, toolchain)
		if err != nil {
			return nil, fmt.Errorf("create container client: %w", err)
		}
		return client, nil
	case AccessPodmanCLI:
		client, err := podman.New(ctx, toolchain)
		if err != nil {
			return nil, fmt.Errorf("create podman client: %w", err)
		}
		return client, nil
	case AccessUnknown:
		return nil, errUnknownTransport
	default:
		return nil, fmt.Errorf("%w: %d", errUnknownTransport, toolchain.AccessMode)
	}
}

func (d *detector) tryDockerContext(ctx context.Context) (ContainerToolchain, bool) {
	if !d.runtimeCLIExists("docker") {
		return ContainerToolchain{}, false
	}

	endpoint, ok := d.tryDockerContextEndpoint(ctx)
	if endpoint == "" || !strings.HasPrefix(endpoint, "unix://") {
		return ContainerToolchain{}, false
	}
	if !ok {
		return ContainerToolchain{}, false
	}

	return d.detectHostToolchain(ctx, endpoint, SourceDockerContext)
}

func (d *detector) findDockerSocket(ctx context.Context) (ContainerToolchain, bool) {
	for _, socketPath := range d.deps.dockerSocketPaths() {
		if !d.deps.fileExists(socketPath) {
			continue
		}

		toolchain, ok := d.detectHostToolchain(ctx, "unix://"+socketPath, SourceKnownSocket)
		if ok {
			return toolchain, true
		}
	}
	return ContainerToolchain{}, false
}

func (d *detector) findDockerSocketPlatform(
	ctx context.Context,
	platform ContainerPlatform,
) (ContainerToolchain, bool) {
	for _, socketPath := range d.deps.dockerSocketPaths() {
		if !d.deps.fileExists(socketPath) {
			continue
		}

		toolchain, ok := d.detectHostToolchain(ctx, "unix://"+socketPath, SourceKnownSocket)
		if ok && toolchain.Platform == platform {
			return toolchain, true
		}
	}
	return ContainerToolchain{}, false
}

func dockerSocketPaths() []string {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil
	}

	var paths []string

	colimaDir := filepath.Join(home, ".colima")
	if entries, err := os.ReadDir(colimaDir); err == nil {
		for _, e := range entries {
			if e.IsDir() {
				paths = append(paths, filepath.Join(colimaDir, e.Name(), "docker.sock"))
			}
		}
	}

	paths = append(paths, filepath.Join(home, ".docker", "run", "docker.sock"))

	return paths
}

func (d *detector) findPodmanSocket(ctx context.Context) (ContainerToolchain, bool) {
	for _, socketPath := range d.deps.podmanSocketPaths() {
		if !d.deps.fileExists(socketPath) {
			continue
		}

		toolchain, ok := d.detectHostToolchain(ctx, "unix://"+socketPath, SourceKnownSocket)
		if !ok {
			continue
		}
		if toolchain.Platform == PlatformPodman {
			return toolchain, true
		}
	}
	return ContainerToolchain{}, false
}

func podmanSocketPaths() []string {
	var paths []string

	if xdg := os.Getenv("XDG_RUNTIME_DIR"); xdg != "" {
		paths = append(paths, filepath.Join(xdg, "podman", "podman.sock"))
	}

	paths = append(paths, fmt.Sprintf("/run/user/%d/podman/podman.sock", os.Getuid()))
	paths = append(paths, "/run/podman/podman.sock")

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

func (d *detector) detectDefaultToolchain(
	ctx context.Context,
	explicitDockerHost bool,
) (ContainerToolchain, bool) {
	platform, ok := d.tryDetectPlatform(ctx)
	if platform == PlatformUnknown {
		return ContainerToolchain{}, false
	}
	if !ok {
		return ContainerToolchain{}, false
	}

	source := SourceDefault
	if explicitDockerHost {
		source = SourceDockerHostEnv
	}

	return d.newToolchain(platform, AccessDockerEngineAPI, source, ""), true
}

func (d *detector) detectHostToolchain(
	ctx context.Context,
	host string,
	source DetectionSource,
) (ContainerToolchain, bool) {
	platform, ok := d.tryDetectPlatformWithHost(ctx, host)
	if platform == PlatformUnknown {
		return ContainerToolchain{}, false
	}
	if !ok {
		return ContainerToolchain{}, false
	}

	return d.newToolchain(
		platform,
		AccessDockerEngineAPI,
		source,
		strings.TrimPrefix(host, "unix://"),
	), true
}

func (d *detector) newToolchain(
	platform ContainerPlatform,
	accessMode ContainerAccessMode,
	source DetectionSource,
	socketPath string,
) ContainerToolchain {
	return ContainerToolchain{
		Platform:   platform,
		AccessMode: accessMode,
		Source:     source,
		SocketPath: socketPath,
		SELinux:    false,
	}
}

func activeDockerContextHost(ctx context.Context) (string, error) {
	ctxTimeout, cancel := context.WithTimeout(ctx, dockerContextTimeout)
	defer cancel()

	cmd := processutil.CommandContext(
		ctxTimeout,
		"docker",
		"context",
		"inspect",
		"--format",
		"{{.Endpoints.docker.Host}}",
	)
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("inspect docker context host: %w", err)
	}

	return strings.TrimSpace(string(output)), nil
}

func (d *detector) runtimeCLIExists(name string) bool {
	_, err := d.deps.lookupPath(name)
	return err == nil
}

func (d *detector) tryDockerContextEndpoint(ctx context.Context) (string, bool) {
	endpoint, err := d.deps.dockerContextHost(ctx)
	if err != nil {
		return "", false
	}
	return endpoint, true
}

func (d *detector) tryDetectPlatform(ctx context.Context) (ContainerPlatform, bool) {
	platform, err := d.deps.detectPlatform(ctx)
	if err != nil {
		return PlatformUnknown, false
	}
	return platform, true
}

func (d *detector) tryDetectPlatformWithHost(ctx context.Context, host string) (ContainerPlatform, bool) {
	platform, err := d.deps.detectPlatformWithHost(ctx, host)
	if err != nil {
		return PlatformUnknown, false
	}
	return platform, true
}

// Compile-time interface checks.
var (
	_ ContainerClient = (*dockerapi.Client)(nil)
	_ ContainerClient = (*podman.Client)(nil)
)
