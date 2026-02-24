package podman

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
	"strings"
	"sync"

	"altinn.studio/devenv/pkg/container/types"
)

// Client implements ContainerClient for Podman using CLI
type Client struct{}

// New creates a new Podman CLI client
func New(ctx context.Context) (*Client, error) {
	// Verify podman is available
	if _, err := exec.LookPath("podman"); err != nil {
		return nil, fmt.Errorf("podman not found in PATH: %w", err)
	}
	// Verify podman is responsive
	cmd := exec.CommandContext(ctx, "podman", "version", "--format", "{{.Version}}")
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("podman not responsive: %w", err)
	}
	return &Client{}, nil
}

// Close releases resources (no-op for CLI client)
func (c *Client) Close() error {
	return nil
}

// Name returns the runtime name
func (c *Client) Name() string {
	return types.RuntimeNamePodmanCLI
}

// Installation returns the container runtime installation type
func (c *Client) Installation() types.RuntimeInstallation {
	return types.InstallationPodman
}

// Build builds a container image from a Dockerfile
func (c *Client) Build(ctx context.Context, contextPath, dockerfile, tag string) error {
	cmd := exec.CommandContext(ctx, "podman", "build", "-t", tag, "-f", dockerfile, contextPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman build failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

// Push pushes an image to a registry
func (c *Client) Push(ctx context.Context, image string) error {
	cmd := exec.CommandContext(ctx, "podman", podmanPushArgs(image)...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman push failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

func podmanPushArgs(image string) []string {
	args := []string{"push"}
	if isLocalRegistryReference(image) {
		// kind/devenv pushes target local plain-http registries.
		args = append(args, "--tls-verify=false")
	}
	args = append(args, image)
	return args
}

func isLocalRegistryReference(image string) bool {
	return strings.HasPrefix(image, "localhost:") ||
		strings.HasPrefix(image, "127.0.0.1:") ||
		strings.HasPrefix(image, "[::1]:")
}

// CreateContainer creates and optionally starts a container
func (c *Client) CreateContainer(ctx context.Context, cfg types.ContainerConfig) (string, error) {
	args := []string{"create"}

	if cfg.Name != "" {
		args = append(args, "--name", cfg.Name)
	}

	if cfg.RestartPolicy != "" && cfg.RestartPolicy != "no" {
		args = append(args, fmt.Sprintf("--restart=%s", cfg.RestartPolicy))
	}

	// Handle networks
	for _, net := range cfg.Networks {
		args = append(args, "--network", net)
	}

	for _, p := range cfg.Ports {
		portArg := fmt.Sprintf("%s:%s", p.HostPort, p.ContainerPort)
		if p.HostIP != "" {
			portArg = fmt.Sprintf("%s:%s", p.HostIP, portArg)
		}
		args = append(args, "-p", portArg)
	}

	for _, v := range cfg.Volumes {
		volArg := fmt.Sprintf("%s:%s", v.HostPath, v.ContainerPath)
		if v.ReadOnly {
			volArg += ":ro"
		}
		args = append(args, "-v", volArg)
	}

	for _, e := range cfg.Env {
		args = append(args, "-e", e)
	}

	for k, v := range cfg.Labels {
		args = append(args, "--label", fmt.Sprintf("%s=%s", k, v))
	}

	for _, host := range cfg.ExtraHosts {
		args = append(args, "--add-host", host)
	}

	if cfg.User != "" {
		args = append(args, "--user", cfg.User)
	}

	// Add capabilities (merge defaults with any explicit ones)
	caps := types.MergeCapabilities(types.DefaultPodmanCapabilities(), cfg.CapAdd)
	for _, cap := range caps {
		args = append(args, "--cap-add", cap)
	}

	args = append(args, cfg.Image)
	args = append(args, cfg.Command...)

	cmd := exec.CommandContext(ctx, "podman", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("podman create failed: %w\nOutput: %s", err, string(output))
	}

	// Return container ID (first line of output)
	containerID := strings.TrimSpace(string(output))
	if idx := strings.Index(containerID, "\n"); idx != -1 {
		containerID = containerID[:idx]
	}

	// If caller requested immediate start, start now
	if cfg.Detach {
		if err := c.ContainerStart(ctx, containerID); err != nil {
			// Cleanup on failure
			_ = c.ContainerRemove(ctx, containerID, true)
			return "", fmt.Errorf("failed to start container: %w", err)
		}
	}

	return containerID, nil
}

// ContainerState returns the state of a container.
// Returns ErrContainerNotFound if the container does not exist.
func (c *Client) ContainerState(ctx context.Context, nameOrID string) (types.ContainerState, error) {
	cmd := exec.CommandContext(ctx, "podman", "inspect", "--format", "{{json .State}}", nameOrID)
	output, err := cmd.CombinedOutput()
	if err != nil {
		lower := strings.ToLower(string(output))
		if strings.Contains(lower, "no such container") || strings.Contains(lower, "no such object") {
			return types.ContainerState{}, types.ErrContainerNotFound
		}
		return types.ContainerState{}, fmt.Errorf("failed to inspect container: %w: %s", err, string(output))
	}

	var state struct {
		Status   string `json:"Status"`
		Running  bool   `json:"Running"`
		Paused   bool   `json:"Paused"`
		ExitCode int    `json:"ExitCode"`
	}
	if err := json.Unmarshal(bytes.TrimSpace(output), &state); err != nil {
		return types.ContainerState{}, fmt.Errorf("failed to parse container state: %w", err)
	}

	return types.ContainerState{
		Status:   state.Status,
		Running:  state.Running,
		Paused:   state.Paused,
		ExitCode: state.ExitCode,
	}, nil
}

// ContainerNetworks returns the networks the container is attached to
func (c *Client) ContainerNetworks(ctx context.Context, nameOrID string) ([]string, error) {
	cmd := exec.CommandContext(ctx, "podman", "inspect", "-f", "{{json .NetworkSettings.Networks}}", nameOrID)
	output, err := cmd.CombinedOutput()
	if err != nil {
		lower := strings.ToLower(string(output))
		if strings.Contains(lower, "no such container") || strings.Contains(lower, "no such object") {
			return nil, types.ErrContainerNotFound
		}
		return nil, fmt.Errorf("failed to inspect container networks: %w: %s", err, string(output))
	}

	var networks map[string]any
	if err := json.Unmarshal(bytes.TrimSpace(output), &networks); err != nil {
		return nil, fmt.Errorf("failed to parse container networks: %w", err)
	}

	result := make([]string, 0, len(networks))
	for name := range networks {
		result = append(result, name)
	}
	return result, nil
}

// Exec executes a command in a running container
func (c *Client) Exec(ctx context.Context, container string, cmd []string) error {
	args := append([]string{"exec", container}, cmd...)
	execCmd := exec.CommandContext(ctx, "podman", args...)
	output, err := execCmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman exec failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

// ExecWithIO executes a command with custom I/O streams
func (c *Client) ExecWithIO(ctx context.Context, container string, cmd []string, stdin io.Reader, stdout, stderr io.Writer) error {
	args := []string{"exec"}
	if stdin != nil {
		args = append(args, "-i")
	}
	args = append(args, container)
	args = append(args, cmd...)

	execCmd := exec.CommandContext(ctx, "podman", args...)
	execCmd.Stdin = stdin

	if stdout != nil || stderr != nil {
		if stdout != nil {
			execCmd.Stdout = stdout
		}
		if stderr != nil {
			execCmd.Stderr = stderr
		}

		if err := execCmd.Run(); err != nil {
			return fmt.Errorf("podman exec failed: %w", err)
		}
		return nil
	}

	output, err := execCmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman exec failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

// NetworkConnect connects a container to a network
func (c *Client) NetworkConnect(ctx context.Context, network, container string) error {
	cmd := exec.CommandContext(ctx, "podman", "network", "connect", network, container)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman network connect failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

// ImageInspect returns metadata about an image
func (c *Client) ImageInspect(ctx context.Context, image string) (types.ImageInfo, error) {
	cmd := exec.CommandContext(ctx, "podman", "image", "inspect", image)
	output, err := cmd.CombinedOutput()
	if err != nil {
		lower := strings.ToLower(string(output))
		if strings.Contains(lower, "no such image") || strings.Contains(lower, "image not known") {
			return types.ImageInfo{}, types.ErrImageNotFound
		}
		return types.ImageInfo{}, fmt.Errorf("failed to inspect image %s: %w\nOutput: %s", image, err, string(output))
	}

	var info []struct {
		ID   string `json:"Id"`
		Size int64  `json:"Size"`
	}
	if err := json.Unmarshal(output, &info); err != nil {
		return types.ImageInfo{}, fmt.Errorf("failed to parse image inspect output: %w", err)
	}

	if len(info) == 0 {
		return types.ImageInfo{}, types.ErrImageNotFound
	}

	return types.ImageInfo{ID: info[0].ID, Size: info[0].Size}, nil
}

// ImagePull pulls an image from a registry
func (c *Client) ImagePull(ctx context.Context, image string) error {
	cmd := exec.CommandContext(ctx, "podman", "pull", image)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman pull failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

type containerInspectInfo struct {
	ID          string `json:"Id"`
	Name        string `json:"Name"`
	Image       string `json:"Image"`
	ImageDigest string `json:"ImageDigest"`
	Config      struct {
		Labels map[string]string `json:"Labels"`
	} `json:"Config"`
	State struct {
		Status   string `json:"Status"`
		Running  bool   `json:"Running"`
		Paused   bool   `json:"Paused"`
		ExitCode int    `json:"ExitCode"`
	} `json:"State"`
}

func parseContainerInspect(output []byte) (types.ContainerInfo, error) {
	var info []containerInspectInfo
	if err := json.Unmarshal(output, &info); err != nil {
		return types.ContainerInfo{}, fmt.Errorf("failed to parse container inspect output: %w", err)
	}
	if len(info) == 0 {
		return types.ContainerInfo{}, types.ErrContainerNotFound
	}

	// Docker reports a resolved image ID here; Podman exposes it as `.Image`.
	// `.ImageDigest` is a manifest digest and does not match `ImageInspect().ID`.
	return types.ContainerInfo{
		ID:      info[0].ID,
		Name:    info[0].Name,
		Image:   info[0].Image,
		ImageID: info[0].Image,
		Labels:  info[0].Config.Labels,
		State: types.ContainerState{
			Status:   info[0].State.Status,
			Running:  info[0].State.Running,
			Paused:   info[0].State.Paused,
			ExitCode: info[0].State.ExitCode,
		},
	}, nil
}

// ContainerInspect returns detailed information about a container
func (c *Client) ContainerInspect(ctx context.Context, nameOrID string) (types.ContainerInfo, error) {
	cmd := exec.CommandContext(ctx, "podman", "inspect", nameOrID)
	output, err := cmd.CombinedOutput()
	if err != nil {
		lower := strings.ToLower(string(output))
		if strings.Contains(lower, "no such container") || strings.Contains(lower, "no such object") {
			return types.ContainerInfo{}, types.ErrContainerNotFound
		}
		return types.ContainerInfo{}, fmt.Errorf("failed to inspect container: %w: %s", err, string(output))
	}

	return parseContainerInspect(output)
}

// ContainerStart starts an existing container
func (c *Client) ContainerStart(ctx context.Context, nameOrID string) error {
	cmd := exec.CommandContext(ctx, "podman", "start", nameOrID)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman start failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

// ContainerStop stops a running container
func (c *Client) ContainerStop(ctx context.Context, nameOrID string, timeout *int) error {
	args := []string{"stop"}
	if timeout != nil {
		args = append(args, "-t", fmt.Sprintf("%d", *timeout))
	}
	args = append(args, nameOrID)

	cmd := exec.CommandContext(ctx, "podman", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		if isContainerNotFoundOutput(output) {
			return types.ErrContainerNotFound
		}
		return fmt.Errorf("podman stop failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

// ContainerRemove removes a container
func (c *Client) ContainerRemove(ctx context.Context, nameOrID string, force bool) error {
	args := []string{"rm"}
	if force {
		args = append(args, "-f")
	}
	args = append(args, nameOrID)

	cmd := exec.CommandContext(ctx, "podman", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		if isContainerNotFoundOutput(output) {
			return types.ErrContainerNotFound
		}
		return fmt.Errorf("podman rm failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

func isContainerNotFoundOutput(output []byte) bool {
	lower := strings.ToLower(string(output))
	return strings.Contains(lower, "no such container") ||
		strings.Contains(lower, "no such object") ||
		strings.Contains(lower, "container does not exist") ||
		strings.Contains(lower, "unable to find")
}

// NetworkCreate creates a new network
func (c *Client) NetworkCreate(ctx context.Context, cfg types.NetworkConfig) (string, error) {
	args := []string{"network", "create"}

	driver := cfg.Driver
	if driver != "" {
		args = append(args, "-d", driver)
	}

	for k, v := range cfg.Labels {
		args = append(args, "--label", fmt.Sprintf("%s=%s", k, v))
	}

	args = append(args, cfg.Name)

	cmd := exec.CommandContext(ctx, "podman", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("podman network create failed: %w\nOutput: %s", err, string(output))
	}

	// Return network ID (first line of output)
	networkID := strings.TrimSpace(string(output))
	if idx := strings.Index(networkID, "\n"); idx != -1 {
		networkID = networkID[:idx]
	}
	return networkID, nil
}

// NetworkInspect returns information about a network
func (c *Client) NetworkInspect(ctx context.Context, nameOrID string) (types.NetworkInfo, error) {
	cmd := exec.CommandContext(ctx, "podman", "network", "inspect", nameOrID)
	output, err := cmd.CombinedOutput()
	if err != nil {
		lower := strings.ToLower(string(output))
		if strings.Contains(lower, "no such network") || strings.Contains(lower, "network not found") {
			return types.NetworkInfo{}, types.ErrNetworkNotFound
		}
		return types.NetworkInfo{}, fmt.Errorf("failed to inspect network: %w: %s", err, string(output))
	}

	var info []struct {
		ID     string            `json:"id"`
		Name   string            `json:"name"`
		Driver string            `json:"driver"`
		Labels map[string]string `json:"labels"`
	}
	if err := json.Unmarshal(output, &info); err != nil {
		return types.NetworkInfo{}, fmt.Errorf("failed to parse network inspect output: %w", err)
	}

	if len(info) == 0 {
		return types.NetworkInfo{}, types.ErrNetworkNotFound
	}

	return types.NetworkInfo{
		ID:     info[0].ID,
		Name:   info[0].Name,
		Driver: info[0].Driver,
		Labels: info[0].Labels,
	}, nil
}

// NetworkRemove removes a network
func (c *Client) NetworkRemove(ctx context.Context, nameOrID string) error {
	cmd := exec.CommandContext(ctx, "podman", "network", "rm", nameOrID)
	output, err := cmd.CombinedOutput()
	if err != nil {
		outputStr := string(output)
		if strings.Contains(strings.ToLower(outputStr), "network not found") {
			return types.ErrNetworkNotFound
		}
		return fmt.Errorf("podman network rm failed: %w\nOutput: %s", err, outputStr)
	}
	return nil
}

// ContainerLogs returns a stream of container logs.
func (c *Client) ContainerLogs(
	ctx context.Context,
	nameOrID string,
	follow bool,
	tail string,
) (io.ReadCloser, error) {
	args := []string{"logs"}
	if follow {
		args = append(args, "-f")
	}
	if tail != "" {
		args = append(args, "--tail", tail)
	}
	args = append(args, nameOrID)

	cmd := exec.CommandContext(ctx, "podman", args...)

	// Create a pipe and redirect both stdout and stderr to it
	pr, pw := io.Pipe()
	cmd.Stdout = pw
	cmd.Stderr = pw

	if err := cmd.Start(); err != nil {
		_ = pw.Close()
		_ = pr.Close()
		lower := strings.ToLower(err.Error())
		if strings.Contains(lower, "no such container") {
			return nil, types.ErrContainerNotFound
		}
		return nil, fmt.Errorf("failed to start logs command: %w", err)
	}

	// Close the write end when the command exits
	done := make(chan struct{})
	go func() {
		defer close(done)
		_ = cmd.Wait()
		_ = pw.Close()
	}()

	return &cmdLogReader{cmd: cmd, reader: pr, done: done}, nil
}

// cmdLogReader wraps a pipe reader and cleans up the command on close.
type cmdLogReader struct {
	cmd       *exec.Cmd
	reader    *io.PipeReader
	done      <-chan struct{}
	closeOnce sync.Once
}

func (r *cmdLogReader) Read(p []byte) (int, error) {
	return r.reader.Read(p)
}

func (r *cmdLogReader) Close() error {
	r.closeOnce.Do(func() {
		// Close reader first to unblock any pending reads.
		_ = r.reader.Close()

		// Kill the process if still running.
		if r.cmd.Process != nil {
			_ = r.cmd.Process.Kill()
		}

		if r.done != nil {
			<-r.done
		}
	})
	return nil
}

// ContainerWait blocks until the container exits and returns the exit code.
func (c *Client) ContainerWait(ctx context.Context, nameOrID string) (int, error) {
	cmd := exec.CommandContext(ctx, "podman", "wait", nameOrID)
	output, err := cmd.Output()
	if err != nil {
		return -1, fmt.Errorf("wait container: %w", err)
	}

	var exitCode int
	if _, err := fmt.Sscanf(strings.TrimSpace(string(output)), "%d", &exitCode); err != nil {
		return -1, fmt.Errorf("parse exit code: %w", err)
	}

	return exitCode, nil
}
