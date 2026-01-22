// Package interfaces defines the core interfaces for studioctl components.
// All external dependencies are abstracted behind interfaces for testability.
package interfaces

import (
	"context"
	"io"
)

// Release represents a GitHub release.
type Release struct {
	Version    string
	TagName    string
	Assets     []ReleaseAsset
	Prerelease bool
}

// ReleaseAsset represents a downloadable asset from a release.
type ReleaseAsset struct {
	Name        string
	DownloadURL string
	Size        int64
}

// ReleaseClient provides access to GitHub releases for self-update.
type ReleaseClient interface {
	// GetLatestRelease returns the latest release, optionally including prereleases.
	GetLatestRelease(ctx context.Context, includePrerelease bool) (Release, error)

	// DownloadAsset downloads a release asset by name.
	DownloadAsset(ctx context.Context, release Release, assetName string) (io.ReadCloser, error)
}

// ServerManager manages the app-manager server lifecycle.
type ServerManager interface {
	// EnsureRunning starts the server if not running, returns when healthy.
	EnsureRunning(ctx context.Context) error

	// Stop gracefully stops the server.
	Stop(ctx context.Context) error

	// Health checks if the server is healthy.
	Health(ctx context.Context) error

	// IsRunning checks if the server process is running.
	IsRunning() bool
}

// LocaltestStatus represents the status of the localtest environment.
type LocaltestStatus struct {
	Ports        map[string]int
	Version      string
	Uptime       string
	HealthStatus string
	Containers   []ContainerInfo
	Running      bool
}

// ContainerInfo represents information about a running container.
type ContainerInfo struct {
	Name   string
	Image  string
	Status string
	Ports  []string
}

// LocaltestDetector detects and queries the localtest environment.
type LocaltestDetector interface {
	// IsRunning checks if localtest containers are running and healthy.
	IsRunning(ctx context.Context) (bool, error)

	// Status returns detailed status information.
	Status(ctx context.Context) (LocaltestStatus, error)
}

// ProcessRunner runs external processes.
type ProcessRunner interface {
	// Run executes a command and waits for completion.
	Run(ctx context.Context, name string, args ...string) error

	// RunWithOutput executes a command and returns its output.
	RunWithOutput(ctx context.Context, name string, args ...string) ([]byte, error)

	// Start starts a command and returns without waiting.
	Start(ctx context.Context, name string, args ...string) (Process, error)
}

// Process represents a running process.
type Process interface {
	// Wait waits for the process to exit.
	Wait() error

	// Kill terminates the process.
	Kill() error

	// PID returns the process ID.
	PID() int
}

// Env manages a development environment lifecycle.
type Env interface {
	// Up starts the environment.
	Up(ctx context.Context, opts EnvUpOptions) error

	// Down stops the environment.
	Down(ctx context.Context) error

	// Status returns the environment status.
	Status(ctx context.Context) (LocaltestStatus, error)

	// Logs streams environment logs.
	Logs(ctx context.Context, opts EnvLogsOptions) error
}

// EnvUpOptions configures environment startup.
type EnvUpOptions struct {
	Port        int
	Detach      bool
	Monitoring  bool
	OpenBrowser bool
}

// EnvLogsOptions configures log streaming.
type EnvLogsOptions struct {
	Component string
	Follow    bool
}
