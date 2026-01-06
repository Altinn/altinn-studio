package podman

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
	"strings"

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
	// --tls-verify=false for local insecure registries
	cmd := exec.CommandContext(ctx, "podman", "push", "--tls-verify=false", image)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman push failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

// CreateContainer creates and optionally starts a container
func (c *Client) CreateContainer(ctx context.Context, cfg types.ContainerConfig) (string, error) {
	args := []string{"run"}

	if cfg.Detach {
		args = append(args, "-d")
	}

	if cfg.Name != "" {
		args = append(args, "--name", cfg.Name)
	}

	if cfg.RestartPolicy != "" && cfg.RestartPolicy != "no" {
		args = append(args, fmt.Sprintf("--restart=%s", cfg.RestartPolicy))
	}

	if cfg.Network != "" {
		args = append(args, "--network", cfg.Network)
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

	args = append(args, cfg.Image)
	args = append(args, cfg.Command...)

	cmd := exec.CommandContext(ctx, "podman", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("podman run failed: %w\nOutput: %s", err, string(output))
	}

	// Return container ID (first line of output for detached containers)
	containerID := strings.TrimSpace(string(output))
	if idx := strings.Index(containerID, "\n"); idx != -1 {
		containerID = containerID[:idx]
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
		return nil, nil
	}

	var networks map[string]any
	if err := json.Unmarshal(bytes.TrimSpace(output), &networks); err != nil {
		return nil, nil
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
		var outBuf, errBuf bytes.Buffer
		if stdout != nil {
			execCmd.Stdout = &outBuf
		}
		if stderr != nil {
			execCmd.Stderr = &errBuf
		}

		err := execCmd.Run()

		if stdout != nil {
			_, _ = stdout.Write(outBuf.Bytes())
		}
		if stderr != nil {
			_, _ = stderr.Write(errBuf.Bytes())
		}

		if err != nil {
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
		return types.ImageInfo{}, fmt.Errorf("no image info returned for %s", image)
	}

	return types.ImageInfo{ID: info[0].ID, Size: info[0].Size}, nil
}
