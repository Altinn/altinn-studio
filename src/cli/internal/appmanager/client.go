// Package appmanager provides local control-plane integration with the app-manager host service.
package appmanager

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"time"

	"altinn.studio/studioctl/internal/config"
)

const (
	controlBaseURL = "http://app-manager"

	healthPath   = "/api/v1/healthz"
	statusPath   = "/api/v1/studioctl/status"
	shutdownPath = "/api/v1/studioctl/shutdown"

	appManagerPIDEnv        = "APP_MANAGER_PID_PATH"
	appManagerUnixSocketEnv = "APP_MANAGER_UNIX_SOCKET_PATH"
	appManagerPipeNameEnv   = "APP_MANAGER_NAMED_PIPE_NAME"

	appManagerStartTimeout = 5 * time.Second
	appManagerPollInterval = 100 * time.Millisecond
)

var (
	// ErrNotRunning is returned when app-manager is not reachable.
	ErrNotRunning = errors.New("app-manager is not running")
	// ErrBinaryMissing is returned when the app-manager binary is not installed.
	ErrBinaryMissing            = errors.New("app-manager binary not found")
	errUnexpectedHealthStatus   = errors.New("unexpected app-manager health status")
	errUnexpectedStatusStatus   = errors.New("unexpected app-manager status response")
	errUnexpectedShutdownStatus = errors.New("unexpected app-manager shutdown response")
	errAppManagerStartTimedOut  = errors.New("app-manager start timed out")
)

// Client talks to the local app-manager control plane.
type Client struct {
	http *http.Client
}

// NewClient constructs an app-manager control-plane client.
func NewClient(cfg *config.Config) *Client {
	return &Client{
		http: &http.Client{
			Transport: transportForConfig(cfg),
			Timeout:   2 * time.Second,
		},
	}
}

// Health checks whether app-manager is reachable.
func (c *Client) Health(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, controlBaseURL+healthPath, nil)
	if err != nil {
		return fmt.Errorf("build health request: %w", err)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return classifyClientError(err)
	}
	defer closeResponseBody(resp)

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("%w: %s", errUnexpectedHealthStatus, resp.Status)
	}

	return nil
}

// Status returns the current app-manager status fields.
func (c *Client) Status(ctx context.Context) (processID int, appManagerVersion, dotnetVersion string, err error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, controlBaseURL+statusPath, nil)
	if err != nil {
		return 0, "", "", fmt.Errorf("build status request: %w", err)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return 0, "", "", classifyClientError(err)
	}
	defer closeResponseBody(resp)

	if resp.StatusCode != http.StatusOK {
		return 0, "", "", fmt.Errorf("%w: %s", errUnexpectedStatusStatus, resp.Status)
	}

	var status struct {
		AppManagerVersion string `json:"appManagerVersion"`
		DotnetVersion     string `json:"dotnetVersion"`
		ProcessID         int    `json:"processId"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
		return 0, "", "", fmt.Errorf("decode status response: %w", err)
	}

	return status.ProcessID, status.AppManagerVersion, status.DotnetVersion, nil
}

// Shutdown asks app-manager to stop itself.
func (c *Client) Shutdown(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, controlBaseURL+shutdownPath, nil)
	if err != nil {
		return fmt.Errorf("build shutdown request: %w", err)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return classifyClientError(err)
	}
	defer closeResponseBody(resp)

	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("%w: %s", errUnexpectedShutdownStatus, resp.Status)
	}

	return nil
}

// Start launches app-manager in the background and waits for readiness.
func Start(ctx context.Context, cfg *config.Config) error {
	if _, err := os.Stat(cfg.AppManagerBinaryPath()); err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("%w: %s", ErrBinaryMissing, cfg.AppManagerBinaryPath())
		}
		return fmt.Errorf("stat app-manager binary: %w", err)
	}

	logFile, err := os.OpenFile(
		cfg.AppManagerLogPath(),
		os.O_CREATE|os.O_WRONLY|os.O_APPEND,
		osutilFilePermDefault,
	)
	if err != nil {
		return fmt.Errorf("open app-manager log file: %w", err)
	}
	defer closeFile(logFile)

	//nolint:gosec // G204: binary path comes from resolved studioctl config.
	cmd := exec.CommandContext(context.WithoutCancel(ctx), cfg.AppManagerBinaryPath())
	cmd.Env = append(
		os.Environ(),
		appManagerPIDEnv+"="+cfg.AppManagerPIDPath(),
		appManagerUnixSocketEnv+"="+cfg.AppManagerSocketPath(),
		appManagerPipeNameEnv+"="+cfg.AppManagerNamedPipeName(),
	)
	cmd.Stdin = nil
	cmd.Stdout = logFile
	cmd.Stderr = logFile
	applyProcessAttrs(cmd)

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start app-manager: %w", err)
	}
	if err := cmd.Process.Release(); err != nil {
		return fmt.Errorf("release app-manager process handle: %w", err)
	}

	client := NewClient(cfg)
	deadline := time.Now().Add(appManagerStartTimeout)
	for time.Now().Before(deadline) {
		if err := client.Health(ctx); err == nil {
			return nil
		}
		time.Sleep(appManagerPollInterval)
	}

	return fmt.Errorf("%w: %s", errAppManagerStartTimedOut, appManagerStartTimeout)
}

func classifyClientError(err error) error {
	var opErr *net.OpError
	if errors.As(err, &opErr) {
		return fmt.Errorf("%w: %s", ErrNotRunning, err.Error())
	}
	return err
}

func closeResponseBody(resp *http.Response) {
	ignoreError(resp.Body.Close())
}

func closeFile(file *os.File) {
	ignoreError(file.Close())
}

func ignoreError(error) {
}

const osutilFilePermDefault = 0o644
