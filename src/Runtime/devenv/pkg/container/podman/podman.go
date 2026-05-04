// Package podman provides a Podman CLI backed container client.
package podman

import (
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

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/processutil"
)

// Client implements ContainerClient for Podman using CLI.
type Client struct {
	toolchain types.ContainerToolchain
}

// New creates a new Podman CLI client.
func New(ctx context.Context, toolchain types.ContainerToolchain) (*Client, error) {
	// Verify podman is available
	if _, err := exec.LookPath("podman"); err != nil {
		return nil, fmt.Errorf("podman not found in PATH: %w", err)
	}
	// Verify podman is responsive
	cmd := processutil.CommandContext(ctx, "podman", "version", "--format", "{{.Version}}")
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("podman not responsive: %w", err)
	}
	toolchain.AccessMode = types.AccessPodmanCLI
	if toolchain.Platform == types.PlatformUnknown {
		toolchain.Platform = types.PlatformPodman
	}
	return &Client{toolchain: toolchain}, nil
}

// Close releases resources (no-op for CLI client).
func (c *Client) Close() error {
	return nil
}

// Toolchain returns the resolved platform and access mode metadata.
func (c *Client) Toolchain() types.ContainerToolchain {
	return c.toolchain
}

func reportProgress(onProgress types.ProgressHandler, progress types.ProgressUpdate) {
	if onProgress != nil {
		onProgress(progress)
	}
}

func runPodmanCommand(ctx context.Context, args []string) ([]byte, error) {
	cmd := processutil.CommandContext(ctx, "podman", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return output, fmt.Errorf("run podman command %q: %w", strings.Join(args, " "), err)
	}
	return output, nil
}

// Build builds a container image from a Dockerfile.
func (c *Client) Build(ctx context.Context, contextPath, dockerfile, tag string, opts ...types.BuildOptions) error {
	return c.BuildWithProgress(ctx, contextPath, dockerfile, tag, nil, opts...)
}

// BuildWithProgress builds a container image and emits best-effort progress updates.
func (c *Client) BuildWithProgress(
	ctx context.Context,
	contextPath, dockerfile, tag string,
	onProgress types.ProgressHandler,
	_ ...types.BuildOptions,
) error {
	// Podman CLI does not expose a stable structured progress stream here.
	// Emit lifecycle progress only to avoid brittle output parsing.
	reportProgress(onProgress, types.ProgressUpdate{
		Message:       "build started",
		Indeterminate: true,
	})

	output, err := runPodmanCommand(ctx, []string{"build", "-t", tag, "-f", dockerfile, contextPath})
	if err != nil {
		return fmt.Errorf("podman build failed: %w\nOutput: %s", err, string(output))
	}

	reportProgress(onProgress, types.ProgressUpdate{
		Message:       "build completed",
		Current:       1,
		Total:         1,
		Indeterminate: false,
	})
	return nil
}

// Push pushes an image to a registry.
func (c *Client) Push(ctx context.Context, image string) error {
	cmd := processutil.CommandContext(ctx, "podman", types.PlatformPodman.PushArgs(image)...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman push failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

// CreateContainer creates and optionally starts a container.
func (c *Client) CreateContainer(ctx context.Context, cfg types.ContainerConfig) (string, error) {
	args := buildCreateArgs(cfg)

	cmd := processutil.CommandContext(ctx, "podman", args...)
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
			removePodmanContainerBestEffort(ctx, c, containerID)
			return "", fmt.Errorf("failed to start container: %w", err)
		}
	}

	return containerID, nil
}

// buildCreateArgs assembles the podman create CLI arguments from a ContainerConfig.
func buildCreateArgs(cfg types.ContainerConfig) []string {
	args := []string{"create"}

	if cfg.Name != "" {
		args = append(args, "--name", cfg.Name)
	}

	if cfg.RestartPolicy != "" && cfg.RestartPolicy != "no" {
		args = append(args, "--restart="+cfg.RestartPolicy)
	}

	for _, net := range cfg.Networks {
		args = append(args, "--network", net)
	}

	for _, alias := range cfg.NetworkAliases {
		args = append(args, "--network-alias", alias)
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

	caps := types.MergeCapabilities(types.DefaultPodmanCapabilities(), cfg.CapAdd)
	for _, cap := range caps {
		args = append(args, "--cap-add", cap)
	}

	args = appendHealthCheckArgs(args, cfg.HealthCheck)

	args = append(args, cfg.Image)
	args = append(args, cfg.Command...)

	return args
}

// appendHealthCheckArgs appends health check CLI flags if configured.
func appendHealthCheckArgs(args []string, hc *types.HealthCheck) []string {
	if hc == nil || len(hc.Test) == 0 {
		return args
	}
	args = append(args, "--health-cmd", podmanHealthCmd(hc.Test))
	if hc.Interval > 0 {
		args = append(args, "--health-interval", hc.Interval.String())
	}
	if hc.Timeout > 0 {
		args = append(args, "--health-timeout", hc.Timeout.String())
	}
	if hc.Retries > 0 {
		args = append(args, "--health-retries", strconv.Itoa(hc.Retries))
	}
	if hc.StartPeriod > 0 {
		args = append(args, "--health-start-period", hc.StartPeriod.String())
	}
	return args
}

// ContainerState returns the state of a container.
// Returns ErrContainerNotFound if the container does not exist.
func (c *Client) ContainerState(ctx context.Context, nameOrID string) (types.ContainerState, error) {
	cmd := processutil.CommandContext(ctx, "podman", "inspect", "--format", "{{json .State}}", nameOrID)
	output, err := cmd.CombinedOutput()
	if err != nil {
		lower := strings.ToLower(string(output))
		if strings.Contains(lower, "no such container") || strings.Contains(lower, "no such object") {
			return types.ContainerState{}, types.ErrContainerNotFound
		}
		return types.ContainerState{}, fmt.Errorf("failed to inspect container: %w: %s", err, string(output))
	}

	var state podmanContainerState
	if err := json.Unmarshal(bytes.TrimSpace(output), &state); err != nil {
		return types.ContainerState{}, fmt.Errorf("failed to parse container state: %w", err)
	}

	return types.ContainerState{
		Status:       state.Status,
		HealthStatus: podmanHealthStatus(state.Health.Status, state.Healthcheck.Status),
		Running:      state.Running,
		Paused:       state.Paused,
		ExitCode:     state.ExitCode,
	}, nil
}

// ContainerNetworks returns the networks the container is attached to.
func (c *Client) ContainerNetworks(ctx context.Context, nameOrID string) ([]string, error) {
	cmd := processutil.CommandContext(ctx, "podman", "inspect", "-f", "{{json .NetworkSettings.Networks}}", nameOrID)
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

// Exec executes a command in a running container.
func (c *Client) Exec(ctx context.Context, container string, cmd []string) error {
	args := append([]string{"exec", container}, cmd...)
	execCmd := processutil.CommandContext(ctx, "podman", args...)
	output, err := execCmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman exec failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

// ExecWithIO executes a command with custom I/O streams.
func (c *Client) ExecWithIO(
	ctx context.Context,
	container string,
	cmd []string,
	stdin io.Reader,
	stdout, stderr io.Writer,
) error {
	args := []string{"exec"}
	if stdin != nil {
		args = append(args, "-i")
	}
	args = append(args, container)
	args = append(args, cmd...)

	execCmd := processutil.CommandContext(ctx, "podman", args...)
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

// NetworkConnect connects a container to a network.
func (c *Client) NetworkConnect(ctx context.Context, network, container string) error {
	cmd := processutil.CommandContext(ctx, "podman", "network", "connect", network, container)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman network connect failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

// ImageInspect returns metadata about an image.
func (c *Client) ImageInspect(ctx context.Context, image string) (types.ImageInfo, error) {
	cmd := processutil.CommandContext(ctx, "podman", "image", "inspect", image)
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

// ImagePull pulls an image from a registry.
func (c *Client) ImagePull(ctx context.Context, image string) error {
	return c.ImagePullWithProgress(ctx, image, nil)
}

// ImagePullWithProgress pulls an image and emits best-effort progress updates.
func (c *Client) ImagePullWithProgress(
	ctx context.Context,
	image string,
	onProgress types.ProgressHandler,
) error {
	reportProgress(onProgress, types.ProgressUpdate{
		Message:       "pull started",
		Indeterminate: true,
	})

	output, err := runPodmanCommand(ctx, []string{"pull", image})
	if err != nil {
		return fmt.Errorf("podman pull failed: %w\nOutput: %s", err, string(output))
	}

	reportProgress(onProgress, types.ProgressUpdate{
		Message:       "pull completed",
		Current:       1,
		Total:         1,
		Indeterminate: false,
	})

	return nil
}

type containerInspectInfo struct {
	Config struct {
		Labels map[string]string `json:"Labels"`
	} `json:"Config"`
	ID              string `json:"Id"`
	Name            string `json:"Name"`
	Image           string `json:"Image"`
	ImageDigest     string `json:"ImageDigest"`
	NetworkSettings struct {
		Ports map[string][]struct {
			HostIP   string `json:"HostIp"`
			HostPort string `json:"HostPort"`
		} `json:"Ports"`
	} `json:"NetworkSettings"`
	State podmanContainerState `json:"State"`
}

type podmanContainerState struct {
	Status      string           `json:"Status"`
	Health      podmanHealthInfo `json:"Health"`
	Healthcheck podmanHealthInfo `json:"Healthcheck"`
	ExitCode    int              `json:"ExitCode"`
	Running     bool             `json:"Running"`
	Paused      bool             `json:"Paused"`
}

type podmanHealthInfo struct {
	Status string `json:"Status"`
}

func parseContainerInspect(output []byte) (types.ContainerInfo, error) {
	var info []containerInspectInfo
	if err := json.Unmarshal(output, &info); err != nil {
		return types.ContainerInfo{}, fmt.Errorf("failed to parse container inspect output: %w", err)
	}
	if len(info) == 0 {
		return types.ContainerInfo{}, types.ErrContainerNotFound
	}

	return types.ContainerInfo{
		ID:      info[0].ID,
		Name:    info[0].Name,
		Image:   info[0].Image,
		ImageID: info[0].Image,
		Labels:  info[0].Config.Labels,
		Ports:   publishedPortsFromPodmanInspect(info[0].NetworkSettings.Ports),
		State: types.ContainerState{
			Status:       info[0].State.Status,
			HealthStatus: podmanHealthStatus(info[0].State.Health.Status, info[0].State.Healthcheck.Status),
			Running:      info[0].State.Running,
			Paused:       info[0].State.Paused,
			ExitCode:     info[0].State.ExitCode,
		},
	}, nil
}

func podmanHealthStatus(health, healthcheck string) string {
	if health != "" {
		return health
	}
	return healthcheck
}

// ContainerInspect returns detailed information about a container.
func (c *Client) ContainerInspect(ctx context.Context, nameOrID string) (types.ContainerInfo, error) {
	cmd := processutil.CommandContext(ctx, "podman", "inspect", nameOrID)
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

type podmanContainerListInfo struct {
	ID      string                `json:"Id"`
	Name    string                `json:"Name"`
	Image   string                `json:"Image"`
	ImageID string                `json:"ImageID"`
	State   string                `json:"State"`
	Status  string                `json:"Status"`
	Labels  map[string]string     `json:"Labels"`
	Names   []string              `json:"Names"`
	Ports   []podmanPublishedPort `json:"Ports"`
}

type podmanPublishedPort struct {
	HostIP             stringOrNumber `json:"host_ip"`
	HostIPTitle        stringOrNumber `json:"HostIP"`
	HostPort           stringOrNumber `json:"host_port"`
	HostPortTitle      stringOrNumber `json:"HostPort"`
	ContainerPort      stringOrNumber `json:"container_port"`
	ContainerPortTitle stringOrNumber `json:"ContainerPort"`
	Protocol           string         `json:"protocol"`
	ProtocolTitle      string         `json:"Protocol"`
}

type stringOrNumber string

func (v *stringOrNumber) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		*v = stringOrNumber(s)
		return nil
	}
	var n int
	if err := json.Unmarshal(data, &n); err == nil {
		*v = stringOrNumber(strconv.Itoa(n))
		return nil
	}
	return nil
}

func (v *stringOrNumber) String() string {
	if v == nil {
		return ""
	}
	return string(*v)
}

// ListContainers returns containers matching the provided filters.
func (c *Client) ListContainers(ctx context.Context, filter types.ContainerListFilter) ([]types.ContainerInfo, error) {
	args := []string{"ps", "--format", "json"}
	if filter.All {
		args = append(args, "--all")
	}
	for key, value := range filter.Labels {
		label := key
		if value != "" {
			label += "=" + value
		}
		args = append(args, "--filter", "label="+label)
	}

	output, err := runPodmanCommand(ctx, args)
	if err != nil {
		return nil, fmt.Errorf("podman list containers failed: %w\nOutput: %s", err, string(output))
	}

	var containers []podmanContainerListInfo
	if err := json.Unmarshal(bytes.TrimSpace(output), &containers); err != nil {
		return nil, fmt.Errorf("failed to parse podman container list output: %w", err)
	}

	result := make([]types.ContainerInfo, 0, len(containers))
	for _, ctr := range containers {
		status := ctr.State
		if status == "" {
			status = ctr.Status
		}
		result = append(result, types.ContainerInfo{
			ID:      ctr.ID,
			Name:    podmanContainerName(ctr),
			Image:   ctr.Image,
			ImageID: ctr.ImageID,
			Labels:  ctr.Labels,
			Ports:   publishedPortsFromPodmanList(ctr.Ports),
			State: types.ContainerState{
				Status:  status,
				Running: strings.EqualFold(status, "running"),
			},
		})
	}
	return result, nil
}

func podmanContainerName(ctr podmanContainerListInfo) string {
	if ctr.Name != "" {
		return ctr.Name
	}
	if len(ctr.Names) > 0 {
		return ctr.Names[0]
	}
	return ""
}

func publishedPortsFromPodmanList(ports []podmanPublishedPort) []types.PublishedPort {
	result := make([]types.PublishedPort, 0, len(ports))
	for _, port := range ports {
		hostPort := firstNonEmpty(port.HostPort.String(), port.HostPortTitle.String())
		if hostPort == "" {
			continue
		}
		result = append(result, types.PublishedPort{
			HostIP:        firstNonEmpty(port.HostIP.String(), port.HostIPTitle.String()),
			HostPort:      hostPort,
			ContainerPort: firstNonEmpty(port.ContainerPort.String(), port.ContainerPortTitle.String()),
			Protocol:      firstNonEmpty(port.Protocol, port.ProtocolTitle),
		})
	}
	return result
}

func publishedPortsFromPodmanInspect(ports map[string][]struct {
	HostIP   string `json:"HostIp"`
	HostPort string `json:"HostPort"`
}) []types.PublishedPort {
	var result []types.PublishedPort
	for containerPort, bindings := range ports {
		port, protocol, _ := strings.Cut(containerPort, "/")
		for _, binding := range bindings {
			result = append(result, types.PublishedPort{
				HostIP:        binding.HostIP,
				HostPort:      binding.HostPort,
				ContainerPort: port,
				Protocol:      protocol,
			})
		}
	}
	return result
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

// ContainerStart starts an existing container.
func (c *Client) ContainerStart(ctx context.Context, nameOrID string) error {
	cmd := processutil.CommandContext(ctx, "podman", "start", nameOrID)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman start failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

// ContainerStop stops a running container.
func (c *Client) ContainerStop(ctx context.Context, nameOrID string, timeout *int) error {
	args := []string{"stop"}
	if timeout != nil {
		args = append(args, "-t", strconv.Itoa(*timeout))
	}
	args = append(args, nameOrID)

	cmd := processutil.CommandContext(ctx, "podman", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		if isContainerNotFoundOutput(output) {
			return types.ErrContainerNotFound
		}
		return fmt.Errorf("podman stop failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

// ContainerRemove removes a container.
func (c *Client) ContainerRemove(ctx context.Context, nameOrID string, force bool) error {
	args := []string{"rm"}
	if force {
		args = append(args, "-f")
	}
	args = append(args, nameOrID)

	cmd := processutil.CommandContext(ctx, "podman", args...)
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

// NetworkCreate creates a new network.
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

	cmd := processutil.CommandContext(ctx, "podman", args...)
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

// NetworkInspect returns information about a network.
func (c *Client) NetworkInspect(ctx context.Context, nameOrID string) (types.NetworkInfo, error) {
	cmd := processutil.CommandContext(ctx, "podman", "network", "inspect", nameOrID)
	output, err := cmd.CombinedOutput()
	if err != nil {
		lower := strings.ToLower(string(output))
		if strings.Contains(lower, "no such network") || strings.Contains(lower, "network not found") {
			return types.NetworkInfo{}, types.ErrNetworkNotFound
		}
		return types.NetworkInfo{}, fmt.Errorf("failed to inspect network: %w: %s", err, string(output))
	}

	var info []struct {
		Labels map[string]string `json:"labels"`
		ID     string            `json:"id"`
		Name   string            `json:"name"`
		Driver string            `json:"driver"`
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

type podmanNetworkListInfo struct {
	Labels      map[string]string `json:"labels"`
	LabelsTitle map[string]string `json:"Labels"`
	ID          string            `json:"id"`
	IDTitle     string            `json:"ID"`
	Name        string            `json:"name"`
	NameTitle   string            `json:"Name"`
	Driver      string            `json:"driver"`
	DriverTitle string            `json:"Driver"`
}

// ListNetworks returns networks matching the provided filters.
func (c *Client) ListNetworks(ctx context.Context, filter types.NetworkListFilter) ([]types.NetworkInfo, error) {
	args := make([]string, 0, 4+2*len(filter.Labels))
	args = append(args, "network", "ls", "--format", "json")
	for key, value := range filter.Labels {
		label := key
		if value != "" {
			label += "=" + value
		}
		args = append(args, "--filter", "label="+label)
	}

	output, err := runPodmanCommand(ctx, args)
	if err != nil {
		return nil, fmt.Errorf("podman list networks failed: %w\nOutput: %s", err, string(output))
	}

	var networks []podmanNetworkListInfo
	if err := json.Unmarshal(bytes.TrimSpace(output), &networks); err != nil {
		return nil, fmt.Errorf("failed to parse podman network list output: %w", err)
	}

	result := make([]types.NetworkInfo, 0, len(networks))
	for _, net := range networks {
		result = append(result, types.NetworkInfo{
			ID:     firstNonEmpty(net.ID, net.IDTitle),
			Name:   firstNonEmpty(net.Name, net.NameTitle),
			Driver: firstNonEmpty(net.Driver, net.DriverTitle),
			Labels: firstNonNilMap(net.Labels, net.LabelsTitle),
		})
	}
	return result, nil
}

func firstNonNilMap(values ...map[string]string) map[string]string {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

// NetworkRemove removes a network.
func (c *Client) NetworkRemove(ctx context.Context, nameOrID string) error {
	cmd := processutil.CommandContext(ctx, "podman", "network", "rm", nameOrID)
	output, err := cmd.CombinedOutput()
	if err != nil {
		outputStr := string(output)
		outputLower := strings.ToLower(outputStr)
		if strings.Contains(outputLower, "network not found") {
			return types.ErrNetworkNotFound
		}
		if strings.Contains(outputLower, "in use") ||
			strings.Contains(outputLower, "active endpoints") ||
			strings.Contains(outputLower, "associated containers") {
			return types.ErrNetworkInUse
		}
		return fmt.Errorf("podman network rm failed: %w\nOutput: %s", err, outputStr)
	}
	return nil
}

// VolumeRemove removes a named volume.
func (c *Client) VolumeRemove(ctx context.Context, name string, force bool) error {
	args := []string{"volume", "rm"}
	if force {
		args = append(args, "-f")
	}
	args = append(args, name)

	cmd := processutil.CommandContext(ctx, "podman", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		if isVolumeNotFoundOutput(output) {
			return types.ErrVolumeNotFound
		}
		return fmt.Errorf("podman volume rm failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

func isVolumeNotFoundOutput(output []byte) bool {
	lower := strings.ToLower(string(output))
	return strings.Contains(lower, "no such volume") ||
		strings.Contains(lower, "no such object") ||
		strings.Contains(lower, "volume does not exist")
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

	cmd := processutil.CommandContext(ctx, "podman", args...)

	// Create a pipe and redirect both stdout and stderr to it
	pr, pw := io.Pipe()
	cmd.Stdout = pw
	cmd.Stderr = pw

	if err := cmd.Start(); err != nil {
		closeWritePipeBestEffort(pw)
		closeReadPipeBestEffort(pr)
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
		waitCmdBestEffort(cmd)
		closeWritePipeBestEffort(pw)
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

//nolint:wrapcheck // io.Reader implementations should preserve EOF semantics.
func (r *cmdLogReader) Read(p []byte) (int, error) {
	n, err := r.reader.Read(p)
	if err != nil {
		if errors.Is(err, io.EOF) {
			return n, err
		}
		return n, fmt.Errorf("read podman logs: %w", err)
	}
	return n, nil
}

func (r *cmdLogReader) Close() error {
	r.closeOnce.Do(func() {
		// Close reader first to unblock any pending reads.
		closeReadPipeBestEffort(r.reader)

		// Kill the process if still running.
		if r.cmd.Process != nil {
			killProcessBestEffort(r.cmd.Process)
		}

		if r.done != nil {
			<-r.done
		}
	})
	return nil
}

//nolint:errcheck,gosec // Cleanup after a failed podman start is best-effort.
func removePodmanContainerBestEffort(ctx context.Context, client *Client, containerID string) {
	client.ContainerRemove(ctx, containerID, true)
}

//nolint:errcheck,gosec // Pipe cleanup is best-effort.
func closeWritePipeBestEffort(pw *io.PipeWriter) {
	pw.Close()
}

//nolint:errcheck,gosec // Pipe cleanup is best-effort.
func closeReadPipeBestEffort(pr *io.PipeReader) {
	pr.Close()
}

//nolint:errcheck,gosec // Command cleanup is best-effort after the reader closes.
func waitCmdBestEffort(cmd *exec.Cmd) {
	cmd.Wait()
}

//nolint:errcheck,gosec // Process cleanup is best-effort during reader shutdown.
func killProcessBestEffort(process *os.Process) {
	process.Kill()
}

// ContainerWait blocks until the container exits and returns the exit code.
func (c *Client) ContainerWait(ctx context.Context, nameOrID string) (int, error) {
	cmd := processutil.CommandContext(ctx, "podman", "wait", nameOrID)
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

// podmanHealthCmd converts a Docker-style health check test to a podman --health-cmd string.
// Docker format: ["CMD-SHELL", "command"] or ["CMD", "arg1", "arg2"]
// Podman expects a single shell string for --health-cmd.
func podmanHealthCmd(test []string) string {
	if len(test) == 0 {
		return ""
	}
	switch test[0] {
	case "CMD-SHELL":
		if len(test) > 1 {
			return test[1]
		}
		return ""
	case "CMD":
		return strings.Join(test[1:], " ")
	default:
		return strings.Join(test, " ")
	}
}
