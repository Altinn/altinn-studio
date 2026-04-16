package cmd

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	containerruntime "altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/processutil"
	"altinn.studio/studioctl/internal/appcontainers"
	"altinn.studio/studioctl/internal/appimage"
	"altinn.studio/studioctl/internal/appmanager"
	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	runsvc "altinn.studio/studioctl/internal/cmd/run"
	"altinn.studio/studioctl/internal/config"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/networking"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

const (
	runModeNative                     = "native"
	runModeContainer                  = "container"
	foregroundContainerCleanupTimeout = 15 * time.Second
	dotnetShutdownTimeout             = 10 * time.Second
	appManagerCleanupTimeout          = 2 * time.Second
	appStartupTimeout                 = 15 * time.Second
	appStartupRequestTimeout          = time.Second
	appStartupPollInterval            = 500 * time.Millisecond
)

var (
	errAppContainerEndpointUnavailable = errors.New("app container endpoint unavailable")
	errAppContainerExited              = errors.New("app container exited")
	errAppContainerStoppedBeforeReady  = errors.New("app container stopped before becoming reachable through localtest")
	errAppExitedBeforeReady            = errors.New("app exited before becoming reachable through localtest")
	errAppRunStopped                   = errors.New("app run stopped")
	errAppStartupTimedOut              = errors.New("app did not become reachable through localtest")
	errStudioctlConfigRequired         = errors.New("studioctl config is required")
)

// RunCommand implements the 'run' subcommand.
type RunCommand struct {
	out     *ui.Output
	cfg     *config.Config
	service *runsvc.Service
}

// NewRunCommand creates a new run command.
func NewRunCommand(cfg *config.Config, out *ui.Output) *RunCommand {
	return &RunCommand{
		out:     out,
		cfg:     cfg,
		service: runsvc.NewService(),
	}
}

// Name returns the command name.
func (c *RunCommand) Name() string { return "run" }

// Synopsis returns a short description.
func (c *RunCommand) Synopsis() string { return "Run app natively (wraps 'dotnet run')" }

// Usage returns the full help text.
func (c *RunCommand) Usage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s run [-p PATH] [-- dotnet args]", osutil.CurrentBin()),
		"",
		"Runs the Altinn app using 'dotnet run'. The app is auto-detected from the",
		"current directory, or can be specified with -p.",
		"",
		"Arguments after -- are passed directly to dotnet.",
		"",
		"Options:",
		"  -p, --path PATH       Specify app directory (overrides auto-detect)",
		"  -m, --mode MODE       Run mode: native or container (default: native)",
		"  -d, --detach          Run app container in background (container mode)",
		"  --random-host-port    Publish app container to a random host port (container mode)",
		"  --image-tag IMAGE     Use a specific app container image tag (container mode)",
		"  --pull                Pull app container image before start (container mode)",
		"  --skip-build          Skip building the app container image (container mode)",
		"  -h, --help            Show this help",
	)
}

type runFlags struct {
	appPath        string
	mode           string
	imageTag       string
	detach         bool
	pullImage      bool
	randomHostPort bool
	skipBuild      bool
}

// Run executes the command.
func (c *RunCommand) Run(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("run", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	var flags runFlags
	fs.StringVar(&flags.appPath, "p", "", "App directory path")
	fs.StringVar(&flags.appPath, "path", "", "App directory path")
	fs.StringVar(&flags.mode, "m", runModeNative, "Run mode")
	fs.StringVar(&flags.mode, "mode", runModeNative, "Run mode")
	fs.StringVar(&flags.imageTag, "image-tag", "", "App container image tag")
	fs.BoolVar(&flags.detach, "d", false, "Run app container in background")
	fs.BoolVar(&flags.detach, "detach", false, "Run app container in background")
	fs.BoolVar(&flags.pullImage, "pull", false, "Pull app container image before start")
	fs.BoolVar(&flags.randomHostPort, "random-host-port", false, "Publish app container to a random host port")
	fs.BoolVar(&flags.skipBuild, "skip-build", false, "Skip building the app container image")

	var cmdArgs, dotnetArgs []string
	for i, arg := range args {
		if arg == "--" {
			cmdArgs = args[:i]
			dotnetArgs = args[i+1:]
			break
		}
	}
	if len(cmdArgs) == 0 && len(dotnetArgs) == 0 {
		cmdArgs = args
	}

	if err := fs.Parse(cmdArgs); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			c.out.Print(c.Usage())
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}
	if flags.mode != runModeNative && flags.mode != runModeContainer {
		return fmt.Errorf("%w: %s", ErrUnsupportedRuntime, flags.mode)
	}

	target, err := c.service.ResolveApp(ctx, flags.appPath)
	if err != nil {
		if errors.Is(err, repocontext.ErrAppNotFound) {
			return fmt.Errorf("%w: run from an app directory or use -p to specify path", ErrNoAppFound)
		}
		return fmt.Errorf("resolve app: %w", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("get working directory: %w", err)
	}
	if target.Detection.AppRoot != cwd {
		c.out.Verbosef("Using app at %s (detected via %s)", target.Detection.AppRoot, target.Detection.AppDetectedFrom)
	}

	var runErr error
	switch flags.mode {
	case runModeNative:
		runErr = c.runDotnet(ctx, target, dotnetArgs)
	case runModeContainer:
		runErr = c.runDocker(ctx, target, dotnetArgs, flags)
	default:
		return fmt.Errorf("%w: %s", ErrUnsupportedRuntime, flags.mode)
	}
	if errors.Is(runErr, errAppRunStopped) {
		c.out.Println("App stopped.")
		return nil
	}
	return runErr
}

func (c *RunCommand) runDotnet(ctx context.Context, target runsvc.Target, args []string) error {
	appPath := target.Detection.AppRoot
	spec := c.service.BuildDotnetRunSpec(ctx, appPath, args, os.Environ())

	c.out.Verbosef("Running: dotnet %v", spec.Args)

	cmd := processutil.CommandContext(context.WithoutCancel(ctx), "dotnet", spec.Args...)
	cmd.Dir = spec.Dir
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	cmd.Env = spec.Env

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start dotnet: %w", err)
	}

	waitErr := make(chan error, 1)
	go func() {
		waitErr <- cmd.Wait()
	}()

	if err := c.registerAndWaitForApp(
		ctx,
		target.AppID,
		spec.BaseURL,
		processReadinessMonitor(waitErr),
	); err != nil {
		stopDotnetProcess(cmd.Process, waitErr)
		return err
	}
	defer c.unregisterAppBestEffort(ctx, target.AppID, spec.BaseURL)

	select {
	case err := <-waitErr:
		if err != nil {
			if ctx.Err() != nil {
				return errAppRunStopped
			}
			return fmt.Errorf("running dotnet: %w", err)
		}
		if ctx.Err() != nil {
			return errAppRunStopped
		}
		return nil
	case <-ctx.Done():
		stopDotnetProcess(cmd.Process, waitErr)
		return errAppRunStopped
	}
}

func stopDotnetProcess(process *os.Process, waitErr <-chan error) {
	signalProcessBestEffort(process, os.Interrupt)
	select {
	case <-waitErr:
	case <-time.After(dotnetShutdownTimeout):
		killProcessBestEffort(process)
		<-waitErr
	}
}

//nolint:errcheck,gosec // Shutdown signaling is best-effort; timeout fallback kills the process.
func signalProcessBestEffort(process *os.Process, signal os.Signal) {
	if process == nil {
		return
	}
	process.Signal(signal)
}

//nolint:errcheck,gosec // Cleanup fallback is best-effort after graceful shutdown times out.
func killProcessBestEffort(process *os.Process) {
	if process == nil {
		return
	}
	process.Kill()
}

type readinessMonitor func(context.Context) error

type appMetadataResponse struct {
	ID string `json:"id"`
}

func processReadinessMonitor(waitErr chan error) readinessMonitor {
	return func(context.Context) error {
		select {
		case err := <-waitErr:
			waitErr <- err
			if err != nil {
				return fmt.Errorf("%w: %w", errAppExitedBeforeReady, err)
			}
			return errAppExitedBeforeReady
		default:
			return nil
		}
	}
}

func containerReadinessMonitor(
	client containerruntime.ContainerClient,
	containerID string,
) readinessMonitor {
	return func(ctx context.Context) error {
		state, err := client.ContainerState(ctx, containerID)
		if err != nil {
			return fmt.Errorf("inspect app container state while waiting for startup: %w", err)
		}
		if !state.Running {
			if state.Status != "" {
				return fmt.Errorf("%w: %s", errAppContainerStoppedBeforeReady, state.Status)
			}
			return errAppContainerStoppedBeforeReady
		}
		return nil
	}
}

func (c *RunCommand) registerAndWaitForApp(
	ctx context.Context,
	appID, baseURL string,
	monitor readinessMonitor,
) error {
	if c.cfg == nil {
		return errStudioctlConfigRequired
	}
	if err := appmanager.EnsureStarted(ctx, c.cfg, envlocaltest.DefaultLoadBalancerPortString()); err != nil {
		return startupOperationError(ctx, "start app-manager", err)
	}

	client := appmanager.NewClient(c.cfg)
	if err := client.RegisterApp(ctx, appmanager.AppRegistration{
		GracePeriodSeconds: int(appStartupTimeout.Seconds()),
		AppID:              appID,
		BaseURL:            baseURL,
		Description:        "studioctl run " + appID,
	}); err != nil {
		if ctx.Err() != nil {
			c.unregisterAppBestEffort(ctx, appID, baseURL)
		}
		return startupOperationError(ctx, "register app with app-manager", err)
	}

	url := localtestApplicationMetadataURL(appID)
	c.out.Printlnf("Waiting for app through localtest: %s", url)
	if err := waitForLocaltestApp(ctx, appID, url, monitor); err != nil {
		c.unregisterAppBestEffort(ctx, appID, baseURL)
		return err
	}
	c.out.Printlnf("App ready: %s", url)
	return nil
}

func startupOperationError(ctx context.Context, operation string, err error) error {
	if ctx.Err() != nil {
		return errAppRunStopped
	}
	return fmt.Errorf("%s: %w", operation, err)
}

func (c *RunCommand) unregisterAppBestEffort(ctx context.Context, appID, baseURL string) {
	if c.cfg == nil {
		return
	}

	cleanupCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), appManagerCleanupTimeout)
	defer cancel()

	if err := appmanager.NewClient(c.cfg).UnregisterApp(cleanupCtx, appID, baseURL); err != nil {
		c.out.Verbosef("failed to unregister app %s from app-manager: %v", appID, err)
	}
}

func localtestApplicationMetadataURL(appID string) string {
	// TODO: Move localtest URL construction to somewhere sensible (app package, localtest package).
	return "http://" + networking.LocalDomain + ":" + envlocaltest.DefaultLoadBalancerPortString() +
		"/" + strings.Trim(appID, "/") + "/api/v1/applicationmetadata"
}

func waitForLocaltestApp(ctx context.Context, appID, url string, monitor readinessMonitor) error {
	waitCtx, cancel := context.WithTimeout(ctx, appStartupTimeout)
	defer cancel()

	client := &http.Client{
		Timeout:   appStartupRequestTimeout,
		Transport: localHTTPTransport(),
	}
	var lastStatus string
	for {
		if err := appStartupContextError(ctx, waitCtx, appID, url, lastStatus); err != nil {
			return err
		}

		if err := monitor(waitCtx); err != nil {
			if ctx.Err() != nil {
				return errAppRunStopped
			}
			if waitCtx.Err() != nil {
				return appStartupTimeoutError(appID, url, lastStatus)
			}
			return err
		}

		status, ready := probeLocaltestApp(waitCtx, client, appID, url)
		if ready {
			return nil
		}
		lastStatus = status

		select {
		case <-ctx.Done():
			return errAppRunStopped
		case <-waitCtx.Done():
			return appStartupContextError(ctx, waitCtx, appID, url, lastStatus)
		case <-time.After(appStartupPollInterval):
		}
	}
}

func appStartupContextError(ctx, waitCtx context.Context, appID, url, lastStatus string) error {
	if ctx.Err() != nil {
		return errAppRunStopped
	}
	if waitCtx.Err() != nil {
		return appStartupTimeoutError(appID, url, lastStatus)
	}
	return nil
}

func appStartupTimeoutError(appID, url, lastStatus string) error {
	return fmt.Errorf(
		"%w: app %s was not available within %s at %s; last status: %s; make sure localtest is running: studioctl env up",
		errAppStartupTimedOut,
		appID,
		appStartupTimeout,
		url,
		lastStatusOrDefault(lastStatus),
	)
}

func localHTTPTransport() http.RoundTripper {
	transport, ok := http.DefaultTransport.(*http.Transport)
	if !ok {
		return http.DefaultTransport
	}

	localTransport := transport.Clone()
	localTransport.Proxy = nil
	return localTransport
}

func lastStatusOrDefault(status string) string {
	if status == "" {
		return "no response"
	}
	return status
}

func probeLocaltestApp(ctx context.Context, client *http.Client, appID, url string) (string, bool) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err.Error(), false
	}

	resp, err := client.Do(req)
	if err != nil {
		return err.Error(), false
	}

	if resp.StatusCode != http.StatusOK {
		status := resp.Status
		if err := resp.Body.Close(); err != nil {
			return err.Error(), false
		}
		return status, false
	}

	var metadata appMetadataResponse
	decodeErr := json.NewDecoder(resp.Body).Decode(&metadata)
	closeErr := resp.Body.Close()
	if decodeErr != nil {
		return "invalid application metadata response: " + decodeErr.Error(), false
	}
	if closeErr != nil {
		return "close application metadata response: " + closeErr.Error(), false
	}
	if metadata.ID != appID {
		return fmt.Sprintf("application metadata id %q, want %q", metadata.ID, appID), false
	}
	return resp.Status, true
}

func (c *RunCommand) runDocker(ctx context.Context, target runsvc.Target, args []string, flags runFlags) error {
	result := target.Detection
	spec, specErr := c.service.BuildDockerRunSpec(result, args, runsvc.DockerRunOptions{
		ImageTag:       flags.imageTag,
		RandomHostPort: flags.randomHostPort,
	})
	if specErr != nil {
		return fmt.Errorf("build docker run spec: %w", specErr)
	}

	if err := validateDockerRunImageFlags(flags); err != nil {
		return err
	}

	client, err := containerruntime.Detect(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	defer func() {
		if cerr := client.Close(); cerr != nil {
			c.out.Verbosef("failed to close container client: %v", cerr)
		}
	}()

	if prepareErr := c.prepareDockerRunImage(ctx, client, result, spec.Config.Image, flags); prepareErr != nil {
		return prepareErr
	}

	if removeErr := client.ContainerRemove(ctx, spec.Config.Name, true); removeErr != nil &&
		!errors.Is(removeErr, containerruntime.ErrContainerNotFound) {
		return fmt.Errorf("remove existing app container: %w", removeErr)
	}

	containerID, err := client.CreateContainer(ctx, spec.Config)
	if err != nil {
		return fmt.Errorf("create app container: %w", err)
	}

	info, err := client.ContainerInspect(ctx, containerID)
	if err != nil {
		return c.withAppContainerCleanup(
			ctx,
			client,
			containerID,
			fmt.Errorf("inspect app container: %w", err),
		)
	}
	c.printDockerRunInfo(info)

	baseURL, err := c.waitForDockerAppReady(ctx, client, containerID, info, target.AppID)
	if err != nil {
		return c.withAppContainerCleanup(ctx, client, containerID, err)
	}

	if flags.detach {
		return nil
	}
	defer c.unregisterAppBestEffort(ctx, target.AppID, baseURL)

	runErr := c.followContainer(ctx, client, containerID)
	removeErr := c.removeForegroundContainer(ctx, client, containerID)
	if removeErr != nil {
		if errors.Is(runErr, errAppRunStopped) {
			c.out.Warningf("%v", removeErr)
			return errAppRunStopped
		}
		return errors.Join(runErr, removeErr)
	}
	return runErr
}

func (c *RunCommand) withAppContainerCleanup(
	ctx context.Context,
	client containerruntime.ContainerClient,
	containerID string,
	err error,
) error {
	if removeErr := c.removeForegroundContainer(ctx, client, containerID); removeErr != nil {
		if errors.Is(err, errAppRunStopped) {
			return removeErr
		}
		return errors.Join(err, removeErr)
	}
	return err
}

func (c *RunCommand) waitForDockerAppReady(
	ctx context.Context,
	client containerruntime.ContainerClient,
	containerID string,
	info containerruntime.ContainerInfo,
	appID string,
) (string, error) {
	candidate, ok := appcontainers.CandidateFromContainer(info)
	if !ok {
		return "", errAppContainerEndpointUnavailable
	}

	if err := c.registerAndWaitForApp(
		ctx,
		appID,
		candidate.BaseURL,
		containerReadinessMonitor(client, containerID),
	); err != nil {
		return "", err
	}
	return candidate.BaseURL, nil
}

func (c *RunCommand) removeForegroundContainer(
	ctx context.Context,
	client containerruntime.ContainerClient,
	containerID string,
) error {
	cleanupCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), foregroundContainerCleanupTimeout)
	defer cancel()

	if err := client.ContainerRemove(cleanupCtx, containerID, true); err != nil &&
		!errors.Is(err, containerruntime.ErrContainerNotFound) {
		return fmt.Errorf("remove app container: %w", err)
	}
	return nil
}

func validateDockerRunImageFlags(flags runFlags) error {
	if flags.pullImage && flags.imageTag == "" {
		return fmt.Errorf("%w: --pull requires --image-tag", ErrInvalidFlagValue)
	}
	if flags.pullImage && !flags.skipBuild {
		return fmt.Errorf("%w: --pull requires --skip-build", ErrInvalidFlagValue)
	}
	return nil
}

func (c *RunCommand) prepareDockerRunImage(
	ctx context.Context,
	client containerruntime.ContainerClient,
	result repocontext.Detection,
	imageTag string,
	flags runFlags,
) error {
	if flags.pullImage {
		c.out.Verbosef("Pulling app image %s", imageTag)
		if pullErr := client.ImagePull(ctx, imageTag); pullErr != nil {
			return fmt.Errorf("pull app image: %w", pullErr)
		}
	}
	if flags.skipBuild {
		return nil
	}

	spec, err := appimage.BuildSpecForApp(result, imageTag)
	if err != nil {
		return fmt.Errorf("build docker image spec: %w", err)
	}
	cleanupDockerfile, prepareErr := appimage.MaterializeDockerfile(&spec)
	if prepareErr != nil {
		return fmt.Errorf("materialize dockerfile: %w", prepareErr)
	}
	defer cleanupGeneratedDockerfile(c.out, cleanupDockerfile)

	c.out.Verbosef("Building app image %s", spec.ImageTag)
	if buildErr := client.Build(
		ctx,
		spec.ContextPath,
		spec.Dockerfile,
		spec.ImageTag,
		spec.Build,
	); buildErr != nil {
		return fmt.Errorf("build app image: %w", buildErr)
	}
	return nil
}

func cleanupGeneratedDockerfile(out *ui.Output, cleanup func() error) {
	if err := cleanup(); err != nil && !errors.Is(err, os.ErrNotExist) {
		out.Verbosef("failed to remove generated dockerfile: %v", err)
	}
}

func (c *RunCommand) printDockerRunInfo(info containerruntime.ContainerInfo) {
	c.out.Printlnf("Container: %s", info.Name)
	if candidate, ok := appcontainers.CandidateFromContainer(info); ok {
		c.out.Printlnf("URL: %s", candidate.BaseURL)
	}
}

func (c *RunCommand) followContainer(
	ctx context.Context,
	client containerruntime.ContainerClient,
	containerID string,
) error {
	logs, err := client.ContainerLogs(ctx, containerID, true, "all")
	if err != nil {
		return fmt.Errorf("stream app container logs: %w", err)
	}

	logErr := make(chan error, 1)
	go func() {
		_, copyErr := io.Copy(os.Stdout, logs)
		logErr <- copyErr
	}()

	exitCode, err := client.ContainerWait(ctx, containerID)
	if cerr := logs.Close(); cerr != nil {
		c.out.Verbosef("failed to close app container logs: %v", cerr)
	}
	copyErr := <-logErr
	if err != nil {
		if ctx.Err() != nil {
			return errAppRunStopped
		}
		return fmt.Errorf("wait for app container: %w", err)
	}
	if copyErr != nil {
		return fmt.Errorf("copy app container logs: %w", copyErr)
	}
	if exitCode != 0 {
		return fmt.Errorf("%w with status %d", errAppContainerExited, exitCode)
	}
	return nil
}
