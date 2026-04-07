// Package appmanager provides local control-plane integration with the app-manager host service.
package appmanager

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/networking"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	controlBaseURL = "http://app-manager"

	healthPath   = "/api/v1/healthz"
	statusPath   = "/api/v1/studioctl/status"
	shutdownPath = "/api/v1/studioctl/shutdown"

	appManagerUnixSocketEnv = "APP_MANAGER_UNIX_SOCKET_PATH"
	appManagerTunnelURLEnv  = "Tunnel__Url"
	appManagerUpstreamEnv   = "Tunnel__UpstreamUrl"

	appManagerStartTimeout = 10 * time.Second
	appManagerPollInterval = 100 * time.Millisecond
	appTunnelEndpointPath  = "/internal/tunnel/app"
	appManagerLogTailLines = 40
)

type startConfig struct {
	BinaryPath     string `json:"binaryPath"`
	WorkingDir     string `json:"workingDir"`
	UnixSocketPath string `json:"unixSocketPath,omitempty"`
	TunnelURL      string `json:"tunnelUrl"`
	UpstreamURL    string `json:"upstreamUrl"`
	InternalDev    bool   `json:"internalDev"`
}

type runtimeState struct {
	Start startConfig `json:"start"`
	PID   int         `json:"pid"`
}

// Status describes the current app-manager status.
type Status struct {
	AppManagerVersion string
	DotnetVersion     string
	Apps              []DiscoveredApp
	Tunnel            TunnelStatus
	ProcessID         int
	InternalDev       bool
}

// TunnelStatus describes the configured app tunnel.
type TunnelStatus struct {
	URL         string
	UpstreamURL string
	Enabled     bool
	Connected   bool
}

// DiscoveredApp describes one discovered app endpoint.
type DiscoveredApp struct {
	ProcessID   *int
	AppID       string
	BaseURL     string
	Source      string
	Description string
}

var (
	// ErrNotRunning is returned when app-manager is not reachable.
	ErrNotRunning = errors.New("app-manager is not running")
	// ErrBinaryMissing is returned when the app-manager binary is not installed.
	ErrBinaryMissing            = errors.New("app-manager binary not found")
	errUnexpectedHealthStatus   = errors.New("unexpected app-manager health status")
	errUnexpectedStatusStatus   = errors.New("unexpected app-manager status response")
	errUnexpectedShutdownStatus = errors.New("unexpected app-manager shutdown response")
	errAppManagerStartTimedOut  = errors.New("app-manager start timed out")
	errInvalidPIDFile           = errors.New("pid file does not contain a positive pid")
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
func (c *Client) Status(ctx context.Context) (*Status, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, controlBaseURL+statusPath, nil)
	if err != nil {
		return nil, fmt.Errorf("build status request: %w", err)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, classifyClientError(err)
	}
	defer closeResponseBody(resp)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: %s", errUnexpectedStatusStatus, resp.Status)
	}

	var status struct {
		AppManagerVersion string `json:"appManagerVersion"`
		DotnetVersion     string `json:"dotnetVersion"`
		Apps              []struct {
			ProcessID   *int   `json:"processId"`
			AppID       string `json:"appId"`
			BaseURL     string `json:"baseUrl"`
			Source      string `json:"source"`
			Description string `json:"description"`
		} `json:"apps"`
		Tunnel struct {
			URL         string `json:"url"`
			UpstreamURL string `json:"upstreamUrl"`
			Enabled     bool   `json:"enabled"`
			Connected   bool   `json:"connected"`
		} `json:"tunnel"`
		ProcessID   int  `json:"processId"`
		InternalDev bool `json:"internalDev"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
		return nil, fmt.Errorf("decode status response: %w", err)
	}

	result := &Status{
		ProcessID:         status.ProcessID,
		AppManagerVersion: status.AppManagerVersion,
		DotnetVersion:     status.DotnetVersion,
		InternalDev:       status.InternalDev,
		Tunnel: TunnelStatus{
			Enabled:     status.Tunnel.Enabled,
			Connected:   status.Tunnel.Connected,
			URL:         status.Tunnel.URL,
			UpstreamURL: status.Tunnel.UpstreamURL,
		},
		Apps: make([]DiscoveredApp, 0, len(status.Apps)),
	}
	for _, app := range status.Apps {
		result.Apps = append(result.Apps, DiscoveredApp{
			AppID:       app.AppID,
			BaseURL:     app.BaseURL,
			Source:      app.Source,
			ProcessID:   app.ProcessID,
			Description: app.Description,
		})
	}

	return result, nil
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

// EnsureStarted starts or reconciles app-manager for the provided localtest runtime settings.
func EnsureStarted(ctx context.Context, cfg *config.Config, loadBalancerPort, localAppURL string) error {
	desired := buildStartConfig(cfg, loadBalancerPort, localAppURL)
	client := NewClient(cfg)

	status, err := client.Status(ctx)
	switch {
	case err == nil:
		if liveConfig(cfg, status) == desired {
			return writeAppManagerState(cfg, runtimeState{PID: status.ProcessID, Start: desired})
		}
		return restartManagedProcess(ctx, cfg, client, status.ProcessID, desired)
	case !errors.Is(err, ErrNotRunning):
		return fmt.Errorf("get app-manager status: %w", err)
	}

	state, ok, err := readAppManagerState(cfg)
	if err != nil {
		return fmt.Errorf("read app-manager pid file: %w", err)
	}

	if ok {
		running, err := isProcessRunning(state.PID)
		if err != nil {
			return fmt.Errorf("check persisted app-manager pid %d: %w", state.PID, err)
		}

		if !running {
			if err := removeAppManagerState(cfg); err != nil {
				return fmt.Errorf("remove stale app-manager pid file: %w", err)
			}
			return startProcess(ctx, cfg, desired)
		}

		if state.Start == desired {
			status, err := waitForHealthy(ctx, cfg, client)
			if err == nil {
				return writeAppManagerState(cfg, runtimeState{PID: status.ProcessID, Start: desired})
			}
		}

		if err := killProcess(state.PID); err != nil {
			return fmt.Errorf("stop persisted app-manager pid %d: %w", state.PID, err)
		}
		if err := removeAppManagerState(cfg); err != nil {
			return fmt.Errorf("remove stale app-manager pid file: %w", err)
		}
	}

	return startProcess(ctx, cfg, desired)
}

// TunnelURL returns the app-manager tunnel URL for a localtest host port.
func TunnelURL(port string) string {
	return "ws://127.0.0.1:" + port + appTunnelEndpointPath
}

func restartManagedProcess(
	ctx context.Context,
	cfg *config.Config,
	client *Client,
	pid int,
	desired startConfig,
) error {
	if err := client.Shutdown(ctx); err != nil {
		return fmt.Errorf("shutdown app-manager for restart: %w", err)
	}

	if !waitForShutdown(ctx, client, cfg) {
		if err := killProcess(pid); err != nil {
			return fmt.Errorf("kill app-manager after shutdown timeout: %w", err)
		}
		if err := removeAppManagerState(cfg); err != nil {
			return fmt.Errorf("remove stale app-manager pid file: %w", err)
		}
	}

	return startProcess(ctx, cfg, desired)
}

func startProcess(ctx context.Context, cfg *config.Config, startConfig startConfig) error {
	if _, err := os.Stat(cfg.AppManagerBinaryPath()); err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("%w: %s", ErrBinaryMissing, cfg.AppManagerBinaryPath())
		}
		return fmt.Errorf("stat app-manager binary: %w", err)
	}

	if err := removeAppManagerState(cfg); err != nil {
		return fmt.Errorf("remove stale app-manager pid file: %w", err)
	}

	//nolint:gosec // G204: binary path comes from resolved studioctl config.
	cmd := exec.CommandContext(context.WithoutCancel(ctx), cfg.AppManagerBinaryPath())
	cmd.Dir = startConfig.WorkingDir
	cmd.Env = append(
		os.Environ(),
		appManagerUnixSocketEnv+"="+startConfig.UnixSocketPath,
	)
	if startConfig.TunnelURL != "" {
		cmd.Env = append(cmd.Env, appManagerTunnelURLEnv+"="+startConfig.TunnelURL)
	}
	cmd.Env = append(cmd.Env, appManagerUpstreamEnv+"="+startConfig.UpstreamURL)
	devNull, err := os.OpenFile(os.DevNull, os.O_RDWR, 0)
	if err != nil {
		return fmt.Errorf("open null device: %w", err)
	}
	defer ignoreError(devNull.Close())

	cmd.Stdin = devNull
	cmd.Stdout = devNull
	cmd.Stderr = devNull
	applyProcessAttrs(cmd)

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start app-manager: %w", err)
	}
	if err := writeAppManagerState(cfg, runtimeState{PID: cmd.Process.Pid, Start: startConfig}); err != nil {
		ignoreError(cmd.Process.Kill())
		return fmt.Errorf("write app-manager pid file: %w", err)
	}
	if err := cmd.Process.Release(); err != nil {
		ignoreError(removeAppManagerState(cfg))
		return fmt.Errorf("release app-manager process handle: %w", err)
	}

	client := NewClient(cfg)
	status, err := waitForHealthy(ctx, cfg, client)
	if err == nil {
		return writeAppManagerState(cfg, runtimeState{PID: status.ProcessID, Start: startConfig})
	}

	ignoreError(killProcess(cmd.Process.Pid))
	ignoreError(removeAppManagerState(cfg))
	return err
}

func waitForHealthy(ctx context.Context, cfg *config.Config, client *Client) (*Status, error) {
	deadline := time.Now().Add(appManagerStartTimeout)
	var lastErr error
	for time.Now().Before(deadline) {
		status, err := client.Status(ctx)
		if err == nil {
			return status, nil
		}

		lastErr = err
		time.Sleep(appManagerPollInterval)
	}

	if lastErr != nil {
		return nil, fmt.Errorf(
			"%w after %s: %w%s",
			errAppManagerStartTimedOut,
			appManagerStartTimeout,
			lastErr,
			readAppManagerLogTail(cfg.AppManagerLogPath()),
		)
	}

	return nil, fmt.Errorf(
		"%w: %s%s",
		errAppManagerStartTimedOut,
		appManagerStartTimeout,
		readAppManagerLogTail(cfg.AppManagerLogPath()),
	)
}

func waitForShutdown(ctx context.Context, client *Client, cfg *config.Config) bool {
	deadline := time.Now().Add(appManagerStartTimeout)
	for time.Now().Before(deadline) {
		if err := client.Health(ctx); errors.Is(err, ErrNotRunning) {
			ignoreError(removeAppManagerState(cfg))
			return true
		}
		time.Sleep(appManagerPollInterval)
	}

	return false
}

func buildStartConfig(cfg *config.Config, loadBalancerPort, localAppURL string) startConfig {
	return startConfig{
		BinaryPath:     cfg.AppManagerBinaryPath(),
		WorkingDir:     cfg.Home,
		UnixSocketPath: cfg.AppManagerSocketPath(),
		TunnelURL:      TunnelURL(loadBalancerPort),
		UpstreamURL:    rewriteHostLocalAppURL(localAppURL),
		InternalDev:    isTruthyEnv(os.Getenv(config.EnvInternalDevMode)),
	}
}

func liveConfig(cfg *config.Config, status *Status) startConfig {
	return startConfig{
		BinaryPath:     cfg.AppManagerBinaryPath(),
		WorkingDir:     cfg.Home,
		UnixSocketPath: cfg.AppManagerSocketPath(),
		TunnelURL:      status.Tunnel.URL,
		UpstreamURL:    status.Tunnel.UpstreamURL,
		InternalDev:    status.InternalDev,
	}
}

func readAppManagerState(cfg *config.Config) (runtimeState, bool, error) {
	data, err := os.ReadFile(cfg.AppManagerPIDPath())
	if err != nil {
		if os.IsNotExist(err) {
			return zeroRuntimeState(), false, nil
		}
		return zeroRuntimeState(), false, fmt.Errorf("read pid file: %w", err)
	}

	var state runtimeState
	if err := json.Unmarshal(data, &state); err != nil {
		return zeroRuntimeState(), false, fmt.Errorf("decode pid file: %w", err)
	}
	if state.PID <= 0 {
		return zeroRuntimeState(), false, errInvalidPIDFile
	}

	return state, true, nil
}

func writeAppManagerState(cfg *config.Config, state runtimeState) error {
	if err := os.MkdirAll(filepath.Dir(cfg.AppManagerPIDPath()), osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create pid file parent directory: %w", err)
	}

	data, err := json.Marshal(state)
	if err != nil {
		return fmt.Errorf("encode pid file: %w", err)
	}
	if err := os.WriteFile(cfg.AppManagerPIDPath(), append(data, '\n'), osutil.FilePermDefault); err != nil {
		return fmt.Errorf("write pid file: %w", err)
	}

	return nil
}

func removeAppManagerState(cfg *config.Config) error {
	if err := os.Remove(cfg.AppManagerPIDPath()); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("remove pid file: %w", err)
	}

	return nil
}

func killProcess(pid int) error {
	process, err := os.FindProcess(pid)
	if err != nil {
		return fmt.Errorf("find process: %w", err)
	}
	if err := process.Kill(); err != nil && !errors.Is(err, os.ErrProcessDone) {
		return fmt.Errorf("kill process: %w", err)
	}

	return nil
}

func classifyClientError(err error) error {
	var opErr *net.OpError
	if errors.As(err, &opErr) {
		return fmt.Errorf("%w: %s", ErrNotRunning, err.Error())
	}
	var pathErr *os.PathError
	if errors.As(err, &pathErr) && errors.Is(pathErr.Err, os.ErrNotExist) {
		return fmt.Errorf("%w: %s", ErrNotRunning, err.Error())
	}
	return err
}

func closeResponseBody(resp *http.Response) {
	ignoreError(resp.Body.Close())
}

func ignoreError(error) {
}

func rewriteHostLocalAppURL(localAppURL string) string {
	parsed, err := url.Parse(localAppURL)
	if err != nil {
		return localAppURL
	}

	host := strings.ToLower(parsed.Hostname())
	switch host {
	case networking.LocalDomain, "host.docker.internal", "host.containers.internal":
		parsed.Host = rewriteHostPort("127.0.0.1", parsed.Port())
	case "":
		parsed.Host = rewriteHostPort("127.0.0.1", parsed.Port())
	}

	return parsed.String()
}

func rewriteHostPort(host, port string) string {
	if port == "" {
		return host
	}
	return net.JoinHostPort(host, port)
}

func readAppManagerLogTail(path string) string {
	//nolint:gosec // G304: log path is derived from resolved STUDIOCTL_HOME and never user-supplied per request.
	file, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer ignoreError(file.Close())

	lines := make([]string, 0, appManagerLogTailLines)
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		if len(lines) == appManagerLogTailLines {
			copy(lines, lines[1:])
			lines[appManagerLogTailLines-1] = scanner.Text()
			continue
		}

		lines = append(lines, scanner.Text())
	}

	if len(lines) == 0 {
		return ""
	}

	return "\napp-manager log tail:\n" + strings.Join(lines, "\n")
}

func isTruthyEnv(value string) bool {
	return value == "1" || strings.EqualFold(value, "true")
}

func zeroRuntimeState() runtimeState {
	return runtimeState{
		Start: startConfig{
			BinaryPath:     "",
			WorkingDir:     "",
			UnixSocketPath: "",
			TunnelURL:      "",
			UpstreamURL:    "",
			InternalDev:    false,
		},
		PID: 0,
	}
}
