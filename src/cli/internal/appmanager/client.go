// Package appmanager provides local control-plane integration with the app-manager host service.
package appmanager

import (
	"bufio"
	"bytes"
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
	"sort"
	"strconv"
	"strings"
	"time"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	controlBaseURL = "http://app-manager"

	healthPath   = "/api/v1/healthz"
	statusPath   = "/api/v1/studioctl/status"
	registerPath = "/api/v1/studioctl/apps"
	shutdownPath = "/api/v1/studioctl/shutdown"

	appManagerUnixSocketEnv = "APP_MANAGER_UNIX_SOCKET_PATH"
	appManagerTunnelURLEnv  = "Tunnel__Url"
	appManagerStudioctlEnv  = "Studioctl__Path"

	appManagerStartTimeout          = 10 * time.Second
	appManagerRegisterTimeoutMargin = 2 * time.Second
	appManagerShutdownWait          = 3 * time.Second
	appManagerPollInterval          = 100 * time.Millisecond
	appTunnelEndpointPath           = "/internal/tunnel/app"
	appManagerLogTailLines          = 40
	appManagerLogSuffix             = ".log"
)

type startConfig struct {
	BinaryPath     string `json:"binaryPath"`
	WorkingDir     string `json:"workingDir"`
	UnixSocketPath string `json:"unixSocketPath,omitempty"`
	TunnelURL      string `json:"tunnelUrl"`
	StudioctlPath  string `json:"studioctlPath"`
	InternalDev    bool   `json:"internalDev"`
}

type runtimeState struct {
	Start startConfig `json:"start"`
	PID   int         `json:"pid"`
}

// Status describes the current app-manager status.
type Status struct {
	AppManagerVersion string          `json:"appManagerVersion"`
	DotnetVersion     string          `json:"dotnetVersion"`
	StudioctlPath     string          `json:"studioctlPath"`
	Tunnel            TunnelStatus    `json:"tunnel"`
	Apps              []DiscoveredApp `json:"apps"`
	ProcessID         int             `json:"processId"`
	InternalDev       bool            `json:"internalDev"`
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

// LogFile describes one app-manager log file.
type LogFile struct {
	ModTime time.Time
	Path    string
	Size    int64
}

var (
	// ErrNotRunning is returned when app-manager is not reachable.
	ErrNotRunning = errors.New("app-manager is not running")
	// ErrBinaryMissing is returned when the app-manager binary is not installed.
	ErrBinaryMissing              = errors.New("app-manager binary not found")
	errUnexpectedHealthStatus     = errors.New("unexpected app-manager health status")
	errUnexpectedRegisterStatus   = errors.New("unexpected app-manager register response")
	errUnexpectedUnregisterStatus = errors.New("unexpected app-manager unregister response")
	errUnexpectedStatusStatus     = errors.New("unexpected app-manager status response")
	errUnexpectedShutdownStatus   = errors.New("unexpected app-manager shutdown response")
	errAppManagerStartTimedOut    = errors.New("app-manager start timed out")
	errInvalidPIDFile             = errors.New("pid file does not contain a positive pid")
	// ErrAppEndpointNotFound is returned when app-manager cannot find a matching app endpoint.
	ErrAppEndpointNotFound = errors.New("matching app endpoint not found")
)

// Client talks to the local app-manager control plane.
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

// NewClient constructs an app-manager control-plane client.
func NewClient(cfg *config.Config) *Client {
	return &Client{
		cfg: cfg,
		http: &http.Client{
			Transport: transportForConfig(cfg),
			Timeout:   2 * time.Second,
		},
	}
}

func appRegistrationTimeout(registration AppRegistration) time.Duration {
	if registration.TimeoutSeconds <= 0 {
		return appManagerRegisterTimeoutMargin
	}
	return time.Duration(registration.TimeoutSeconds)*time.Second + appManagerRegisterTimeoutMargin
}

// Shutdown stops app-manager and returns a completion channel that resolves when shutdown is fully complete.
func Shutdown(ctx context.Context, cfg *config.Config) (<-chan error, error) {
	client := NewClient(cfg)
	pid, err := currentManagedPID(ctx, client, cfg)
	if err != nil {
		return nil, err
	}

	if err := shutdownError(client.shutdown(ctx), pid); err != nil {
		return nil, err
	}

	done := make(chan error, 1)
	go func() {
		done <- waitForManagedShutdown(ctx, cfg, client, pid)
		close(done)
	}()

	return done, nil
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
		return fmt.Errorf("shutdown app-manager: %w", err)
	}
	return nil
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
		StudioctlPath     string `json:"studioctlPath"`
		Tunnel            struct {
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
		ProcessID:         status.ProcessID,
		AppManagerVersion: status.AppManagerVersion,
		DotnetVersion:     status.DotnetVersion,
		StudioctlPath:     status.StudioctlPath,
		InternalDev:       status.InternalDev,
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

// RegisterApp registers an app endpoint with app-manager and returns the resolved base URL.
func (c *Client) RegisterApp(ctx context.Context, registration AppRegistration) (string, error) {
	body, err := json.Marshal(registration)
	if err != nil {
		return "", fmt.Errorf("encode app registration: %w", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		controlBaseURL+registerPath,
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

// UnregisterApp notifies app-manager that studioctl stopped an app.
func (c *Client) UnregisterApp(ctx context.Context, appID string) error {
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodDelete,
		controlBaseURL+registerPath+"?appId="+url.QueryEscape(appID),
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

// shutdown asks app-manager to stop itself.
func (c *Client) shutdown(ctx context.Context) error {
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
func EnsureStarted(ctx context.Context, cfg *config.Config, loadBalancerPort string) error {
	return EnsureStartedWithStudioctlPath(ctx, cfg, loadBalancerPort, currentExecutablePath())
}

// EnsureStartedWithStudioctlPath starts or reconciles app-manager with an explicit studioctl path.
func EnsureStartedWithStudioctlPath(
	ctx context.Context,
	cfg *config.Config,
	loadBalancerPort,
	studioctlPath string,
) error {
	desired := buildStartConfig(cfg, loadBalancerPort, studioctlPath)
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

	return ensureStartedFromPersistedState(ctx, cfg, client, desired)
}

func ensureStartedFromPersistedState(
	ctx context.Context,
	cfg *config.Config,
	client *Client,
	desired startConfig,
) error {
	state, ok, err := readAppManagerState(cfg)
	if err != nil {
		return fmt.Errorf("read app-manager pid file: %w", err)
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
		return fmt.Errorf("check persisted app-manager pid %d: %w", state.PID, err)
	}

	if !running {
		return restartFromPersistedState(ctx, cfg, desired, 0)
	}

	if state.Start == desired {
		status, waitErr := waitForHealthy(ctx, cfg, client, state.PID)
		if waitErr == nil {
			return writeAppManagerState(cfg, runtimeState{PID: status.ProcessID, Start: desired})
		}
	}

	return restartFromPersistedState(ctx, cfg, desired, state.PID)
}

func restartFromPersistedState(ctx context.Context, cfg *config.Config, desired startConfig, pid int) error {
	if pid > 0 {
		if err := osutil.KillProcess(pid); err != nil {
			return fmt.Errorf("stop persisted app-manager pid %d: %w", pid, err)
		}
	}

	_, ok, err := readAppManagerState(cfg)
	if err != nil {
		return fmt.Errorf("read app-manager pid file: %w", err)
	}
	if ok {
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
	if err := client.shutdown(ctx); err != nil {
		return fmt.Errorf("shutdown app-manager for restart: %w", err)
	}

	if !waitForShutdown(ctx, client, cfg) {
		if err := osutil.KillProcess(pid); err != nil {
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
	if startConfig.StudioctlPath != "" {
		cmd.Env = append(cmd.Env, appManagerStudioctlEnv+"="+startConfig.StudioctlPath)
	}
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
		return fmt.Errorf("start app-manager: %w", err)
	}
	err = writeAppManagerState(cfg, runtimeState{PID: cmd.Process.Pid, Start: startConfig})
	if err != nil {
		ignoreError(cmd.Process.Kill())
		return fmt.Errorf("write app-manager pid file: %w", err)
	}
	err = cmd.Process.Release()
	if err != nil {
		ignoreError(removeAppManagerState(cfg))
		return fmt.Errorf("release app-manager process handle: %w", err)
	}

	client := NewClient(cfg)
	status, err := waitForHealthy(ctx, cfg, client, cmd.Process.Pid)
	if err == nil {
		return writeAppManagerState(cfg, runtimeState{PID: status.ProcessID, Start: startConfig})
	}

	ignoreError(osutil.KillProcess(cmd.Process.Pid))
	ignoreError(removeAppManagerState(cfg))
	return err
}

func waitForHealthy(ctx context.Context, cfg *config.Config, client *Client, logPID int) (*Status, error) {
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
			readAppManagerLogTailForPID(cfg.AppManagerLogDir(), logPID),
		)
	}

	return nil, fmt.Errorf(
		"%w: %s%s",
		errAppManagerStartTimedOut,
		appManagerStartTimeout,
		readAppManagerLogTailForPID(cfg.AppManagerLogDir(), logPID),
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

func currentManagedPID(ctx context.Context, client *Client, cfg *config.Config) (int, error) {
	status, err := client.Status(ctx)
	if err == nil {
		return status.ProcessID, nil
	}
	if !errors.Is(err, ErrNotRunning) {
		state, ok, stateErr := readAppManagerState(cfg)
		if stateErr != nil {
			return 0, fmt.Errorf("read persisted app-manager state after status failure: %w", stateErr)
		}
		if ok {
			return state.PID, nil
		}
		return 0, fmt.Errorf("get app-manager status before shutdown: %w", err)
	}

	state, ok, err := readAppManagerState(cfg)
	if err != nil {
		return 0, fmt.Errorf("read persisted app-manager state: %w", err)
	}
	if !ok {
		return 0, nil
	}
	return state.PID, nil
}

func waitForManagedShutdown(ctx context.Context, cfg *config.Config, client *Client, pid int) error {
	deadline := time.Now().Add(appManagerShutdownWait)
	for time.Now().Before(deadline) {
		healthStopped := errors.Is(client.Health(ctx), ErrNotRunning)
		processStopped, err := managedProcessStopped(pid)
		if err != nil {
			return err
		}
		if healthStopped && processStopped {
			if err := removeAppManagerState(cfg); err != nil {
				return fmt.Errorf("remove stale app-manager pid file: %w", err)
			}
			return nil
		}
		time.Sleep(appManagerPollInterval)
	}

	return stopPersistedProcess(cfg, pid)
}

func stopPersistedProcess(cfg *config.Config, pid int) error {
	if pid <= 0 {
		return removePersistedAppManagerState(cfg)
	}

	running, err := osutil.ProcessRunning(pid)
	if err != nil {
		return fmt.Errorf("check app-manager pid %d: %w", pid, err)
	}
	if running {
		if err := osutil.KillProcess(pid); err != nil {
			return fmt.Errorf("kill app-manager pid %d: %w", pid, err)
		}
	}

	return removePersistedAppManagerState(cfg)
}

func removePersistedAppManagerState(cfg *config.Config) error {
	if err := removeAppManagerState(cfg); err != nil {
		return fmt.Errorf("remove stale app-manager pid file: %w", err)
	}
	return nil
}

func managedProcessStopped(pid int) (bool, error) {
	if pid <= 0 {
		return true, nil
	}
	running, err := osutil.ProcessRunning(pid)
	if err != nil {
		return false, fmt.Errorf("check app-manager pid %d: %w", pid, err)
	}
	return !running, nil
}

func buildStartConfig(cfg *config.Config, loadBalancerPort, studioctlPath string) startConfig {
	return startConfig{
		BinaryPath:     cfg.AppManagerBinaryPath(),
		WorkingDir:     cfg.Home,
		UnixSocketPath: cfg.AppManagerSocketPath(),
		TunnelURL:      TunnelURL(loadBalancerPort),
		StudioctlPath:  studioctlPath,
		InternalDev:    config.IsTruthyEnv(os.Getenv(config.EnvInternalDevMode)),
	}
}

func liveConfig(cfg *config.Config, status *Status) startConfig {
	return startConfig{
		BinaryPath:     cfg.AppManagerBinaryPath(),
		WorkingDir:     cfg.Home,
		UnixSocketPath: cfg.AppManagerSocketPath(),
		TunnelURL:      status.Tunnel.URL,
		StudioctlPath:  status.StudioctlPath,
		InternalDev:    status.InternalDev,
	}
}

func currentExecutablePath() string {
	path, err := os.Executable()
	if err != nil {
		return osutil.CurrentBin()
	}
	return path
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

func readLatestAppManagerLogTail(dir string) string {
	path, ok := latestAppManagerLogPath(dir)
	if !ok {
		return ""
	}

	return readAppManagerLogTail(path)
}

func readAppManagerLogTailForPID(dir string, pid int) string {
	if pid <= 0 {
		return readLatestAppManagerLogTail(dir)
	}

	paths, err := LogPathsForPID(dir, pid)
	if err != nil || len(paths) == 0 {
		return ""
	}
	return readAppManagerLogTail(paths[len(paths)-1])
}

func readAppManagerLogTail(path string) string {
	//nolint:gosec // G304: log path is derived from resolved STUDIOCTL_HOME and a fixed filename pattern.
	file, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer func() {
		ignoreError(file.Close())
	}()

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

	return osutil.LineBreak +
		"app-manager log tail:" +
		osutil.LineBreak +
		strings.Join(lines, osutil.LineBreak)
}

func latestAppManagerLogPath(dir string) (string, bool) {
	return LatestLogPath(dir)
}

// LatestLogPath returns the most recently modified app-manager log path.
func LatestLogPath(dir string) (string, bool) {
	files, err := LogFiles(dir)
	if err != nil || len(files) == 0 {
		return "", false
	}
	return files[len(files)-1].Path, true
}

// LogFiles returns app-manager log files ordered by modification time.
func LogFiles(dir string) ([]LogFile, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("read app-manager log directory: %w", err)
	}

	files := make([]LogFile, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !isAppManagerLogName(entry.Name()) {
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

// LogPathsForPID returns app-manager logs for a process id in filename order.
func LogPathsForPID(dir string, pid int) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("read app-manager log directory: %w", err)
	}

	paths := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !isAppManagerLogNameForPID(entry.Name(), pid) {
			continue
		}
		paths = append(paths, filepath.Join(dir, entry.Name()))
	}
	sort.Strings(paths)

	return paths, nil
}

func isAppManagerLogName(name string) bool {
	_, ok := logPIDFromName(name)
	return ok
}

func logPIDFromName(name string) (int, bool) {
	const dateLength = len("2006-01-02")
	if len(name) <= dateLength+len("-")+len(appManagerLogSuffix) {
		return 0, false
	}
	if !isUTCDatePrefix(name[:dateLength]) {
		return 0, false
	}
	if name[dateLength] != '-' {
		return 0, false
	}
	if !strings.HasSuffix(name, appManagerLogSuffix) {
		return 0, false
	}

	value, err := strconv.Atoi(name[dateLength+1 : len(name)-len(appManagerLogSuffix)])
	if err != nil || value <= 0 {
		return 0, false
	}
	return value, true
}

func isAppManagerLogNameForPID(name string, pid int) bool {
	if pid <= 0 {
		return false
	}
	logPID, ok := logPIDFromName(name)
	return ok && logPID == pid
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
			BinaryPath:     "",
			WorkingDir:     "",
			UnixSocketPath: "",
			TunnelURL:      "",
			StudioctlPath:  "",
			InternalDev:    false,
		},
		PID: 0,
	}
}
