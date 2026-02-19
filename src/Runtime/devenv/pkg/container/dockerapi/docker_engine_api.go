package dockerapi

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"

	"altinn.studio/devenv/pkg/container/types"

	cerrdefs "github.com/containerd/errdefs"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/jsonmessage"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/docker/go-connections/nat"
)

// Client implements ContainerClient for Docker using the official SDK.
// It can also connect to Podman's Docker-compatible API socket.
type Client struct {
	cli          *client.Client
	installation types.RuntimeInstallation
}

// New creates a new Docker client
func New(ctx context.Context) (*Client, error) {
	return newClient(ctx, types.InstallationDocker)
}

// NewPodmanCompat creates a client configured for Podman's Docker-compatible API.
// Use this when connecting to a Podman socket via DOCKER_HOST.
func NewPodmanCompat(ctx context.Context) (*Client, error) {
	return newClient(ctx, types.InstallationPodman)
}

// NewWithInstallation creates a client with explicit installation type
func NewWithInstallation(ctx context.Context, install types.RuntimeInstallation) (*Client, error) {
	return newClient(ctx, install)
}

// NewPodmanCompatWithInstallation creates Podman-compat client with explicit installation
func NewPodmanCompatWithInstallation(ctx context.Context, install types.RuntimeInstallation) (*Client, error) {
	return newClient(ctx, install)
}

func newClient(ctx context.Context, installation types.RuntimeInstallation) (*Client, error) {
	cli, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create docker client: %w", err)
	}

	// Verify connection by pinging the daemon
	if _, err := cli.Ping(ctx); err != nil {
		_ = cli.Close()
		return nil, fmt.Errorf("failed to connect to docker daemon: %w", err)
	}

	return &Client{cli: cli, installation: installation}, nil
}

// NewWithHost creates a Docker client connected to specified host
func NewWithHost(ctx context.Context, host string) (*Client, error) {
	return newClientWithHost(ctx, types.InstallationDocker, host)
}

// NewPodmanCompatWithHost creates Podman-compatible client with explicit host
func NewPodmanCompatWithHost(ctx context.Context, host string, install types.RuntimeInstallation) (*Client, error) {
	return newClientWithHost(ctx, install, host)
}

// newClientWithHost is shared implementation using client.WithHost()
func newClientWithHost(ctx context.Context, installation types.RuntimeInstallation, host string) (*Client, error) {
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
		_ = cli.Close()
		return nil, fmt.Errorf("failed to connect to docker daemon: %w", err)
	}

	return &Client{cli: cli, installation: installation}, nil
}

// Installation returns the container runtime installation type
func (c *Client) Installation() types.RuntimeInstallation {
	return c.installation
}

// Close releases resources held by the client
func (c *Client) Close() error {
	return c.cli.Close()
}

// Name returns the runtime name
func (c *Client) Name() string {
	return types.RuntimeNameDockerEngineAPI
}

// Build builds a container image from a Dockerfile.
// Uses CLI with BuildKit for proper --platform=$BUILDPLATFORM support in Dockerfiles.
// The Docker Engine API doesn't support BuildKit sessions without complex setup.
func (c *Client) Build(ctx context.Context, contextPath, dockerfile, tag string) error {
	binary := "docker"
	if c.installation == types.InstallationPodman {
		binary = "podman"
	}

	args := []string{"build", "-t", tag, "-f", dockerfile}

	// Disable provenance/sbom attestations for local builds (BuildKit feature)
	if c.installation != types.InstallationPodman {
		args = append(args, "--provenance=false", "--sbom=false")
	}

	args = append(args, contextPath)
	cmd := exec.CommandContext(ctx, binary, args...)

	// Enable BuildKit for Docker (Podman uses buildah which handles this natively)
	if c.installation != types.InstallationPodman {
		cmd.Env = append(os.Environ(), "DOCKER_BUILDKIT=1")
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s build failed: %w\nOutput: %s", binary, err, string(output))
	}
	return nil
}

// Push pushes an image to a registry
func (c *Client) Push(ctx context.Context, img string) error {
	resp, err := c.cli.ImagePush(ctx, img, image.PushOptions{
		// Empty auth for local registry
		RegistryAuth: "e30=", // base64 encoded "{}"
	})
	if err != nil {
		return fmt.Errorf("docker push failed: %w", err)
	}
	defer func() { _ = resp.Close() }()

	// Read push output to detect errors
	if err := jsonmessage.DisplayJSONMessagesStream(resp, io.Discard, 0, false, nil); err != nil {
		return fmt.Errorf("docker push failed: %w", err)
	}

	return nil
}

// CreateContainer creates and optionally starts a container
func (c *Client) CreateContainer(ctx context.Context, cfg types.ContainerConfig) (string, error) {
	// Ensure image exists locally, pull if missing
	_, err := c.cli.ImageInspect(ctx, cfg.Image)
	if err != nil {
		if cerrdefs.IsNotFound(err) {
			if err := c.ImagePull(ctx, cfg.Image); err != nil {
				return "", fmt.Errorf("failed to pull image %s: %w", cfg.Image, err)
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

	// Build volume bindings
	binds := make([]string, 0, len(cfg.Volumes))
	for _, v := range cfg.Volumes {
		bind := fmt.Sprintf("%s:%s", v.HostPath, v.ContainerPath)
		if v.ReadOnly {
			bind += ":ro"
		}
		binds = append(binds, bind)
	}

	// Build restart policy
	restartPolicy := container.RestartPolicy{}
	switch cfg.RestartPolicy {
	case "always":
		restartPolicy.Name = container.RestartPolicyAlways
	case "on-failure":
		restartPolicy.Name = container.RestartPolicyOnFailure
	case "unless-stopped":
		restartPolicy.Name = container.RestartPolicyUnlessStopped
	default:
		restartPolicy.Name = container.RestartPolicyDisabled
	}

	// Container config
	containerCfg := &container.Config{
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
	if c.installation == types.InstallationPodman {
		// Podman has a more restrictive default capability set than Docker.
		// Add Docker's defaults to ensure consistent behavior.
		capAdd = types.MergeCapabilities(types.DefaultPodmanCapabilities(), cfg.CapAdd)
	}

	// Host config
	hostCfg := &container.HostConfig{
		PortBindings:  portBindings,
		Binds:         binds,
		ExtraHosts:    cfg.ExtraHosts,
		RestartPolicy: restartPolicy,
		NetworkMode:   container.NetworkMode(primaryNetwork),
		CapAdd:        capAdd,
	}

	// Create the container
	resp, err := c.cli.ContainerCreate(ctx, containerCfg, hostCfg, nil, nil, cfg.Name)
	if err != nil {
		return "", fmt.Errorf("failed to create container: %w", err)
	}

	// Connect to additional networks before starting
	for _, net := range additionalNetworks {
		if err := c.cli.NetworkConnect(ctx, net, resp.ID, nil); err != nil {
			// Clean up on failure
			_ = c.cli.ContainerRemove(ctx, resp.ID, container.RemoveOptions{Force: true})
			return "", fmt.Errorf("failed to connect to network %s: %w", net, err)
		}
	}

	// Start the container if detached
	if cfg.Detach {
		if err := c.cli.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
			// Clean up created container on start failure
			_ = c.cli.ContainerRemove(ctx, resp.ID, container.RemoveOptions{Force: true})
			return "", fmt.Errorf("failed to start container: %w", err)
		}
	}

	return resp.ID, nil
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
		Status:   string(info.State.Status),
		Running:  info.State.Running,
		Paused:   info.State.Paused,
		ExitCode: info.State.ExitCode,
	}, nil
}

// ContainerNetworks returns the networks the container is attached to
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

// Exec executes a command in a running container
func (c *Client) Exec(ctx context.Context, containerName string, cmd []string) error {
	return c.ExecWithIO(ctx, containerName, cmd, nil, io.Discard, io.Discard)
}

// ExecWithIO executes a command with custom I/O streams
func (c *Client) ExecWithIO(ctx context.Context, containerName string, cmd []string, stdin io.Reader, stdout, stderr io.Writer) error {
	execCfg := container.ExecOptions{
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

	attachResp, err := c.cli.ContainerExecAttach(ctx, resp.ID, container.ExecAttachOptions{Tty: false})
	if err != nil {
		return fmt.Errorf("failed to attach to exec: %w", err)
	}
	defer attachResp.Close()

	// Handle stdin in a goroutine if provided
	if stdin != nil {
		go func() {
			defer func() { _ = attachResp.CloseWrite() }()
			_, _ = io.Copy(attachResp.Conn, stdin)
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
	if err != nil && err != io.EOF {
		return fmt.Errorf("failed to read exec output: %w", err)
	}

	// Check exit code
	inspectResp, err := c.cli.ContainerExecInspect(ctx, resp.ID)
	if err != nil {
		return fmt.Errorf("failed to inspect exec: %w", err)
	}

	if inspectResp.ExitCode != 0 {
		return fmt.Errorf("exec exited with code %d", inspectResp.ExitCode)
	}

	return nil
}

// NetworkConnect connects a container to a network
func (c *Client) NetworkConnect(ctx context.Context, networkName, containerName string) error {
	err := c.cli.NetworkConnect(ctx, networkName, containerName, &network.EndpointSettings{})
	if err != nil {
		return fmt.Errorf("failed to connect container to network: %w", err)
	}
	return nil
}

// ImageInspect returns metadata about an image
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

// ImagePull pulls an image from a registry
func (c *Client) ImagePull(ctx context.Context, img string) error {
	resp, err := c.cli.ImagePull(ctx, img, image.PullOptions{})
	if err != nil {
		return fmt.Errorf("failed to pull image: %w", err)
	}
	defer func() { _ = resp.Close() }()

	// Read pull output to detect errors and wait for completion
	if err := jsonmessage.DisplayJSONMessagesStream(resp, io.Discard, 0, false, nil); err != nil {
		return fmt.Errorf("image pull failed: %w", err)
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
		State: types.ContainerState{
			Status:   string(info.State.Status),
			Running:  info.State.Running,
			Paused:   info.State.Paused,
			ExitCode: info.State.ExitCode,
		},
	}, nil
}

// ContainerStart starts an existing container
func (c *Client) ContainerStart(ctx context.Context, nameOrID string) error {
	if err := c.cli.ContainerStart(ctx, nameOrID, container.StartOptions{}); err != nil {
		return fmt.Errorf("failed to start container: %w", err)
	}
	return nil
}

// ContainerStop stops a running container
func (c *Client) ContainerStop(ctx context.Context, nameOrID string, timeout *int) error {
	opts := container.StopOptions{}
	if timeout != nil {
		opts.Timeout = timeout
	}
	if err := c.cli.ContainerStop(ctx, nameOrID, opts); err != nil {
		return fmt.Errorf("failed to stop container: %w", err)
	}
	return nil
}

// ContainerRemove removes a container.
// Returns ErrContainerNotFound if the container does not exist.
func (c *Client) ContainerRemove(ctx context.Context, nameOrID string, force bool) error {
	opts := container.RemoveOptions{Force: force}
	if err := c.cli.ContainerRemove(ctx, nameOrID, opts); err != nil {
		if cerrdefs.IsNotFound(err) {
			return types.ErrContainerNotFound
		}
		return fmt.Errorf("failed to remove container: %w", err)
	}
	return nil
}

// NetworkCreate creates a new network
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

// NetworkInspect returns information about a network
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

// NetworkRemove removes a network
func (c *Client) NetworkRemove(ctx context.Context, nameOrID string) error {
	if err := c.cli.NetworkRemove(ctx, nameOrID); err != nil {
		if cerrdefs.IsNotFound(err) {
			return types.ErrNetworkNotFound
		}
		return fmt.Errorf("failed to remove network: %w", err)
	}
	return nil
}

// ContainerLogs returns a stream of container logs.
func (c *Client) ContainerLogs(ctx context.Context, nameOrID string, follow bool, tail string) (io.ReadCloser, error) {
	opts := container.LogsOptions{
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
	return logs, nil
}

// ContainerWait blocks until the container exits and returns the exit code.
func (c *Client) ContainerWait(ctx context.Context, nameOrID string) (int, error) {
	statusCh, errCh := c.cli.ContainerWait(ctx, nameOrID, container.WaitConditionNotRunning)

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
			return -1, ctx.Err()
		default:
			return -1, fmt.Errorf("wait completed without status")
		}
	case <-ctx.Done():
		return -1, ctx.Err()
	}
}
