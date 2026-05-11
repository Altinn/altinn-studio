// Package studioctlserver provides local control-plane integration with the studioctl-server host service.
package studioctlserver

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/httpclient"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	controlBaseURL = "http://studioctl-server"

	healthPath   = "/api/v1/healthz"
	statusPath   = "/api/v1/studioctl/status"
	registerPath = "/api/v1/studioctl/apps"
	upgradePath  = "/api/v1/studioctl/apps/upgrades"
	shutdownPath = "/api/v1/studioctl/shutdown"

	studioctlServerUnixSocketEnv   = "STUDIOCTL_SERVER_UNIX_SOCKET_PATH"
	studioctlServerTunnelURLEnv    = "Tunnel__Url"
	studioctlServerLocaltestURLEnv = "Localtest__Url"
	studioctlServerStudioctlEnv    = "Studioctl__Path"

	studioctlServerRequestTimeout        = 2 * time.Second
	studioctlServerStartTimeout          = 10 * time.Second
	studioctlServerRegisterTimeoutMargin = 2 * time.Second
	studioctlServerUpgradeTimeout        = 30 * time.Second
	studioctlServerShutdownWait          = 3 * time.Second
	studioctlServerPollInterval          = 100 * time.Millisecond
	appTunnelEndpointPath                = "/internal/tunnel/app"
	studioctlServerLogTailLines          = 40
	studioctlServerLogSuffix             = ".log"
)

type startConfig struct {
	BinaryPath                  string `json:"binaryPath"`
	WorkingDir                  string `json:"workingDir"`
	UnixSocketPath              string `json:"unixSocketPath,omitempty"`
	TunnelURL                   string `json:"tunnelUrl"`
	LocaltestURL                string `json:"localtestUrl"`
	StudioctlPath               string `json:"studioctlPath"`
	BoundTopologyBaseConfigPath string `json:"boundTopologyBaseConfigPath,omitempty"`
	BoundTopologyConfigPath     string `json:"boundTopologyConfigPath,omitempty"`
}

type runtimeState struct {
	Start startConfig `json:"start"`
	PID   int         `json:"pid"`
}

// Status describes the current studioctl-server status.
type Status struct {
	StudioctlServerVersion      string          `json:"studioctlServerVersion"`
	DotnetVersion               string          `json:"dotnetVersion"`
	StudioctlPath               string          `json:"studioctlPath"`
	LocaltestURL                string          `json:"localtestUrl"`
	BoundTopologyBaseConfigPath string          `json:"boundTopologyBaseConfigPath"`
	BoundTopologyConfigPath     string          `json:"boundTopologyConfigPath"`
	Tunnel                      TunnelStatus    `json:"tunnel"`
	Apps                        []DiscoveredApp `json:"apps"`
	ProcessID                   int             `json:"processId"`
	InternalDev                 bool            `json:"internalDev"`
}

// TunnelStatus describes the configured app tunnel.
type TunnelStatus struct {
	URL       string `json:"url"`
	Enabled   bool   `json:"enabled"`
	Connected bool   `json:"connected"`
}

// DiscoveredApp describes one discovered app endpoint.
type DiscoveredApp struct {
	ProcessID   *int   `json:"processId"`
	HostPort    *int   `json:"hostPort,omitempty"`
	AppID       string `json:"appId"`
	BaseURL     string `json:"baseUrl"`
	Source      string `json:"source"`
	Description string `json:"description"`
	Name        string `json:"name,omitempty"`
	ContainerID string `json:"containerId,omitempty"`
}

// LogFile describes one studioctl-server log file.
type LogFile struct {
	ModTime time.Time
	Path    string
	Size    int64
}

var (
	// ErrNotRunning is returned when studioctl-server is not reachable.
	ErrNotRunning = errors.New("studioctl-server is not running")
	// ErrBinaryMissing is returned when the studioctl-server binary is not installed.
	ErrBinaryMissing                   = errors.New("studioctl-server binary not found")
	errUnexpectedHealthStatus          = errors.New("unexpected studioctl-server health status")
	errUnexpectedRegisterStatus        = errors.New("unexpected studioctl-server register response")
	errUnexpectedUnregisterStatus      = errors.New("unexpected studioctl-server unregister response")
	errUnexpectedStatusStatus          = errors.New("unexpected studioctl-server status response")
	errUnexpectedUpgradeStatus         = errors.New("unexpected studioctl-server upgrade response")
	errUnexpectedShutdownStatus        = errors.New("unexpected studioctl-server shutdown response")
	errStudioctlServerStartTimedOut    = errors.New("studioctl-server start timed out")
	errInvalidPIDFile                  = errors.New("pid file does not contain a positive pid")
	errStudioctlServerSocketDir        = errors.New("studioctl-server socket path is a directory")
	errStudioctlServerSocketInUse      = errors.New("studioctl-server socket is already in use")
	errStudioctlServerForceStopTimeout = errors.New("studioctl-server did not stop after kill")
	// ErrAppEndpointNotFound is returned when studioctl-server cannot find a matching app endpoint.
	ErrAppEndpointNotFound = errors.New("matching app endpoint not found")
)

// Client talks to the local studioctl-server control plane.
type Client struct {
	http *http.Client
	cfg  *config.Config
}

// AppRegistration describes an app endpoint registered explicitly by studioctl.
type AppRegistration struct {
	AppID          string `json:"appId"`
	ContainerID    string `json:"containerId,omitempty"`
	HostPort       int    `json:"hostPort,omitempty"`
	ProcessID      int    `json:"processId,omitempty"`
	TimeoutSeconds int    `json:"timeoutSeconds"`
}

// AppUpgrade describes an app upgrade request for studioctl-server.
type AppUpgrade struct {
	ProjectFolder            string `json:"projectFolder"`
	StudioRoot               string `json:"studioRoot,omitempty"`
	Kind                     string `json:"kind"`
	ConvertPackageReferences bool   `json:"convertPackageReferences,omitempty"`
}

// AppUpgradeResult describes a studioctl-server upgrade result.
type AppUpgradeResult struct {
	Message  string `json:"message"`
	Output   string `json:"output"`
	Error    string `json:"error"`
	ExitCode int    `json:"exitCode"`
}

// NewClient constructs a studioctl-server control-plane client.
func NewClient(cfg *config.Config) *Client {
	return &Client{
		cfg: cfg,
		http: &http.Client{
			Transport: transportForConfig(cfg),
		},
	}
}

func appRegistrationTimeout(registration AppRegistration) time.Duration {
	if registration.TimeoutSeconds <= 0 {
		return studioctlServerRegisterTimeoutMargin
	}
	return time.Duration(registration.TimeoutSeconds)*time.Second + studioctlServerRegisterTimeoutMargin
}

// Shutdown stops studioctl-server and returns a completion channel that resolves when shutdown is fully complete.
func Shutdown(ctx context.Context, cfg *config.Config) (<-chan error, error) {
	lock, err := osutil.AcquireFileLock(ctx, cfg.StudioctlServerLockPath())
	if err != nil {
		return nil, fmt.Errorf("lock studioctl-server lifecycle: %w", err)
	}

	client := NewClient(cfg)
	pid, err := currentManagedPID(ctx, client, cfg)
	if err != nil {
		return nil, errors.Join(err, closeStudioctlServerLifecycleLock(lock))
	}

	if err := shutdownError(client.shutdown(ctx), pid); err != nil {
		return nil, errors.Join(err, closeStudioctlServerLifecycleLock(lock))
	}

	done := make(chan error, 1)
	go func() {
		defer close(done)
		done <- errors.Join(waitForManagedShutdown(ctx, cfg, client, pid), closeStudioctlServerLifecycleLock(lock))
	}()

	return done, nil
}

func closeStudioctlServerLifecycleLock(lock *osutil.FileLock) error {
	if err := lock.Close(); err != nil {
		return fmt.Errorf("close studioctl-server lifecycle lock: %w", err)
	}
	return nil
}

func shutdownError(err error, pid int) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, ErrNotRunning) {
		if pid <= 0 {
			return ErrNotRunning
		}
		return nil
	}
	if pid <= 0 {
		return fmt.Errorf("shutdown studioctl-server: %w", err)
	}
	return nil
}

// Health checks whether studioctl-server is reachable.
func (c *Client) Health(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, studioctlServerRequestTimeout)
	defer cancel()

	req, err := c.newRequest(ctx, http.MethodGet, healthPath, nil)
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

// Status returns the current studioctl-server status fields.
func (c *Client) Status(ctx context.Context) (*Status, error) {
	ctx, cancel := context.WithTimeout(ctx, studioctlServerRequestTimeout)
	defer cancel()

	req, err := c.newRequest(ctx, http.MethodGet, statusPath, nil)
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
		StudioctlServerVersion      string `json:"studioctlServerVersion"`
		DotnetVersion               string `json:"dotnetVersion"`
		StudioctlPath               string `json:"studioctlPath"`
		LocaltestURL                string `json:"localtestUrl"`
		BoundTopologyBaseConfigPath string `json:"boundTopologyBaseConfigPath"`
		BoundTopologyConfigPath     string `json:"boundTopologyConfigPath"`
		Tunnel                      struct {
			URL       string `json:"url"`
			Enabled   bool   `json:"enabled"`
			Connected bool   `json:"connected"`
		} `json:"tunnel"`
		Apps []struct {
			ProcessID   *int   `json:"processId"`
			HostPort    *int   `json:"hostPort"`
			AppID       string `json:"appId"`
			BaseURL     string `json:"baseUrl"`
			Source      string `json:"source"`
			Description string `json:"description"`
			Name        string `json:"name"`
			ContainerID string `json:"containerId"`
		} `json:"apps"`
		ProcessID   int  `json:"processId"`
		InternalDev bool `json:"internalDev"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
		return nil, fmt.Errorf("decode status response: %w", err)
	}

	result := &Status{
		ProcessID:                   status.ProcessID,
		StudioctlServerVersion:      status.StudioctlServerVersion,
		DotnetVersion:               status.DotnetVersion,
		StudioctlPath:               status.StudioctlPath,
		LocaltestURL:                status.LocaltestURL,
		BoundTopologyBaseConfigPath: status.BoundTopologyBaseConfigPath,
		BoundTopologyConfigPath:     status.BoundTopologyConfigPath,
		InternalDev:                 status.InternalDev,
		Tunnel: TunnelStatus{
			Enabled:   status.Tunnel.Enabled,
			Connected: status.Tunnel.Connected,
			URL:       status.Tunnel.URL,
		},
		Apps: make([]DiscoveredApp, 0, len(status.Apps)),
	}
	for _, app := range status.Apps {
		result.Apps = append(result.Apps, DiscoveredApp{
			AppID:       app.AppID,
			BaseURL:     app.BaseURL,
			Source:      app.Source,
			ProcessID:   app.ProcessID,
			HostPort:    app.HostPort,
			Description: app.Description,
			Name:        app.Name,
			ContainerID: app.ContainerID,
		})
	}

	return result, nil
}

// RegisterApp registers an app endpoint with studioctl-server and returns the resolved base URL.
func (c *Client) RegisterApp(ctx context.Context, registration AppRegistration) (string, error) {
	body, err := json.Marshal(registration)
	if err != nil {
		return "", fmt.Errorf("encode app registration: %w", err)
	}

	req, err := c.newRequest(
		ctx,
		http.MethodPost,
		registerPath,
		bytes.NewReader(body),
	)
	if err != nil {
		return "", fmt.Errorf("build register app request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{
		Transport: transportForConfig(c.cfg),
		Timeout:   appRegistrationTimeout(registration),
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", classifyClientError(err)
	}
	defer closeResponseBody(resp)

	if resp.StatusCode == http.StatusNotFound {
		return "", ErrAppEndpointNotFound
	}
	if resp.StatusCode != http.StatusAccepted {
		return "", fmt.Errorf("%w: %s", errUnexpectedRegisterStatus, resp.Status)
	}

	var result struct {
		BaseURL string `json:"baseUrl"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decode app registration response: %w", err)
	}
	if result.BaseURL == "" {
		return "", fmt.Errorf("%w: missing baseUrl", errUnexpectedRegisterStatus)
	}

	return result.BaseURL, nil
}

// UnregisterApp notifies studioctl-server that studioctl stopped an app.
func (c *Client) UnregisterApp(ctx context.Context, appID string) error {
	ctx, cancel := context.WithTimeout(ctx, studioctlServerRequestTimeout)
	defer cancel()

	req, err := c.newRequest(
		ctx,
		http.MethodDelete,
		registerPath+"?appId="+url.QueryEscape(appID),
		nil,
	)
	if err != nil {
		return fmt.Errorf("build unregister app request: %w", err)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return classifyClientError(err)
	}
	defer closeResponseBody(resp)

	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("%w: %s", errUnexpectedUnregisterStatus, resp.Status)
	}

	return nil
}

// UpgradeApp runs an app upgrade through studioctl-server.
func (c *Client) UpgradeApp(ctx context.Context, upgrade AppUpgrade) (AppUpgradeResult, error) {
	body, err := json.Marshal(upgrade)
	if err != nil {
		return AppUpgradeResult{}, fmt.Errorf("encode app upgrade: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, studioctlServerUpgradeTimeout)
	defer cancel()

	req, err := c.newRequest(
		ctx,
		http.MethodPost,
		upgradePath,
		bytes.NewReader(body),
	)
	if err != nil {
		return AppUpgradeResult{}, fmt.Errorf("build app upgrade request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return AppUpgradeResult{}, classifyClientError(err)
	}
	defer closeResponseBody(resp)

	if resp.StatusCode != http.StatusOK {
		var result AppUpgradeResult
		if err := json.NewDecoder(resp.Body).Decode(&result); err == nil && result.Message != "" {
			return AppUpgradeResult{}, fmt.Errorf("%w: %s: %s", errUnexpectedUpgradeStatus, resp.Status, result.Message)
		}
		return AppUpgradeResult{}, fmt.Errorf("%w: %s", errUnexpectedUpgradeStatus, resp.Status)
	}

	var result AppUpgradeResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return AppUpgradeResult{}, fmt.Errorf("decode app upgrade response: %w", err)
	}

	return result, nil
}

func (c *Client) newRequest(
	ctx context.Context,
	method,
	path string,
	body io.Reader,
) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, method, controlBaseURL+path, body)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpclient.SetUserAgent(req, c.cfg.Version)
	return req, nil
}

// shutdown asks studioctl-server to stop itself.
func (c *Client) shutdown(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, studioctlServerRequestTimeout)
	defer cancel()

	req, err := c.newRequest(ctx, http.MethodPost, shutdownPath, nil)
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

// EnsureStarted starts or reconciles studioctl-server for the provided localtest runtime settings.
func EnsureStarted(ctx context.Context, cfg *config.Config, loadBalancerPort string) error {
	return EnsureStartedWithStudioctlPath(ctx, cfg, loadBalancerPort, currentExecutablePath())
}

// EnsureStartedWithStudioctlPath starts or reconciles studioctl-server with an explicit studioctl path.
func EnsureStartedWithStudioctlPath(
	ctx context.Context,
	cfg *config.Config,
	loadBalancerPort,
	studioctlPath string,
) (err error) {
	lock, err := osutil.AcquireFileLock(ctx, cfg.StudioctlServerLockPath())
	if err != nil {
		return fmt.Errorf("lock studioctl-server lifecycle: %w", err)
	}
	defer func() {
		err = errors.Join(err, closeStudioctlServerLifecycleLock(lock))
	}()

	desired, err := buildStartConfig(cfg, loadBalancerPort, studioctlPath)
	if err != nil {
		return err
	}
	client := NewClient(cfg)

	status, err := client.Status(ctx)
	switch {
	case err == nil:
		if liveConfig(cfg, status) == desired {
			return writeStudioctlServerState(cfg, runtimeState{
				PID:   status.ProcessID,
				Start: desired,
			})
		}
		return restartManagedProcess(ctx, cfg, client, status.ProcessID, desired)
	case !errors.Is(err, ErrNotRunning):
		return fmt.Errorf("get studioctl-server status: %w", err)
	}

	return ensureStartedFromPersistedState(ctx, cfg, client, desired)
}

func ensureStartedFromPersistedState(
	ctx context.Context,
	cfg *config.Config,
	client *Client,
	desired startConfig,
) error {
	state, ok, err := readStudioctlServerState(cfg)
	if err != nil {
		return fmt.Errorf("read studioctl-server pid file: %w", err)
	}
	if !ok {
		return startProcess(ctx, cfg, desired)
	}

	return reconcilePersistedProcess(ctx, cfg, client, state, desired)
}

func reconcilePersistedProcess(
	ctx context.Context,
	cfg *config.Config,
	client *Client,
	state runtimeState,
	desired startConfig,
) error {
	running, err := osutil.ProcessRunning(state.PID)
	if err != nil {
		return fmt.Errorf("check persisted studioctl-server pid %d: %w", state.PID, err)
	}

	if !running {
		return restartFromPersistedState(ctx, cfg, client, desired, 0)
	}

	if state.Start == desired {
		status, waitErr := waitForHealthy(ctx, cfg, client, time.Now())
		if waitErr == nil {
			return writeStudioctlServerState(cfg, runtimeState{
				PID:   status.ProcessID,
				Start: desired,
			})
		}
	}

	return restartFromPersistedState(ctx, cfg, client, desired, state.PID)
}

func restartFromPersistedState(
	ctx context.Context,
	cfg *config.Config,
	client *Client,
	desired startConfig,
	pid int,
) error {
	if pid > 0 {
		if err := forceStopStudioctlServer(ctx, client, pid); err != nil {
			return fmt.Errorf("stop persisted studioctl-server pid %d: %w", pid, err)
		}
	}

	_, ok, err := readStudioctlServerState(cfg)
	if err != nil {
		return fmt.Errorf("read studioctl-server pid file: %w", err)
	}
	if ok {
		if err := removeStudioctlServerState(cfg); err != nil {
			return fmt.Errorf("remove stale studioctl-server pid file: %w", err)
		}
	}

	return startProcess(ctx, cfg, desired)
}

// TunnelURL returns the studioctl-server tunnel URL for a localtest host port.
func TunnelURL(port string) string {
	return "ws://127.0.0.1:" + port + appTunnelEndpointPath
}

// LocaltestURL returns the localtest HTTP URL for a host port.
func LocaltestURL(port string) string {
	return "http://127.0.0.1:" + port
}

func restartManagedProcess(
	ctx context.Context,
	cfg *config.Config,
	client *Client,
	pid int,
	desired startConfig,
) error {
	if err := client.shutdown(ctx); err != nil {
		return fmt.Errorf("shutdown studioctl-server for restart: %w", err)
	}

	if !waitForShutdown(ctx, client, cfg, pid) {
		if err := forceStopStudioctlServer(ctx, client, pid); err != nil {
			return fmt.Errorf("force stop studioctl-server after shutdown timeout: %w", err)
		}
	}
	if err := removeStudioctlServerState(cfg); err != nil {
		return fmt.Errorf("remove stale studioctl-server pid file: %w", err)
	}

	return startProcess(ctx, cfg, desired)
}

func startProcess(ctx context.Context, cfg *config.Config, startConfig startConfig) error {
	if _, err := os.Stat(cfg.StudioctlServerBinaryPath()); err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("%w: %s", ErrBinaryMissing, cfg.StudioctlServerBinaryPath())
		}
		return fmt.Errorf("stat studioctl-server binary: %w", err)
	}

	if err := removeStudioctlServerState(cfg); err != nil {
		return fmt.Errorf("remove stale studioctl-server pid file: %w", err)
	}
	if err := prepareStudioctlServerSocketForStart(ctx, cfg); err != nil {
		return err
	}
	startedAt := time.Now()

	//nolint:gosec // G204: binary path comes from resolved studioctl config.
	cmd := exec.CommandContext(context.WithoutCancel(ctx), cfg.StudioctlServerBinaryPath())
	cmd.Dir = startConfig.WorkingDir
	cmd.Env = studioctlServerEnvironment(startConfig)
	devNull, err := os.OpenFile(os.DevNull, os.O_RDWR, 0)
	if err != nil {
		return fmt.Errorf("open null device: %w", err)
	}
	defer ignoreError(devNull.Close())

	cmd.Stdin = devNull
	cmd.Stdout = devNull
	cmd.Stderr = devNull
	osutil.ApplyDetachedAttrs(cmd)

	err = cmd.Start()
	if err != nil {
		return fmt.Errorf("start studioctl-server: %w", err)
	}
	startedPID := cmd.Process.Pid
	err = writeStudioctlServerState(cfg, runtimeState{
		PID:   startedPID,
		Start: startConfig,
	})
	if err != nil {
		ignoreError(cmd.Process.Kill())
		return fmt.Errorf("write studioctl-server pid file: %w", err)
	}
	err = cmd.Process.Release()
	if err != nil {
		ignoreError(removeStudioctlServerState(cfg))
		return fmt.Errorf("release studioctl-server process handle: %w", err)
	}

	client := NewClient(cfg)
	status, err := waitForHealthy(ctx, cfg, client, startedAt)
	if err == nil {
		return writeStudioctlServerState(cfg, runtimeState{
			PID:   status.ProcessID,
			Start: startConfig,
		})
	}

	ignoreError(osutil.KillProcess(startedPID))
	ignoreError(removeStudioctlServerState(cfg))
	return err
}

func studioctlServerEnvironment(startConfig startConfig) []string {
	env := append(os.Environ(), studioctlServerUnixSocketEnv+"="+startConfig.UnixSocketPath)
	if startConfig.TunnelURL != "" {
		env = append(env, studioctlServerTunnelURLEnv+"="+startConfig.TunnelURL)
	}
	if startConfig.LocaltestURL != "" {
		env = append(env, studioctlServerLocaltestURLEnv+"="+startConfig.LocaltestURL)
	}
	if startConfig.StudioctlPath != "" {
		env = append(env, studioctlServerStudioctlEnv+"="+startConfig.StudioctlPath)
	}
	if startConfig.BoundTopologyBaseConfigPath != "" {
		env = append(
			env,
			envtopology.BoundTopologyOptionsBaseConfigPathEnv+"="+startConfig.BoundTopologyBaseConfigPath,
		)
	}
	if startConfig.BoundTopologyConfigPath != "" {
		env = append(
			env,
			envtopology.BoundTopologyOptionsConfigPathEnv+"="+startConfig.BoundTopologyConfigPath,
		)
	}
	return env
}

func prepareStudioctlServerSocketForStart(ctx context.Context, cfg *config.Config) error {
	if err := removeStaleStudioctlServerSocket(ctx, cfg); err != nil {
		return fmt.Errorf("prepare studioctl-server socket: %w", err)
	}
	return nil
}

func removeStaleStudioctlServerSocket(ctx context.Context, cfg *config.Config) error {
	socketPath := cfg.StudioctlServerSocketPath()
	info, err := os.Lstat(socketPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("stat studioctl-server socket: %w", err)
	}
	if info.IsDir() {
		return fmt.Errorf("%w: %s", errStudioctlServerSocketDir, socketPath)
	}

	client := NewClient(cfg)
	err = client.Health(ctx)
	switch {
	case err == nil:
		return fmt.Errorf("%w: %s", errStudioctlServerSocketInUse, socketPath)
	case !errors.Is(err, ErrNotRunning):
		return fmt.Errorf("probe existing studioctl-server socket: %w", err)
	}

	if err := os.Remove(socketPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("remove stale studioctl-server socket: %w", err)
	}
	return nil
}

func waitForHealthy(ctx context.Context, cfg *config.Config, client *Client, logSince time.Time) (*Status, error) {
	deadline := time.Now().Add(studioctlServerStartTimeout)
	var lastErr error
	for time.Now().Before(deadline) {
		status, err := client.Status(ctx)
		if err == nil {
			return status, nil
		}

		lastErr = err
		time.Sleep(studioctlServerPollInterval)
	}

	if lastErr != nil {
		return nil, fmt.Errorf(
			"%w after %s: %w%s",
			errStudioctlServerStartTimedOut,
			studioctlServerStartTimeout,
			lastErr,
			readLatestStudioctlServerLogTailSince(cfg.StudioctlServerLogDir(), logSince),
		)
	}

	return nil, fmt.Errorf(
		"%w: %s%s",
		errStudioctlServerStartTimedOut,
		studioctlServerStartTimeout,
		readLatestStudioctlServerLogTailSince(cfg.StudioctlServerLogDir(), logSince),
	)
}

func waitForShutdown(ctx context.Context, client *Client, cfg *config.Config, pid int) bool {
	deadline := time.Now().Add(studioctlServerStartTimeout)
	for time.Now().Before(deadline) {
		if studioctlServerStopped(ctx, client, pid) {
			ignoreError(removeStudioctlServerState(cfg))
			return true
		}
		time.Sleep(studioctlServerPollInterval)
	}

	return false
}

func forceStopStudioctlServer(ctx context.Context, client *Client, pid int) error {
	if err := osutil.KillProcess(pid); err != nil {
		return fmt.Errorf("kill studioctl-server pid %d: %w", pid, err)
	}

	deadline := time.Now().Add(studioctlServerShutdownWait)
	for time.Now().Before(deadline) {
		if studioctlServerStopped(ctx, client, pid) {
			return nil
		}
		time.Sleep(studioctlServerPollInterval)
	}

	return fmt.Errorf("%w: pid %d", errStudioctlServerForceStopTimeout, pid)
}

func studioctlServerStopped(ctx context.Context, client *Client, pid int) bool {
	healthStopped := errors.Is(client.Health(ctx), ErrNotRunning)
	processStopped, err := managedProcessStopped(pid)
	return err == nil && healthStopped && processStopped
}

func currentManagedPID(ctx context.Context, client *Client, cfg *config.Config) (int, error) {
	status, err := client.Status(ctx)
	if err == nil {
		return status.ProcessID, nil
	}
	if !errors.Is(err, ErrNotRunning) {
		state, ok, stateErr := readStudioctlServerState(cfg)
		if stateErr != nil {
			return 0, fmt.Errorf("read persisted studioctl-server state after status failure: %w", stateErr)
		}
		if ok {
			return state.PID, nil
		}
		return 0, fmt.Errorf("get studioctl-server status before shutdown: %w", err)
	}

	state, ok, err := readStudioctlServerState(cfg)
	if err != nil {
		return 0, fmt.Errorf("read persisted studioctl-server state: %w", err)
	}
	if !ok {
		return 0, nil
	}
	return state.PID, nil
}

func waitForManagedShutdown(ctx context.Context, cfg *config.Config, client *Client, pid int) error {
	deadline := time.Now().Add(studioctlServerShutdownWait)
	for time.Now().Before(deadline) {
		if studioctlServerStopped(ctx, client, pid) {
			if err := removeStudioctlServerState(cfg); err != nil {
				return fmt.Errorf("remove stale studioctl-server pid file: %w", err)
			}
			return removeStaleStudioctlServerSocket(ctx, cfg)
		}
		time.Sleep(studioctlServerPollInterval)
	}

	return stopPersistedProcess(ctx, cfg, client, pid)
}

func stopPersistedProcess(ctx context.Context, cfg *config.Config, client *Client, pid int) error {
	if pid <= 0 {
		return removePersistedStudioctlServerState(ctx, cfg)
	}

	running, err := osutil.ProcessRunning(pid)
	if err != nil {
		return fmt.Errorf("check studioctl-server pid %d: %w", pid, err)
	}
	if running {
		if err := forceStopStudioctlServer(ctx, client, pid); err != nil {
			return err
		}
	}

	return removePersistedStudioctlServerState(ctx, cfg)
}

func removePersistedStudioctlServerState(ctx context.Context, cfg *config.Config) error {
	if err := removeStudioctlServerState(cfg); err != nil {
		return fmt.Errorf("remove stale studioctl-server pid file: %w", err)
	}
	return removeStaleStudioctlServerSocket(ctx, cfg)
}

func managedProcessStopped(pid int) (bool, error) {
	if pid <= 0 {
		return true, nil
	}
	running, err := osutil.ProcessRunning(pid)
	if err != nil {
		return false, fmt.Errorf("check studioctl-server pid %d: %w", pid, err)
	}
	return !running, nil
}

func buildStartConfig(cfg *config.Config, loadBalancerPort, studioctlPath string) (startConfig, error) {
	boundTopologyBaseConfigPath, boundTopologyConfigPath, err := boundTopologyConfigPathsIfBaseExists(cfg)
	if err != nil {
		return startConfig{}, err
	}

	return startConfig{
		BinaryPath:                  cfg.StudioctlServerBinaryPath(),
		WorkingDir:                  cfg.Home,
		UnixSocketPath:              cfg.StudioctlServerSocketPath(),
		TunnelURL:                   TunnelURL(loadBalancerPort),
		LocaltestURL:                LocaltestURL(loadBalancerPort),
		StudioctlPath:               studioctlPath,
		BoundTopologyBaseConfigPath: boundTopologyBaseConfigPath,
		BoundTopologyConfigPath:     boundTopologyConfigPath,
	}, nil
}

func liveConfig(cfg *config.Config, status *Status) startConfig {
	return startConfig{
		BinaryPath:                  cfg.StudioctlServerBinaryPath(),
		WorkingDir:                  cfg.Home,
		UnixSocketPath:              cfg.StudioctlServerSocketPath(),
		TunnelURL:                   status.Tunnel.URL,
		LocaltestURL:                status.LocaltestURL,
		StudioctlPath:               status.StudioctlPath,
		BoundTopologyBaseConfigPath: status.BoundTopologyBaseConfigPath,
		BoundTopologyConfigPath:     status.BoundTopologyConfigPath,
	}
}

func boundTopologyConfigPathsIfBaseExists(cfg *config.Config) (string, string, error) {
	_, err := os.Stat(cfg.BoundTopologyBaseConfigPath())
	if err == nil {
		return cfg.BoundTopologyBaseConfigPath(), cfg.BoundTopologyConfigPath(), nil
	}
	if errors.Is(err, os.ErrNotExist) {
		return "", "", nil
	}
	return "", "", fmt.Errorf("stat bound topology base config: %w", err)
}

func currentExecutablePath() string {
	path, err := os.Executable()
	if err != nil {
		return osutil.CurrentBin()
	}
	return path
}

func readStudioctlServerState(cfg *config.Config) (runtimeState, bool, error) {
	data, err := os.ReadFile(cfg.StudioctlServerPIDPath())
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

func writeStudioctlServerState(cfg *config.Config, state runtimeState) error {
	if err := os.MkdirAll(filepath.Dir(cfg.StudioctlServerPIDPath()), osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create pid file parent directory: %w", err)
	}

	data, err := json.Marshal(state)
	if err != nil {
		return fmt.Errorf("encode pid file: %w", err)
	}
	if err := os.WriteFile(cfg.StudioctlServerPIDPath(), append(data, '\n'), osutil.FilePermDefault); err != nil {
		return fmt.Errorf("write pid file: %w", err)
	}

	return nil
}

func removeStudioctlServerState(cfg *config.Config) error {
	if err := os.Remove(cfg.StudioctlServerPIDPath()); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("remove pid file: %w", err)
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

func readLatestStudioctlServerLogTail(dir string) string {
	path, ok := latestStudioctlServerLogPath(dir)
	if !ok {
		return ""
	}

	return readStudioctlServerLogTail(path)
}

func readLatestStudioctlServerLogTailSince(dir string, since time.Time) string {
	files, err := LogFiles(dir)
	if err != nil {
		return ""
	}
	for i := len(files) - 1; i >= 0; i-- {
		if !files[i].ModTime.Before(since) {
			return readStudioctlServerLogTail(files[i].Path)
		}
	}
	return ""
}

func readStudioctlServerLogTail(path string) string {
	//nolint:gosec // G304: log path is derived from resolved STUDIOCTL_HOME and a fixed filename pattern.
	file, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer func() {
		ignoreError(file.Close())
	}()

	lines := make([]string, 0, studioctlServerLogTailLines)
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		if len(lines) == studioctlServerLogTailLines {
			copy(lines, lines[1:])
			lines[studioctlServerLogTailLines-1] = scanner.Text()
			continue
		}

		lines = append(lines, scanner.Text())
	}

	if len(lines) == 0 {
		return ""
	}

	return osutil.LineBreak +
		"studioctl-server log tail:" +
		osutil.LineBreak +
		strings.Join(lines, osutil.LineBreak)
}

func latestStudioctlServerLogPath(dir string) (string, bool) {
	return LatestLogPath(dir)
}

// LatestLogPath returns the most recently modified studioctl-server log path.
func LatestLogPath(dir string) (string, bool) {
	files, err := LogFiles(dir)
	if err != nil || len(files) == 0 {
		return "", false
	}
	return files[len(files)-1].Path, true
}

// LogFiles returns studioctl-server log files ordered by modification time.
func LogFiles(dir string) ([]LogFile, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("read studioctl-server log directory: %w", err)
	}

	files := make([]LogFile, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !isStudioctlServerLogName(entry.Name()) {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		files = append(files, LogFile{
			Path:    filepath.Join(dir, entry.Name()),
			ModTime: info.ModTime(),
			Size:    info.Size(),
		})
	}
	sort.Slice(files, func(i, j int) bool {
		if files[i].ModTime.Equal(files[j].ModTime) {
			return files[i].Path < files[j].Path
		}
		return files[i].ModTime.Before(files[j].ModTime)
	})

	return files, nil
}

func isStudioctlServerLogName(name string) bool {
	return logIDFromName(name) != ""
}

func logIDFromName(name string) string {
	const dateLength = len("2006-01-02")
	if len(name) <= dateLength+len("-")+len(studioctlServerLogSuffix) {
		return ""
	}
	if !strings.HasSuffix(name, studioctlServerLogSuffix) {
		return ""
	}
	if !isUTCDatePrefix(name[:dateLength]) {
		return ""
	}
	if name[dateLength] != '-' {
		return ""
	}
	id := name[dateLength+1 : len(name)-len(studioctlServerLogSuffix)]
	value, err := strconv.Atoi(id)
	if err != nil || value <= 0 {
		return ""
	}
	return id
}

func isUTCDatePrefix(value string) bool {
	if len(value) != len("2006-01-02") || value[4] != '-' || value[7] != '-' {
		return false
	}
	for i, r := range value {
		if i == 4 || i == 7 {
			continue
		}
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

func zeroRuntimeState() runtimeState {
	return runtimeState{
		Start: startConfig{
			BinaryPath:                  "",
			WorkingDir:                  "",
			UnixSocketPath:              "",
			TunnelURL:                   "",
			LocaltestURL:                "",
			StudioctlPath:               "",
			BoundTopologyBaseConfigPath: "",
			BoundTopologyConfigPath:     "",
		},
		PID: 0,
	}
}
