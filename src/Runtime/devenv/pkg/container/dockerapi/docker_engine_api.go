// Package dockerapi provides a Docker Engine API backed container client.
package dockerapi

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/processutil"

	cerrdefs "github.com/containerd/errdefs"
	dockertypes "github.com/docker/docker/api/types"
	dockercontainer "github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	dockermount "github.com/docker/docker/api/types/mount"
	"github.com/docker/docker/api/types/network"
	systemtypes "github.com/docker/docker/api/types/system"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/jsonmessage"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/docker/go-connections/nat"
)

var (
	errExecExitCode       = errors.New("exec exited with non-zero status")
	errImagePullFailed    = errors.New("image pull failed")
	errWaitWithoutStatus  = errors.New("wait completed without status")
	errContextCancelled   = errors.New("context cancelled while waiting for container")
	errRuntimeCLINotFound = errors.New("container runtime CLI not found")
	errBuildxRequired     = errors.New("docker buildx plugin is required but not installed")
)

// Client implements ContainerClient for Docker using the official SDK.
// It can also connect to Podman's Docker-compatible API socket.
type Client struct {
	cli       *client.Client
	toolchain types.ContainerToolchain
}

// New creates a client with the provided toolchain metadata.
func New(ctx context.Context, toolchain types.ContainerToolchain) (*Client, error) {
	return newClient(ctx, toolchain)
}

func newClient(ctx context.Context, toolchain types.ContainerToolchain) (*Client, error) {
	cli, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create docker client: %w", err)
	}

	// Verify connection by pinging the daemon
	if _, err := cli.Ping(ctx); err != nil {
		closeBestEffort(cli)
		return nil, fmt.Errorf("failed to connect to docker daemon: %w", err)
	}

	return &Client{
		cli:       cli,
		toolchain: normalizeToolchain(toolchain, ""),
	}, nil
}

// NewWithHost creates a client connected to the specified host and toolchain.
func NewWithHost(ctx context.Context, host string, toolchain types.ContainerToolchain) (*Client, error) {
	return newClientWithHost(ctx, toolchain, host)
}

// newClientWithHost is shared implementation using client.WithHost().
func newClientWithHost(ctx context.Context, toolchain types.ContainerToolchain, host string) (*Client, error) {
	opts := []client.Opt{
		client.WithHost(host),
		client.WithAPIVersionNegotiation(),
	}

	cli, err := client.NewClientWithOpts(opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to create docker client: %w", err)
	}

	// Verify connection by pinging the daemon
	if _, err := cli.Ping(ctx); err != nil {
		closeBestEffort(cli)
		return nil, fmt.Errorf("failed to connect to docker daemon: %w", err)
	}

	return &Client{
		cli:       cli,
		toolchain: normalizeToolchain(toolchain, strings.TrimPrefix(host, "unix://")),
	}, nil
}

func normalizeToolchain(toolchain types.ContainerToolchain, socketPath string) types.ContainerToolchain {
	toolchain.AccessMode = types.AccessDockerEngineAPI
	if socketPath != "" {
		toolchain.SocketPath = socketPath
	}
	return toolchain
}

// DetectPlatform probes the daemon reached via environment configuration.
func DetectPlatform(ctx context.Context) (types.ContainerPlatform, error) {
	return detectPlatform(ctx, strings.TrimSpace(os.Getenv("DOCKER_HOST")), client.FromEnv)
}

// DetectPlatformWithHost probes the daemon reached via the specified host.
func DetectPlatformWithHost(ctx context.Context, host string) (types.ContainerPlatform, error) {
	return detectPlatform(ctx, host, client.WithHost(host))
}

// Toolchain returns the resolved platform and access mode metadata.
func (c *Client) Toolchain() types.ContainerToolchain {
	return c.toolchain
}

// Close releases resources held by the client.
func (c *Client) Close() error {
	if err := c.cli.Close(); err != nil {
		return fmt.Errorf("close docker client: %w", err)
	}
	return nil
}

// Build builds a container image from a Dockerfile.
// Uses CLI with BuildKit for proper --platform=$BUILDPLATFORM support in Dockerfiles.
// The Docker Engine API doesn't support BuildKit sessions without complex setup.
func (c *Client) Build(ctx context.Context, contextPath, dockerfile, tag string, opts ...types.BuildOptions) error {
	return c.BuildWithProgress(ctx, contextPath, dockerfile, tag, nil, opts...)
}

// BuildWithProgress builds a container image and emits best-effort progress updates.
func (c *Client) BuildWithProgress(
	ctx context.Context,
	contextPath, dockerfile, tag string,
	onProgress types.ProgressHandler,
	opts ...types.BuildOptions,
) error {
	binary, err := runtimeCLI(c.toolchain.Platform)
	if err != nil {
		return err
	}

	if c.toolchain.Platform == types.PlatformPodman {
		return runIndeterminateBuild(ctx, binary, contextPath, dockerfile, tag, onProgress)
	}
	if !hasBuildx(ctx, binary) {
		return errBuildxRequired
	}

	args := dockerBuildArgs(contextPath, dockerfile, tag, firstBuildOptions(opts))
	cmd := processutil.CommandContext(ctx, binary, args...)
	cmd.Env = append(os.Environ(), "DOCKER_BUILDKIT=1")

	return runStreamingBuild(binary, cmd, onProgress)
}

func dockerBuildArgs(contextPath, dockerfile, tag string, opts types.BuildOptions) []string {
	args := make([]string, 0, 7+2*len(opts.CacheFrom)+2*len(opts.CacheTo)+5)
	if buildxBuild(opts) {
		args = append(args, "buildx", "build", "--load")
	} else {
		args = append(args, "build")
	}
	args = append(args, "--progress", "rawjson", "--provenance=false", "--sbom=false")
	for _, cacheFrom := range opts.CacheFrom {
		args = append(args, "--cache-from", cacheFrom)
	}
	for _, cacheTo := range opts.CacheTo {
		args = append(args, "--cache-to", cacheTo)
	}
	args = append(args,
		"-t", tag,
		"-f", dockerfile,
		contextPath,
	)
	return args
}

func buildxBuild(opts types.BuildOptions) bool {
	return len(opts.CacheFrom) > 0 || len(opts.CacheTo) > 0
}

func firstBuildOptions(opts []types.BuildOptions) types.BuildOptions {
	if len(opts) == 0 {
		return types.BuildOptions{}
	}
	return opts[0]
}

// hasBuildx checks whether the Docker CLI has the buildx plugin installed.
func hasBuildx(ctx context.Context, dockerBinary string) bool {
	out, err := processutil.CommandContext(ctx, dockerBinary, "buildx", "version").CombinedOutput()
	return err == nil && len(out) > 0
}

// Push pushes an image to a registry.
func (c *Client) Push(ctx context.Context, img string) error {
	binary, err := runtimeCLI(c.toolchain.Platform)
	if err != nil {
		return err
	}

	cmd := processutil.CommandContext(ctx, binary, c.toolchain.Platform.PushArgs(img)...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s push failed: %w\nOutput: %s", binary, err, string(output))
	}
	return nil
}

func runtimeCLI(platform types.ContainerPlatform) (string, error) {
	binary := platform.BuildCLI()
	if binary == "" {
		return "", fmt.Errorf("%w for platform %s", errRuntimeCLINotFound, platform)
	}
	if _, err := exec.LookPath(binary); err != nil {
		return "", fmt.Errorf("%w: %s", errRuntimeCLINotFound, binary)
	}
	return binary, nil
}

// CreateContainer creates and optionally starts a container.
//
//nolint:funlen,nestif,gocognit,gocyclo // The Docker container create flow mirrors the underlying API shape.
func (c *Client) CreateContainer(ctx context.Context, cfg types.ContainerConfig) (string, error) {
	// Ensure image exists locally, pull if missing
	_, err := c.cli.ImageInspect(ctx, cfg.Image)
	if err != nil {
		if cerrdefs.IsNotFound(err) {
			if pullErr := c.ImagePull(ctx, cfg.Image); pullErr != nil {
				return "", fmt.Errorf("failed to pull image %s: %w", cfg.Image, pullErr)
			}
		} else {
			return "", fmt.Errorf("failed to inspect image %s: %w", cfg.Image, err)
		}
	}

	// Build port bindings
	portBindings := nat.PortMap{}
	exposedPorts := nat.PortSet{}

	for _, p := range cfg.Ports {
		proto := p.Protocol
		if proto == "" {
			proto = "tcp"
		}
		containerPort := nat.Port(fmt.Sprintf("%s/%s", p.ContainerPort, proto))
		exposedPorts[containerPort] = struct{}{}
		portBindings[containerPort] = append(portBindings[containerPort], nat.PortBinding{
			HostIP:   p.HostIP,
			HostPort: p.HostPort,
		})
	}

	// Build restart policy
	restartPolicy := dockercontainer.RestartPolicy{}
	switch cfg.RestartPolicy {
	case "always":
		restartPolicy.Name = dockercontainer.RestartPolicyAlways
	case "on-failure":
		restartPolicy.Name = dockercontainer.RestartPolicyOnFailure
	case "unless-stopped":
		restartPolicy.Name = dockercontainer.RestartPolicyUnlessStopped
	default:
		restartPolicy.Name = dockercontainer.RestartPolicyDisabled
	}

	// Container config
	containerCfg := &dockercontainer.Config{
		Image:        cfg.Image,
		Cmd:          cfg.Command,
		Env:          cfg.Env,
		ExposedPorts: exposedPorts,
		Labels:       cfg.Labels,
		User:         cfg.User,
	}

	// Determine primary network and additional networks
	var primaryNetwork string
	var additionalNetworks []string
	if len(cfg.Networks) > 0 {
		primaryNetwork = cfg.Networks[0]
		additionalNetworks = cfg.Networks[1:]
	}

	// Build capability list
	capAdd := cfg.CapAdd
	if c.toolchain.Platform == types.PlatformPodman {
		// Podman has a more restrictive default capability set than Docker.
		// Add Docker's defaults to ensure consistent behavior.
		capAdd = types.MergeCapabilities(types.DefaultPodmanCapabilities(), cfg.CapAdd)
	}

	// Host config
	hostCfg := &dockercontainer.HostConfig{
		PortBindings:  portBindings,
		Mounts:        buildBindMounts(cfg.Volumes),
		ExtraHosts:    cfg.ExtraHosts,
		RestartPolicy: restartPolicy,
		NetworkMode:   dockercontainer.NetworkMode(primaryNetwork),
		CapAdd:        capAdd,
	}

	var networkingConfig *network.NetworkingConfig
	if primaryNetwork != "" && len(cfg.NetworkAliases) > 0 {
		networkingConfig = &network.NetworkingConfig{
			EndpointsConfig: map[string]*network.EndpointSettings{
				primaryNetwork: {
					Aliases: cfg.NetworkAliases,
				},
			},
		}
	}

	// Create the container
	resp, err := c.cli.ContainerCreate(ctx, containerCfg, hostCfg, networkingConfig, nil, cfg.Name)
	if err != nil {
		return "", fmt.Errorf("failed to create container: %w", err)
	}

	// Connect to additional networks before starting
	for _, net := range additionalNetworks {
		if err := c.cli.NetworkConnect(ctx, net, resp.ID, nil); err != nil {
			// Clean up on failure
			removeContainerBestEffort(ctx, c.cli, resp.ID)
			return "", fmt.Errorf("failed to connect to network %s: %w", net, err)
		}
	}

	// Start the container if detached
	if cfg.Detach {
		if err := c.cli.ContainerStart(ctx, resp.ID, dockercontainer.StartOptions{}); err != nil {
			// Clean up created container on start failure
			removeContainerBestEffort(ctx, c.cli, resp.ID)
			return "", fmt.Errorf("failed to start container: %w", err)
		}
	}

	return resp.ID, nil
}

func buildBindMounts(volumes []types.VolumeMount) []dockermount.Mount {
	mounts := make([]dockermount.Mount, 0, len(volumes))
	for _, v := range volumes {
		mounts = append(mounts, dockermount.Mount{
			Type:     dockermount.TypeBind,
			Source:   v.HostPath,
			Target:   v.ContainerPath,
			ReadOnly: v.ReadOnly,
		})
	}
	return mounts
}

func detectPlatform(ctx context.Context, hostHint string, opts ...client.Opt) (types.ContainerPlatform, error) {
	opts = append(opts, client.WithAPIVersionNegotiation())

	cli, err := client.NewClientWithOpts(opts...)
	if err != nil {
		return types.PlatformUnknown, fmt.Errorf("failed to create docker client: %w", err)
	}
	defer closeBestEffort(cli)

	if _, err := cli.Ping(ctx); err != nil {
		return types.PlatformUnknown, fmt.Errorf("failed to connect to docker daemon: %w", err)
	}

	if version, err := cli.ServerVersion(ctx); err == nil {
		if platform, ok := platformFromVersion(version); ok {
			return platform, nil
		}
	}

	if info, err := cli.Info(ctx); err == nil {
		if platform, ok := platformFromInfo(info); ok {
			return platform, nil
		}
	}

	if platform, ok := platformFromHost(hostHint); ok {
		return platform, nil
	}

	return types.PlatformUnknown, nil
}

func platformFromVersion(version dockertypes.Version) (types.ContainerPlatform, bool) {
	values := []string{version.Platform.Name, version.Version}
	for _, component := range version.Components {
		values = append(values, component.Name, component.Version)
		for _, detail := range component.Details {
			values = append(values, detail)
		}
	}

	return platformFromStrings(values...)
}

func platformFromInfo(info systemtypes.Info) (types.ContainerPlatform, bool) {
	values := make([]string, 0, 5+len(info.SecurityOptions))
	values = append(values,
		info.OperatingSystem,
		info.Name,
		info.ServerVersion,
		info.Driver,
		info.InitBinary,
	)
	values = append(values, info.SecurityOptions...)

	return platformFromStrings(values...)
}

func platformFromStrings(values ...string) (types.ContainerPlatform, bool) {
	for _, value := range values {
		lower := strings.ToLower(value)
		if strings.Contains(lower, "podman") {
			return types.PlatformPodman, true
		}
		if strings.Contains(lower, "colima") {
			return types.PlatformColima, true
		}
	}
	for _, value := range values {
		lower := strings.ToLower(value)
		if strings.Contains(lower, "docker") {
			return types.PlatformDocker, true
		}
	}

	return types.PlatformUnknown, false
}

func platformFromHost(host string) (types.ContainerPlatform, bool) {
	lower := strings.ToLower(host)

	switch {
	case strings.Contains(lower, "podman.sock"),
		strings.Contains(lower, "/containers/podman/"),
		strings.Contains(lower, "/run/podman/"),
		strings.Contains(lower, "/podman/podman.sock"):
		return types.PlatformPodman, true
	case strings.Contains(lower, "/.colima/"),
		strings.Contains(lower, "/colima/"):
		return types.PlatformColima, true
	case strings.Contains(lower, "/.docker/run/docker.sock"),
		strings.Contains(lower, "/var/run/docker.sock"):
		return types.PlatformDocker, true
	default:
		return types.PlatformUnknown, false
	}
}

// ContainerState returns the state of a container.
// Returns ErrContainerNotFound if the container does not exist.
func (c *Client) ContainerState(ctx context.Context, nameOrID string) (types.ContainerState, error) {
	info, err := c.cli.ContainerInspect(ctx, nameOrID)
	if err != nil {
		if cerrdefs.IsNotFound(err) {
			return types.ContainerState{}, types.ErrContainerNotFound
		}
		return types.ContainerState{}, fmt.Errorf("failed to inspect container: %w", err)
	}
	return types.ContainerState{
		Status:       info.State.Status,
		HealthStatus: dockerHealthStatus(info.State),
		Running:      info.State.Running,
		Paused:       info.State.Paused,
		ExitCode:     info.State.ExitCode,
	}, nil
}

// ContainerNetworks returns the networks the container is attached to.
func (c *Client) ContainerNetworks(ctx context.Context, nameOrID string) ([]string, error) {
	info, err := c.cli.ContainerInspect(ctx, nameOrID)
	if err != nil {
		if cerrdefs.IsNotFound(err) {
			return nil, types.ErrContainerNotFound
		}
		return nil, fmt.Errorf("failed to inspect container: %w", err)
	}

	networks := make([]string, 0, len(info.NetworkSettings.Networks))
	for name := range info.NetworkSettings.Networks {
		networks = append(networks, name)
	}
	return networks, nil
}

// Exec executes a command in a running container.
func (c *Client) Exec(ctx context.Context, containerName string, cmd []string) error {
	return c.ExecWithIO(ctx, containerName, cmd, nil, io.Discard, io.Discard)
}

// ExecWithIO executes a command with custom I/O streams.
func (c *Client) ExecWithIO(
	ctx context.Context,
	containerName string,
	cmd []string,
	stdin io.Reader,
	stdout, stderr io.Writer,
) error {
	execCfg := dockercontainer.ExecOptions{
		Cmd:          cmd,
		AttachStdout: true,
		AttachStderr: true,
		AttachStdin:  stdin != nil,
		Tty:          false,
	}

	resp, err := c.cli.ContainerExecCreate(ctx, containerName, execCfg)
	if err != nil {
		return fmt.Errorf("failed to create exec: %w", err)
	}

	attachResp, err := c.cli.ContainerExecAttach(ctx, resp.ID, dockercontainer.ExecAttachOptions{Tty: false})
	if err != nil {
		return fmt.Errorf("failed to attach to exec: %w", err)
	}
	defer attachResp.Close()

	// Handle stdin in a goroutine if provided
	if stdin != nil {
		go func() {
			copyToConnBestEffort(attachResp.Conn, stdin)
			closeWriteBestEffort(&attachResp)
		}()
	}

	stdoutWriter := stdout
	stderrWriter := stderr
	if stdoutWriter == nil {
		stdoutWriter = io.Discard
	}
	if stderrWriter == nil {
		stderrWriter = io.Discard
	}

	_, err = stdcopy.StdCopy(stdoutWriter, stderrWriter, attachResp.Reader)
	if err != nil && !errors.Is(err, io.EOF) {
		return fmt.Errorf("failed to read exec output: %w", err)
	}

	// Check exit code
	inspectResp, err := c.cli.ContainerExecInspect(ctx, resp.ID)
	if err != nil {
		return fmt.Errorf("failed to inspect exec: %w", err)
	}

	if inspectResp.ExitCode != 0 {
		return fmt.Errorf("%w: %d", errExecExitCode, inspectResp.ExitCode)
	}

	return nil
}

// NetworkConnect connects a container to a network.
func (c *Client) NetworkConnect(ctx context.Context, networkName, containerName string) error {
	err := c.cli.NetworkConnect(ctx, networkName, containerName, &network.EndpointSettings{})
	if err != nil {
		return fmt.Errorf("failed to connect container to network: %w", err)
	}
	return nil
}

// ImageInspect returns metadata about an image.
func (c *Client) ImageInspect(ctx context.Context, img string) (types.ImageInfo, error) {
	info, err := c.cli.ImageInspect(ctx, img)
	if err != nil {
		if cerrdefs.IsNotFound(err) {
			return types.ImageInfo{}, types.ErrImageNotFound
		}
		return types.ImageInfo{}, fmt.Errorf("failed to inspect image: %w", err)
	}
	return types.ImageInfo{ID: info.ID, Size: info.Size}, nil
}

// ImagePull pulls an image from a registry.
func (c *Client) ImagePull(ctx context.Context, img string) error {
	return c.ImagePullWithProgress(ctx, img, nil)
}

// ImagePullWithProgress pulls an image and emits best-effort progress updates.
func (c *Client) ImagePullWithProgress(
	ctx context.Context,
	img string,
	onProgress types.ProgressHandler,
) error {
	resp, err := c.cli.ImagePull(ctx, img, image.PullOptions{})
	if err != nil {
		return fmt.Errorf("failed to pull image: %w", err)
	}
	defer closeBestEffort(resp)

	decoder := json.NewDecoder(resp)
	aggregator := newPullProgressAggregator()
	for {
		var msg jsonmessage.JSONMessage
		if err := decoder.Decode(&msg); err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return fmt.Errorf("image pull stream decode failed: %w", err)
		}
		if msg.Error != nil {
			return fmt.Errorf("%w: %s", errImagePullFailed, msg.Error.Message)
		}

		reportProgress(onProgress, aggregator.Update(msg))
	}

	return nil
}

// ContainerInspect returns detailed information about a container.
func (c *Client) ContainerInspect(ctx context.Context, nameOrID string) (types.ContainerInfo, error) {
	info, err := c.cli.ContainerInspect(ctx, nameOrID)
	if err != nil {
		if cerrdefs.IsNotFound(err) {
			return types.ContainerInfo{}, types.ErrContainerNotFound
		}
		return types.ContainerInfo{}, fmt.Errorf("failed to inspect container: %w", err)
	}

	// Docker prefixes container names with "/", strip it
	name := strings.TrimPrefix(info.Name, "/")

	return types.ContainerInfo{
		ID:      info.ID,
		Name:    name,
		Image:   info.Config.Image,
		ImageID: info.Image,
		Labels:  info.Config.Labels,
		Ports:   publishedPortsFromInspect(info.NetworkSettings),
		State: types.ContainerState{
			Status:       info.State.Status,
			HealthStatus: dockerHealthStatus(info.State),
			Running:      info.State.Running,
			Paused:       info.State.Paused,
			ExitCode:     info.State.ExitCode,
		},
	}, nil
}

func dockerHealthStatus(state *dockercontainer.State) string {
	if state == nil || state.Health == nil {
		return ""
	}
	return state.Health.Status
}

// ListContainers returns containers matching the provided filters.
func (c *Client) ListContainers(ctx context.Context, filter types.ContainerListFilter) ([]types.ContainerInfo, error) {
	args := filters.NewArgs()
	for key, value := range filter.Labels {
		label := key
		if value != "" {
			label += "=" + value
		}
		args.Add("label", label)
	}

	containers, err := c.cli.ContainerList(ctx, dockercontainer.ListOptions{
		All:     filter.All,
		Filters: args,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	result := make([]types.ContainerInfo, 0, len(containers))
	for _, ctr := range containers {
		result = append(result, types.ContainerInfo{
			ID:      ctr.ID,
			Name:    firstContainerName(ctr.Names),
			Image:   ctr.Image,
			ImageID: ctr.ImageID,
			Labels:  ctr.Labels,
			Ports:   publishedPortsFromSummary(ctr.Ports),
			State: types.ContainerState{
				Status:  ctr.State,
				Running: ctr.State == dockercontainer.StateRunning,
			},
		})
	}
	return result, nil
}

func firstContainerName(names []string) string {
	if len(names) == 0 {
		return ""
	}
	return strings.TrimPrefix(names[0], "/")
}

func publishedPortsFromPortMap(portMap nat.PortMap) []types.PublishedPort {
	var ports []types.PublishedPort
	for containerPort, bindings := range portMap {
		for _, binding := range bindings {
			ports = append(ports, types.PublishedPort{
				HostIP:        binding.HostIP,
				HostPort:      binding.HostPort,
				ContainerPort: containerPort.Port(),
				Protocol:      containerPort.Proto(),
			})
		}
	}
	return ports
}

func publishedPortsFromInspect(networkSettings *dockercontainer.NetworkSettings) []types.PublishedPort {
	if networkSettings == nil {
		return nil
	}
	return publishedPortsFromPortMap(networkSettings.Ports)
}

func publishedPortsFromSummary(ports []dockercontainer.Port) []types.PublishedPort {
	result := make([]types.PublishedPort, 0, len(ports))
	for _, port := range ports {
		if port.PublicPort == 0 {
			continue
		}
		result = append(result, types.PublishedPort{
			HostIP:        port.IP,
			HostPort:      strconv.FormatUint(uint64(port.PublicPort), 10),
			ContainerPort: strconv.FormatUint(uint64(port.PrivatePort), 10),
			Protocol:      port.Type,
		})
	}
	return result
}

// ContainerStart starts an existing container.
func (c *Client) ContainerStart(ctx context.Context, nameOrID string) error {
	if err := c.cli.ContainerStart(ctx, nameOrID, dockercontainer.StartOptions{}); err != nil {
		return fmt.Errorf("failed to start container: %w", err)
	}
	return nil
}

// ContainerStop stops a running container.
func (c *Client) ContainerStop(ctx context.Context, nameOrID string, timeout *int) error {
	opts := dockercontainer.StopOptions{}
	if timeout != nil {
		opts.Timeout = timeout
	}
	if err := c.cli.ContainerStop(ctx, nameOrID, opts); err != nil {
		if cerrdefs.IsNotFound(err) {
			return types.ErrContainerNotFound
		}
		return fmt.Errorf("failed to stop container: %w", err)
	}
	return nil
}

// ContainerRemove removes a container.
// Returns ErrContainerNotFound if the container does not exist.
func (c *Client) ContainerRemove(ctx context.Context, nameOrID string, force bool) error {
	opts := dockercontainer.RemoveOptions{Force: force}
	if err := c.cli.ContainerRemove(ctx, nameOrID, opts); err != nil {
		if cerrdefs.IsNotFound(err) {
			return types.ErrContainerNotFound
		}
		return fmt.Errorf("failed to remove container: %w", err)
	}
	return nil
}

// NetworkCreate creates a new network.
func (c *Client) NetworkCreate(ctx context.Context, cfg types.NetworkConfig) (string, error) {
	driver := cfg.Driver
	if driver == "" {
		driver = "bridge"
	}

	opts := network.CreateOptions{
		Driver: driver,
		Labels: cfg.Labels,
	}

	resp, err := c.cli.NetworkCreate(ctx, cfg.Name, opts)
	if err != nil {
		return "", fmt.Errorf("failed to create network: %w", err)
	}
	return resp.ID, nil
}

// NetworkInspect returns information about a network.
func (c *Client) NetworkInspect(ctx context.Context, nameOrID string) (types.NetworkInfo, error) {
	info, err := c.cli.NetworkInspect(ctx, nameOrID, network.InspectOptions{})
	if err != nil {
		if cerrdefs.IsNotFound(err) {
			return types.NetworkInfo{}, types.ErrNetworkNotFound
		}
		return types.NetworkInfo{}, fmt.Errorf("failed to inspect network: %w", err)
	}
	return types.NetworkInfo{
		ID:     info.ID,
		Name:   info.Name,
		Driver: info.Driver,
		Labels: info.Labels,
	}, nil
}

// NetworkRemove removes a network.
func (c *Client) NetworkRemove(ctx context.Context, nameOrID string) error {
	if err := c.cli.NetworkRemove(ctx, nameOrID); err != nil {
		if cerrdefs.IsNotFound(err) {
			return types.ErrNetworkNotFound
		}
		if isNetworkInUseError(err) {
			return types.ErrNetworkInUse
		}
		return fmt.Errorf("failed to remove network: %w", err)
	}
	return nil
}

func isNetworkInUseError(err error) bool {
	if cerrdefs.IsConflict(err) {
		return true
	}

	message := strings.ToLower(err.Error())
	return strings.Contains(message, "active endpoints")
}

// ContainerLogs returns a stream of container logs.
func (c *Client) ContainerLogs(ctx context.Context, nameOrID string, follow bool, tail string) (io.ReadCloser, error) {
	opts := dockercontainer.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     follow,
		Timestamps: false,
	}
	if tail != "" {
		opts.Tail = tail
	}

	logs, err := c.cli.ContainerLogs(ctx, nameOrID, opts)
	if err != nil {
		if cerrdefs.IsNotFound(err) {
			return nil, types.ErrContainerNotFound
		}
		return nil, fmt.Errorf("failed to get container logs: %w", err)
	}
	return demuxDockerLogs(logs), nil
}

func demuxDockerLogs(logs io.ReadCloser) io.ReadCloser {
	pr, pw := io.Pipe()
	reader := &dockerLogReader{
		reader: pr,
		source: logs,
	}

	go func() {
		_, err := stdcopy.StdCopy(pw, pw, logs)
		sourceErr := reader.closeSource()
		if err != nil && !errors.Is(err, io.EOF) {
			if reader.isClosed() {
				if closeErr := pw.Close(); closeErr != nil {
					return
				}
				return
			}
			_ = pw.CloseWithError(fmt.Errorf("demux docker logs: %w", err))
			return
		}
		if sourceErr != nil && !reader.isClosed() {
			_ = pw.CloseWithError(fmt.Errorf("close docker logs: %w", sourceErr))
			return
		}
		if closeErr := pw.Close(); closeErr != nil {
			return
		}
	}()

	return reader
}

type dockerLogReader struct {
	source    io.Closer
	closeErr  error
	reader    *io.PipeReader
	closeOnce sync.Once
	closedMu  sync.Mutex
	closed    bool
}

//nolint:wrapcheck // io.Reader implementations should preserve EOF semantics.
func (r *dockerLogReader) Read(p []byte) (int, error) {
	return r.reader.Read(p)
}

func (r *dockerLogReader) Close() error {
	r.closedMu.Lock()
	r.closed = true
	r.closedMu.Unlock()

	if err := r.closeSource(); err != nil {
		return fmt.Errorf("close docker log reader: %w", err)
	}
	return nil
}

func (r *dockerLogReader) closeSource() error {
	r.closeOnce.Do(func() {
		r.closeErr = r.source.Close()
	})
	return r.closeErr
}

func (r *dockerLogReader) isClosed() bool {
	r.closedMu.Lock()
	defer r.closedMu.Unlock()
	return r.closed
}

// ContainerWait blocks until the container exits and returns the exit code.
func (c *Client) ContainerWait(ctx context.Context, nameOrID string) (int, error) {
	statusCh, errCh := c.cli.ContainerWait(ctx, nameOrID, dockercontainer.WaitConditionNotRunning)

	select {
	case status := <-statusCh:
		// Got status - this is the success path
		return int(status.StatusCode), nil
	case err := <-errCh:
		if err != nil {
			return -1, fmt.Errorf("wait container: %w", err)
		}
		// errCh closed but no status - shouldn't happen, handle defensively
		select {
		case status := <-statusCh:
			return int(status.StatusCode), nil
		case <-ctx.Done():
			return -1, fmt.Errorf("%w: %w", errContextCancelled, ctx.Err())
		default:
			return -1, errWaitWithoutStatus
		}
	case <-ctx.Done():
		return -1, fmt.Errorf("%w: %w", errContextCancelled, ctx.Err())
	}
}

//nolint:errcheck,gosec // Client and stream cleanup is best-effort during setup and teardown paths.
func closeBestEffort(closer interface{ Close() error }) {
	closer.Close()
}

//nolint:errcheck,gosec // Cleanup is best-effort after a failed exec attach.
func closeWriteBestEffort(attachResp interface{ CloseWrite() error }) {
	attachResp.CloseWrite()
}

//nolint:errcheck,gosec // Copying stdin into the exec session is best-effort.
func copyToConnBestEffort(dst io.Writer, src io.Reader) {
	io.Copy(dst, src)
}

//nolint:errcheck,gosec // Container cleanup is best-effort after a failed create/start path.
func removeContainerBestEffort(ctx context.Context, cli *client.Client, containerID string) {
	cli.ContainerRemove(ctx, containerID, dockercontainer.RemoveOptions{Force: true})
}

func reportProgress(onProgress types.ProgressHandler, progress types.ProgressUpdate) {
	if onProgress != nil {
		onProgress(progress)
	}
}

func runIndeterminateBuild(
	ctx context.Context,
	binary, contextPath, dockerfile, tag string,
	onProgress types.ProgressHandler,
) error {
	args := []string{"build", "-t", tag, "-f", dockerfile, contextPath}
	cmd := processutil.CommandContext(ctx, binary, args...)

	reportProgress(onProgress, types.ProgressUpdate{
		Message:       "build started",
		Indeterminate: true,
	})

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s build failed: %w\nOutput: %s", binary, err, string(output))
	}

	reportProgress(onProgress, types.ProgressUpdate{
		Message:       "build completed",
		Current:       1,
		Total:         1,
		Indeterminate: false,
	})

	return nil
}

func runStreamingBuild(
	binary string,
	cmd *exec.Cmd,
	onProgress types.ProgressHandler,
) error {
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("build stdout pipe: %w", err)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("build stderr pipe: %w", err)
	}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("%s build failed to start: %w", binary, err)
	}

	reportProgress(onProgress, types.ProgressUpdate{
		Message:       "build started",
		Indeterminate: true,
	})

	var stdoutBuf bytes.Buffer
	stdoutErrCh := make(chan error, 1)
	go func() {
		_, copyErr := io.Copy(&stdoutBuf, stdout)
		stdoutErrCh <- copyErr
	}()

	aggregator := newBuildProgressAggregator()
	stderrText, stderrErr := streamBuildProgress(stderr, aggregator, onProgress)
	waitErr := cmd.Wait()
	stdoutErr := <-stdoutErrCh

	if stderrErr != nil {
		return stderrErr
	}
	if waitErr != nil {
		return formatBuildFailure(binary, waitErr, aggregator.LastError(), stdoutBuf.String(), stderrText)
	}
	if stdoutErr != nil && !isClosedPipeReadError(stdoutErr) {
		return fmt.Errorf("build stdout read failed: %w", stdoutErr)
	}

	reportProgress(onProgress, types.ProgressUpdate{
		Message:       "build completed",
		Current:       1,
		Total:         1,
		Indeterminate: false,
	})

	return nil
}

func isClosedPipeReadError(err error) bool {
	return errors.Is(err, os.ErrClosed) || strings.Contains(err.Error(), "file already closed")
}

func streamBuildProgress(
	stream io.Reader,
	aggregator *buildProgressAggregator,
	onProgress types.ProgressHandler,
) (string, error) {
	reader := bufio.NewReader(stream)
	var raw strings.Builder
	for {
		line, err := reader.ReadBytes('\n')
		if len(line) > 0 {
			progressed, logs := processBuildProgressLine(bytes.TrimSpace(line), aggregator, onProgress)
			if logs != "" {
				appendOutputLine(&raw, []byte(logs))
			}
			if !progressed {
				appendOutputLine(&raw, line)
			}
		}
		if err == nil {
			continue
		}
		if errors.Is(err, io.EOF) {
			return raw.String(), nil
		}
		return raw.String(), fmt.Errorf("build progress stream read failed: %w", err)
	}
}

func processBuildProgressLine(
	line []byte,
	aggregator *buildProgressAggregator,
	onProgress types.ProgressHandler,
) (bool, string) {
	if len(line) == 0 {
		return true, ""
	}

	var status buildkitSolveStatus
	if err := json.Unmarshal(line, &status); err != nil {
		return false, ""
	}

	progress, ok := aggregator.Update(status)
	if ok {
		reportProgress(onProgress, progress)
	}
	return true, buildkitLogText(status)
}

func formatBuildFailure(binary string, err error, buildErr, stdout, stderr string) error {
	var details []string
	if buildErr != "" {
		details = append(details, buildErr)
	}
	if stdout != "" {
		details = append(details, "stdout:\n"+stdout)
	}
	if stderr != "" {
		details = append(details, "stderr:\n"+stderr)
	}
	if len(details) == 0 {
		return fmt.Errorf("%s build failed: %w", binary, err)
	}
	return fmt.Errorf("%s build failed: %w\n%s", binary, err, strings.Join(details, "\n"))
}

func appendOutputLine(raw *strings.Builder, line []byte) {
	if len(bytes.TrimSpace(line)) == 0 {
		return
	}
	if raw.Len() > 0 {
		raw.WriteByte('\n')
	}
	raw.Write(bytes.TrimRight(line, "\r\n"))
}

type pullProgressAggregator struct {
	layers map[string]layerProgress
}

type buildProgressAggregator struct {
	statuses    map[string]layerProgress
	lastMessage string
	lastError   string
}

type buildkitSolveStatus struct {
	Vertexes []*buildkitVertex       `json:"vertexes,omitempty"`
	Statuses []*buildkitVertexStatus `json:"statuses,omitempty"`
	Logs     []*buildkitVertexLog    `json:"logs,omitempty"`
}

type buildkitVertex struct {
	Digest    string     `json:"digest,omitempty"`
	Name      string     `json:"name,omitempty"`
	Completed *time.Time `json:"completed,omitempty"`
	Error     string     `json:"error,omitempty"`
}

type buildkitVertexStatus struct {
	ID      string `json:"id,omitempty"`
	Vertex  string `json:"vertex,omitempty"`
	Name    string `json:"name,omitempty"`
	Current int64  `json:"current,omitempty"`
	Total   int64  `json:"total,omitempty"`
}

type buildkitVertexLog struct {
	Data []byte `json:"data,omitempty"`
}

type layerProgress struct {
	phase   string
	current int64
	total   int64
}

func newPullProgressAggregator() pullProgressAggregator {
	return pullProgressAggregator{
		layers: make(map[string]layerProgress),
	}
}

func newBuildProgressAggregator() *buildProgressAggregator {
	return &buildProgressAggregator{
		statuses: make(map[string]layerProgress),
	}
}

func (a *buildProgressAggregator) Update(status buildkitSolveStatus) (types.ProgressUpdate, bool) {
	changed := false
	for _, vertex := range status.Vertexes {
		changed = a.updateVertex(vertex) || changed
	}
	for _, vertexStatus := range status.Statuses {
		changed = a.updateVertexStatus(vertexStatus) || changed
	}
	if !changed {
		return types.ProgressUpdate{}, false
	}

	return a.progressUpdate(), true
}

func (a *buildProgressAggregator) LastError() string {
	return a.lastError
}

func (a *buildProgressAggregator) updateVertex(vertex *buildkitVertex) bool {
	if vertex == nil {
		return false
	}
	if vertex.Error != "" {
		a.lastError = vertex.Error
	}
	if vertex.Completed != nil || vertex.Error != "" || vertex.Name == "" || vertex.Name == a.lastMessage {
		return false
	}
	a.lastMessage = vertex.Name
	return true
}

func (a *buildProgressAggregator) updateVertexStatus(vertexStatus *buildkitVertexStatus) bool {
	if vertexStatus == nil {
		return false
	}

	changed := false
	if key := buildStatusKey(*vertexStatus); updateTrackedProgress(
		a.statuses,
		key,
		vertexStatus.Name,
		vertexStatus.Current,
		vertexStatus.Total,
	) {
		changed = true
	}
	if vertexStatus.Name == "" || vertexStatus.Name == a.lastMessage {
		return changed
	}
	a.lastMessage = vertexStatus.Name
	return true
}

func (a *buildProgressAggregator) progressUpdate() types.ProgressUpdate {
	progress := types.ProgressUpdate{
		Message: a.lastMessage,
	}
	for _, status := range a.statuses {
		progress.Current += status.current
		progress.Total += status.total
	}
	progress.Indeterminate = progress.Total == 0
	return progress
}

func buildStatusKey(status buildkitVertexStatus) string {
	if status.ID != "" {
		return status.ID
	}
	if status.Vertex != "" {
		return status.Vertex
	}
	return status.Name
}

func buildkitLogText(status buildkitSolveStatus) string {
	var logs strings.Builder
	for _, entry := range status.Logs {
		if entry == nil || len(entry.Data) == 0 {
			continue
		}
		appendOutputLine(&logs, entry.Data)
	}
	return logs.String()
}

func (a *pullProgressAggregator) Update(msg jsonmessage.JSONMessage) types.ProgressUpdate {
	var current, total int64
	if msg.Progress != nil {
		current = msg.Progress.Current
		total = msg.Progress.Total
	}
	updateTrackedProgress(a.layers, msg.ID, msg.Status, current, total)

	progress := types.ProgressUpdate{
		Message: strings.TrimSpace(strings.Join([]string{msg.ID, msg.Status}, " ")),
	}

	for _, layer := range a.layers {
		progress.Current += layer.current
		progress.Total += layer.total
	}
	progress.Indeterminate = progress.Total == 0

	return progress
}

func updateTrackedProgress(
	tracked map[string]layerProgress,
	key string,
	phase string,
	current, total int64,
) bool {
	if key == "" || total <= 0 {
		return false
	}

	next := normalizedLayerProgress(current, total)
	next.phase = phase
	if tracked[key] == next {
		return false
	}
	tracked[key] = next
	return true
}

func normalizedLayerProgress(current, total int64) layerProgress {
	if total <= 0 {
		return layerProgress{}
	}
	if current < 0 {
		current = 0
	}
	if current > total {
		current = total
	}
	return layerProgress{
		current: current,
		total:   total,
	}
}
