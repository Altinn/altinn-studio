// Package mock provides a mock implementation of ContainerClient for testing.
package mock

import (
	"context"
	"io"
	"sync"

	"altinn.studio/devenv/pkg/container/types"
)

// Client is a mock implementation of ContainerClient.
// All methods can be configured with custom behavior via function fields.
type Client struct {
	mu sync.Mutex

	// Method implementations - set these to customize behavior
	BuildFunc             func(ctx context.Context, contextPath, dockerfile, tag string) error
	PushFunc              func(ctx context.Context, image string) error
	CreateContainerFunc   func(ctx context.Context, cfg types.ContainerConfig) (string, error)
	ContainerStateFunc    func(ctx context.Context, nameOrID string) (types.ContainerState, error)
	ContainerNetworksFunc func(ctx context.Context, nameOrID string) ([]string, error)
	ExecFunc              func(ctx context.Context, container string, cmd []string) error
	ExecWithIOFunc        func(ctx context.Context, container string, cmd []string, stdin io.Reader, stdout, stderr io.Writer) error
	NetworkConnectFunc    func(ctx context.Context, network, container string) error
	ImageInspectFunc      func(ctx context.Context, image string) (types.ImageInfo, error)
	ImagePullFunc         func(ctx context.Context, image string) error
	ContainerInspectFunc  func(ctx context.Context, nameOrID string) (types.ContainerInfo, error)
	ContainerStartFunc    func(ctx context.Context, nameOrID string) error
	ContainerStopFunc     func(ctx context.Context, nameOrID string, timeout *int) error
	ContainerRemoveFunc   func(ctx context.Context, nameOrID string, force bool) error
	NetworkCreateFunc     func(ctx context.Context, cfg types.NetworkConfig) (string, error)
	NetworkInspectFunc    func(ctx context.Context, nameOrID string) (types.NetworkInfo, error)
	NetworkRemoveFunc     func(ctx context.Context, nameOrID string) error
	ContainerLogsFunc     func(ctx context.Context, nameOrID string, follow bool, tail string) (io.ReadCloser, error)
	ContainerWaitFunc     func(ctx context.Context, nameOrID string) (int, error)
	InstallationFunc      func() types.RuntimeInstallation

	// Call tracking
	Calls []Call
}

// Call records a method call for verification.
type Call struct {
	Method string
	Args   []any
}

// New creates a new mock client with default no-op implementations.
func New() *Client {
	return &Client{}
}

func (c *Client) recordCall(method string, args ...any) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.Calls = append(c.Calls, Call{Method: method, Args: args})
}

// Build implements ContainerClient.
func (c *Client) Build(ctx context.Context, contextPath, dockerfile, tag string) error {
	c.recordCall("Build", contextPath, dockerfile, tag)
	if c.BuildFunc != nil {
		return c.BuildFunc(ctx, contextPath, dockerfile, tag)
	}
	return nil
}

// Push implements ContainerClient.
func (c *Client) Push(ctx context.Context, image string) error {
	c.recordCall("Push", image)
	if c.PushFunc != nil {
		return c.PushFunc(ctx, image)
	}
	return nil
}

// CreateContainer implements ContainerClient.
func (c *Client) CreateContainer(ctx context.Context, cfg types.ContainerConfig) (string, error) {
	c.recordCall("CreateContainer", cfg)
	if c.CreateContainerFunc != nil {
		return c.CreateContainerFunc(ctx, cfg)
	}
	return "mock-container-id", nil
}

// ContainerState implements ContainerClient.
func (c *Client) ContainerState(ctx context.Context, nameOrID string) (types.ContainerState, error) {
	c.recordCall("ContainerState", nameOrID)
	if c.ContainerStateFunc != nil {
		return c.ContainerStateFunc(ctx, nameOrID)
	}
	return types.ContainerState{Status: "running", Running: true}, nil
}

// ContainerNetworks implements ContainerClient.
func (c *Client) ContainerNetworks(ctx context.Context, nameOrID string) ([]string, error) {
	c.recordCall("ContainerNetworks", nameOrID)
	if c.ContainerNetworksFunc != nil {
		return c.ContainerNetworksFunc(ctx, nameOrID)
	}
	return nil, nil
}

// Exec implements ContainerClient.
func (c *Client) Exec(ctx context.Context, container string, cmd []string) error {
	c.recordCall("Exec", container, cmd)
	if c.ExecFunc != nil {
		return c.ExecFunc(ctx, container, cmd)
	}
	return nil
}

// ExecWithIO implements ContainerClient.
func (c *Client) ExecWithIO(ctx context.Context, container string, cmd []string, stdin io.Reader, stdout, stderr io.Writer) error {
	c.recordCall("ExecWithIO", container, cmd)
	if c.ExecWithIOFunc != nil {
		return c.ExecWithIOFunc(ctx, container, cmd, stdin, stdout, stderr)
	}
	return nil
}

// NetworkConnect implements ContainerClient.
func (c *Client) NetworkConnect(ctx context.Context, network, container string) error {
	c.recordCall("NetworkConnect", network, container)
	if c.NetworkConnectFunc != nil {
		return c.NetworkConnectFunc(ctx, network, container)
	}
	return nil
}

// ImageInspect implements ContainerClient.
func (c *Client) ImageInspect(ctx context.Context, image string) (types.ImageInfo, error) {
	c.recordCall("ImageInspect", image)
	if c.ImageInspectFunc != nil {
		return c.ImageInspectFunc(ctx, image)
	}
	return types.ImageInfo{ID: "sha256:mock-image-id"}, nil
}

// ImagePull implements ContainerClient.
func (c *Client) ImagePull(ctx context.Context, image string) error {
	c.recordCall("ImagePull", image)
	if c.ImagePullFunc != nil {
		return c.ImagePullFunc(ctx, image)
	}
	return nil
}

// ContainerInspect implements ContainerClient.
func (c *Client) ContainerInspect(ctx context.Context, nameOrID string) (types.ContainerInfo, error) {
	c.recordCall("ContainerInspect", nameOrID)
	if c.ContainerInspectFunc != nil {
		return c.ContainerInspectFunc(ctx, nameOrID)
	}
	return types.ContainerInfo{}, types.ErrContainerNotFound
}

// ContainerStart implements ContainerClient.
func (c *Client) ContainerStart(ctx context.Context, nameOrID string) error {
	c.recordCall("ContainerStart", nameOrID)
	if c.ContainerStartFunc != nil {
		return c.ContainerStartFunc(ctx, nameOrID)
	}
	return nil
}

// ContainerStop implements ContainerClient.
func (c *Client) ContainerStop(ctx context.Context, nameOrID string, timeout *int) error {
	c.recordCall("ContainerStop", nameOrID, timeout)
	if c.ContainerStopFunc != nil {
		return c.ContainerStopFunc(ctx, nameOrID, timeout)
	}
	return nil
}

// ContainerRemove implements ContainerClient.
func (c *Client) ContainerRemove(ctx context.Context, nameOrID string, force bool) error {
	c.recordCall("ContainerRemove", nameOrID, force)
	if c.ContainerRemoveFunc != nil {
		return c.ContainerRemoveFunc(ctx, nameOrID, force)
	}
	return nil
}

// NetworkCreate implements ContainerClient.
func (c *Client) NetworkCreate(ctx context.Context, cfg types.NetworkConfig) (string, error) {
	c.recordCall("NetworkCreate", cfg)
	if c.NetworkCreateFunc != nil {
		return c.NetworkCreateFunc(ctx, cfg)
	}
	return "mock-network-id", nil
}

// NetworkInspect implements ContainerClient.
func (c *Client) NetworkInspect(ctx context.Context, nameOrID string) (types.NetworkInfo, error) {
	c.recordCall("NetworkInspect", nameOrID)
	if c.NetworkInspectFunc != nil {
		return c.NetworkInspectFunc(ctx, nameOrID)
	}
	return types.NetworkInfo{}, types.ErrNetworkNotFound
}

// NetworkRemove implements ContainerClient.
func (c *Client) NetworkRemove(ctx context.Context, nameOrID string) error {
	c.recordCall("NetworkRemove", nameOrID)
	if c.NetworkRemoveFunc != nil {
		return c.NetworkRemoveFunc(ctx, nameOrID)
	}
	return nil
}

// ContainerLogs implements ContainerClient.
func (c *Client) ContainerLogs(
	ctx context.Context,
	nameOrID string,
	follow bool,
	tail string,
) (io.ReadCloser, error) {
	c.recordCall("ContainerLogs", nameOrID, follow, tail)
	if c.ContainerLogsFunc != nil {
		return c.ContainerLogsFunc(ctx, nameOrID, follow, tail)
	}
	// Return empty reader by default
	return io.NopCloser(&emptyReader{}), nil
}

// ContainerWait implements ContainerClient.
func (c *Client) ContainerWait(ctx context.Context, nameOrID string) (int, error) {
	c.recordCall("ContainerWait", nameOrID)
	if c.ContainerWaitFunc != nil {
		return c.ContainerWaitFunc(ctx, nameOrID)
	}
	return 0, nil
}

// emptyReader is an io.Reader that always returns EOF.
type emptyReader struct{}

func (emptyReader) Read([]byte) (int, error) {
	return 0, io.EOF
}

// Name implements ContainerClient.
func (c *Client) Name() string {
	return "Mock"
}

// Installation implements ContainerClient.
func (c *Client) Installation() types.RuntimeInstallation {
	if c.InstallationFunc != nil {
		return c.InstallationFunc()
	}
	return types.InstallationUnknown
}

// Close implements ContainerClient.
func (c *Client) Close() error {
	return nil
}

// Reset clears all recorded calls.
func (c *Client) Reset() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.Calls = nil
}
