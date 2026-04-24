package cmd

import (
	"bytes"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	containerruntime "altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/processutil"
	"altinn.studio/studioctl/internal/appcontainers"
	"altinn.studio/studioctl/internal/appimage"
	"altinn.studio/studioctl/internal/appmanager"
	appsvc "altinn.studio/studioctl/internal/cmd/app"
	appsupport "altinn.studio/studioctl/internal/cmd/apps"
	"altinn.studio/studioctl/internal/config"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

const (
	runModeProcess                    = "process"
	runModeContainer                  = "container"
	foregroundContainerCleanupTimeout = 15 * time.Second
	dotnetShutdownTimeout             = 10 * time.Second
	appManagerCleanupTimeout          = 2 * time.Second
	appStartupTimeout                 = 15 * time.Second
	appStartupPollInterval            = 500 * time.Millisecond
	maxAppLogCreateAttempts           = 3
)

var (
	errAppContainerEndpointUnavailable = errors.New("app container endpoint unavailable")
	errAppContainerExited              = errors.New("app container exited")
	errAppContainerStoppedBeforeReady  = errors.New("app container stopped before becoming reachable through localtest")
	errAppExitedBeforeReady            = errors.New("app exited before becoming reachable through localtest")
	errAppLogCreateCollision           = errors.New("too many app log files created concurrently")
	errAppRunStopped                   = errors.New("app run stopped")
	errAppStartupTimedOut              = errors.New("app did not become reachable through localtest")
	errDotnetTargetPathEmpty           = errors.New("dotnet TargetPath is empty")
	errStudioctlConfigRequired         = errors.New("studioctl config is required")
)

// RunCommand implements `studioctl run` and `studioctl app run`.
type RunCommand struct {
	out     *ui.Output
	cfg     *config.Config
	service *appsvc.Service
}

// NewRunCommand creates a new top-level run alias command.
func NewRunCommand(cfg *config.Config, out *ui.Output) *RunCommand {
	return newRunCommand(cfg, out, appsvc.NewService(cfg.Home))
}

func newRunCommand(cfg *config.Config, out *ui.Output, service *appsvc.Service) *RunCommand {
	return &RunCommand{
		out:     out,
		cfg:     cfg,
		service: service,
	}
}

// Usage returns the top-level run command usage.
func (c *RunCommand) Usage() string {
	return c.UsageFor("run")
}

// Name returns the command name.
func (c *RunCommand) Name() string { return "run" }

// Synopsis returns a short description.
func (c *RunCommand) Synopsis() string { return "Run app (alias for 'app run')" }

// UsageFor returns usage text for the supplied command path.
func (c *RunCommand) UsageFor(commandPath string) string {
	return joinLines(
		fmt.Sprintf("Usage: %s %s [-p PATH] [-- app args]", osutil.CurrentBin(), commandPath),
		"",
		"Builds and runs the Altinn app. The app is auto-detected from the",
		"current directory, or can be specified with -p.",
		"",
		"Arguments after -- are passed directly to the app.",
		"",
		"Options:",
		"  -p, --path PATH       Specify app directory (overrides auto-detect)",
		"  -m, --mode MODE       Run mode: process or container (default: process)",
		"  -d, --detach          Run app in background",
		"  --random-host-port    Use a random host port (default: true)",
		"  --image-tag IMAGE     Use a specific app container image tag (container mode)",
		"  --pull                Pull app container image before start (container mode)",
		"  --skip-build          Skip building the app container image (container mode)",
		"  --json                Output as JSON (requires --detach)",
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
	jsonOutput     bool
}

type runDetachedOutput struct {
	AppID       string `json:"appId"`
	Mode        string `json:"mode"`
	URL         string `json:"url"`
	LogPath     string `json:"logPath,omitempty"`
	ContainerID string `json:"containerId,omitempty"`
	Name        string `json:"name,omitempty"`
	ProcessID   int    `json:"processId,omitempty"`
	HostPort    int    `json:"hostPort,omitempty"`
	JSONOutput  bool   `json:"-"`
}

func (o runDetachedOutput) Print(out *ui.Output) error {
	if o.JSONOutput {
		return printJSONOutput(out, "run", o)
	}
	if o.Mode != runModeProcess {
		return nil
	}
	out.Printlnf("App running in background.")
	out.Printlnf("Process: %d", o.ProcessID)
	out.Printlnf("URL: %s", o.URL)
	return nil
}

// Run executes the top-level run alias.
func (c *RunCommand) Run(ctx context.Context, args []string) error {
	return c.RunWithCommandPath(ctx, args, "run")
}

// RunWithCommandPath executes run with usage text bound to commandPath.
func (c *RunCommand) RunWithCommandPath(ctx context.Context, args []string, commandPath string) error {
	flags, dotnetArgs, help, err := c.parseRunFlags(args, commandPath)
	if err != nil {
		return err
	}
	if help {
		c.out.Print(c.UsageFor(commandPath))
		return nil
	}

	target, err := c.service.ResolveRunTarget(ctx, flags.appPath)
	if err != nil {
		if errors.Is(err, repocontext.ErrAppNotFound) {
			return fmt.Errorf("%w: run from an app directory or use -p to specify path", ErrNoAppFound)
		}
		return fmt.Errorf("resolve app: %w", err)
	}

	if err := c.printResolvedRunTarget(target); err != nil {
		return err
	}

	runErr := c.runTarget(ctx, target, dotnetArgs, flags)
	if errors.Is(runErr, errAppRunStopped) {
		c.out.Println("App stopped.")
		return nil
	}
	return runErr
}

func (c *RunCommand) parseRunFlags(args []string, commandPath string) (runFlags, []string, bool, error) {
	fs := flag.NewFlagSet(commandPath, flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	var flags runFlags
	fs.StringVar(&flags.appPath, "p", "", "App directory path")
	fs.StringVar(&flags.appPath, "path", "", "App directory path")
	fs.StringVar(&flags.mode, "m", runModeProcess, "Run mode")
	fs.StringVar(&flags.mode, "mode", runModeProcess, "Run mode")
	fs.StringVar(&flags.imageTag, "image-tag", "", "App container image tag")
	fs.BoolVar(&flags.detach, "d", false, "Run app in background")
	fs.BoolVar(&flags.detach, "detach", false, "Run app in background")
	fs.BoolVar(&flags.pullImage, "pull", false, "Pull app container image before start")
	fs.BoolVar(&flags.randomHostPort, "random-host-port", true, "Use a random host port")
	fs.BoolVar(&flags.skipBuild, "skip-build", false, "Skip building the app container image")
	fs.BoolVar(&flags.jsonOutput, "json", false, "Output as JSON")

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
			return flags, nil, true, nil
		}
		return flags, nil, false, fmt.Errorf("parsing flags: %w", err)
	}
	if err := validateRunFlags(flags); err != nil {
		return flags, nil, false, err
	}
	return flags, dotnetArgs, false, nil
}

func validateRunFlags(flags runFlags) error {
	if flags.mode != runModeProcess && flags.mode != runModeContainer {
		return fmt.Errorf("%w: %s", ErrUnsupportedRuntime, flags.mode)
	}
	if flags.jsonOutput && !flags.detach {
		return fmt.Errorf("%w: --json requires --detach", ErrInvalidFlagValue)
	}
	return nil
}

func (c *RunCommand) printResolvedRunTarget(target appsvc.RunTarget) error {
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("get working directory: %w", err)
	}
	if target.Detection.AppRoot != cwd {
		c.out.Verbosef("Using app at %s (detected via %s)", target.Detection.AppRoot, target.Detection.AppDetectedFrom)
	}
	return nil
}

func (c *RunCommand) runTarget(
	ctx context.Context,
	target appsvc.RunTarget,
	dotnetArgs []string,
	flags runFlags,
) error {
	topology := envtopology.NewLocal(envtopology.DefaultIngressPortString())
	switch flags.mode {
	case runModeProcess:
		return c.runDotnet(ctx, target, dotnetArgs, topology, flags)
	case runModeContainer:
		return c.runDocker(ctx, target, dotnetArgs, topology, flags)
	default:
		return fmt.Errorf("%w: %s", ErrUnsupportedRuntime, flags.mode)
	}
}

func (c *RunCommand) runDotnet(
	ctx context.Context,
	target appsvc.RunTarget,
	args []string,
	topology envtopology.Local,
	flags runFlags,
) error {
	appPath := target.Detection.AppRoot
	spec, specErr := c.service.BuildDotnetRunSpec(
		ctx,
		appPath,
		args,
		os.Environ(),
		topology,
		appsvc.DotnetRunOptions{RandomHostPort: flags.randomHostPort},
	)
	if specErr != nil {
		return fmt.Errorf("build process run spec: %w", specErr)
	}

	if err := c.buildDotnetApp(ctx, spec, flags.jsonOutput); err != nil {
		return err
	}

	cmd, waitErr, processName, logPath, cleanupLog, err := c.startDotnetRun(ctx, target, spec, flags)
	if err != nil {
		return err
	}
	defer cleanupLog()

	baseURL, err := c.registerStartedDotnetApp(ctx, target, spec, cmd, waitErr, topology, flags)
	if err != nil {
		return err
	}
	if flags.detach {
		return runDetachedOutput{
			AppID:       target.AppID,
			Mode:        runModeProcess,
			URL:         baseURL,
			LogPath:     logPath,
			ContainerID: "",
			Name:        processName,
			ProcessID:   cmd.Process.Pid,
			HostPort:    0,
			JSONOutput:  flags.jsonOutput,
		}.Print(c.out)
	}
	defer c.unregisterAppBestEffort(ctx, target.AppID)

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

func (c *RunCommand) startDotnetRun(
	ctx context.Context,
	target appsvc.RunTarget,
	spec appsvc.DotnetRunSpec,
	flags runFlags,
) (*exec.Cmd, chan error, string, string, func(), error) {
	targetPath, err := c.resolveDotnetTargetPath(ctx, spec)
	if err != nil {
		return nil, nil, "", "", nil, err
	}
	command, commandArgs := appsvc.DotnetAppRunCommand(targetPath, spec.AppArgs)
	c.out.Verbosef("Running: %s %v", command, commandArgs)

	cmd := processutil.CommandContext(context.WithoutCancel(ctx), command, commandArgs...)
	logPath, cleanupLog, err := c.configureDotnetRunCommand(cmd, target, spec, flags)
	if err != nil {
		return nil, nil, "", "", nil, err
	}

	if err := cmd.Start(); err != nil {
		cleanupLog()
		return nil, nil, "", "", nil, fmt.Errorf("start dotnet: %w", err)
	}

	waitErr := waitForCommand(cmd)
	processName := filepath.Base(targetPath)
	if err := c.writeProcessLogMetadata(target.AppID, cmd.Process.Pid, processName, logPath); err != nil {
		stopDotnetProcess(cmd.Process, waitErr)
		cleanupLog()
		return nil, nil, "", "", nil, err
	}

	return cmd, waitErr, processName, logPath, cleanupLog, nil
}

func (c *RunCommand) configureDotnetRunCommand(
	cmd *exec.Cmd,
	target appsvc.RunTarget,
	spec appsvc.DotnetRunSpec,
	flags runFlags,
) (string, func(), error) {
	cmd.Dir = spec.Dir
	cmd.Env = spec.Env
	logFile, logPath, err := c.openAppLog(target.AppID, flags.jsonOutput)
	if err != nil {
		return "", nil, err
	}
	if !flags.detach {
		cmd.Stdin = os.Stdin
		cmd.Stdout = io.MultiWriter(os.Stdout, logFile)
		cmd.Stderr = io.MultiWriter(os.Stderr, logFile)
		return logPath, func() { closeAppLog(c.out, logFile) }, nil
	}

	cmd.Stdout = logFile
	cmd.Stderr = logFile
	osutil.ApplyDetachedAttrs(cmd)
	return logPath, func() { closeAppLog(c.out, logFile) }, nil
}

func waitForCommand(cmd *exec.Cmd) chan error {
	waitErr := make(chan error, 1)
	go func() {
		waitErr <- cmd.Wait()
	}()
	return waitErr
}

func (c *RunCommand) registerStartedDotnetApp(
	ctx context.Context,
	target appsvc.RunTarget,
	spec appsvc.DotnetRunSpec,
	cmd *exec.Cmd,
	waitErr chan error,
	topology envtopology.Local,
	flags runFlags,
) (string, error) {
	monitor := processReadinessMonitor(waitErr)
	runInfo := nativeAppRunInfo(cmd.Process.Pid)
	return c.registerStartedDotnetAppWithRunInfo(ctx, target, spec, cmd, waitErr, topology, monitor, runInfo, flags)
}

func (c *RunCommand) registerStartedDotnetAppWithRunInfo(
	ctx context.Context,
	target appsvc.RunTarget,
	spec appsvc.DotnetRunSpec,
	cmd *exec.Cmd,
	waitErr chan error,
	topology envtopology.Local,
	monitor readinessMonitor,
	runInfo appmanager.AppRegistration,
	flags runFlags,
) (string, error) {
	var baseURL string
	var registerErr error
	if flags.randomHostPort {
		baseURL, registerErr = c.registerProcessAndWaitForApp(
			ctx,
			target.AppID,
			cmd.Process.Pid,
			topology,
			runInfo,
			monitor,
			flags.jsonOutput,
		)
	} else {
		baseURL, registerErr = c.registerPortAndWaitForApp(
			ctx,
			target.AppID,
			spec.Port,
			topology,
			runInfo,
			monitor,
			flags.jsonOutput,
		)
	}
	if registerErr != nil {
		stopDotnetProcess(cmd.Process, waitErr)
		return "", registerErr
	}
	return baseURL, nil
}

func (c *RunCommand) buildDotnetApp(ctx context.Context, spec appsvc.DotnetRunSpec, quiet bool) error {
	c.out.Verbosef("Running: dotnet %v", spec.BuildArgs)
	cmd := processutil.CommandContext(ctx, "dotnet", spec.BuildArgs...)
	cmd.Dir = spec.Dir
	var stderr bytes.Buffer
	if quiet {
		cmd.Stdout = io.Discard
		cmd.Stderr = &stderr
	} else {
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
	}
	if err := cmd.Run(); err != nil {
		if quiet {
			stderrText := strings.TrimSpace(stderr.String())
			if stderrText != "" {
				return fmt.Errorf("build dotnet app: %w: %s", err, stderrText)
			}
		}
		return fmt.Errorf("build dotnet app: %w", err)
	}
	return nil
}

func (c *RunCommand) resolveDotnetTargetPath(ctx context.Context, spec appsvc.DotnetRunSpec) (string, error) {
	c.out.Verbosef("Running: dotnet %v", spec.TargetPathArgs)
	cmd := processutil.CommandContext(ctx, "dotnet", spec.TargetPathArgs...)
	cmd.Dir = spec.Dir
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("resolve dotnet target path: %w: %s", err, strings.TrimSpace(stderr.String()))
	}

	targetPath := lastNonEmptyLine(output)
	if targetPath == "" {
		return "", errDotnetTargetPathEmpty
	}
	if !filepath.IsAbs(targetPath) {
		targetPath = filepath.Join(filepath.Dir(spec.ProjectPath), targetPath)
	}
	if _, err := os.Stat(targetPath); err != nil {
		return "", fmt.Errorf("stat dotnet target path: %w", err)
	}
	return targetPath, nil
}

func lastNonEmptyLine(output []byte) string {
	lines := bytes.Split(output, []byte{'\n'})
	for i := len(lines) - 1; i >= 0; i-- {
		line := strings.TrimSpace(string(lines[i]))
		if line != "" {
			return line
		}
	}
	return ""
}

func (c *RunCommand) openAppLog(appID string, jsonOutput bool) (*os.File, string, error) {
	if c.cfg == nil {
		return nil, "", errStudioctlConfigRequired
	}
	logDir := c.cfg.AppLogDir(appsupport.SanitizeAppID(appID))
	if err := os.MkdirAll(logDir, osutil.DirPermOwnerOnly); err != nil {
		return nil, "", fmt.Errorf("create app log directory: %w", err)
	}
	for range maxAppLogCreateAttempts {
		logPath, err := appsupport.NextLogPath(logDir, time.Now().UTC())
		if err != nil {
			return nil, "", fmt.Errorf("resolve app log path: %w", err)
		}
		//nolint:gosec // G304: log path stays under the configured studioctl log directory; app ID is path-sanitized.
		logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, osutil.FilePermOwnerOnly)
		if errors.Is(err, os.ErrExist) {
			continue
		}
		if err != nil {
			return nil, "", fmt.Errorf("open app log: %w", err)
		}
		if !jsonOutput {
			c.out.Printlnf("Log: %s", logPath)
		}
		return logFile, logPath, nil
	}

	return nil, "", fmt.Errorf("create app log: %w", errAppLogCreateCollision)
}

func closeAppLog(out *ui.Output, logFile *os.File) {
	if err := logFile.Close(); err != nil {
		out.Verbosef("failed to close app log: %v", err)
	}
}

func (c *RunCommand) writeProcessLogMetadata(appID string, processID int, processName string, logPath string) error {
	if err := appsupport.WriteRunMetadata(logPath, appsupport.RunMetadata{
		StartedAt: time.Now().UTC(),
		AppID:     appID,
		Mode:      runModeProcess,
		ID:        strconv.Itoa(processID),
		Name:      processName,
		LogPath:   logPath,
		ProcessID: processID,
		HostPort:  0,
	}); err != nil {
		return fmt.Errorf("write app log metadata: %w", err)
	}
	return nil
}

func nativeAppRunInfo(processID int) appmanager.AppRegistration {
	return appmanager.AppRegistration{
		AppID:          "",
		ContainerID:    "",
		HostPort:       0,
		ProcessID:      processID,
		TimeoutSeconds: 0,
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

func (c *RunCommand) registerPortAndWaitForApp(
	ctx context.Context,
	appID string,
	port int,
	topology envtopology.Local,
	runInfo appmanager.AppRegistration,
	monitor readinessMonitor,
	jsonOutput bool,
) (string, error) {
	if c.cfg == nil {
		return "", errStudioctlConfigRequired
	}
	if err := appmanager.EnsureStarted(ctx, c.cfg, topology.IngressPort()); err != nil {
		return "", startupOperationError(ctx, "start app-manager", err)
	}

	client := appmanager.NewClient(c.cfg)
	baseURL, err := registerPortAppWithStartupMonitor(ctx, client, appID, port, runInfo, monitor)
	if err != nil {
		return "", err
	}

	if !jsonOutput {
		c.out.Printlnf("App ready: %s", baseURL)
	}
	return baseURL, nil
}

func registerPortAppWithStartupMonitor(
	ctx context.Context,
	client *appmanager.Client,
	appID string,
	port int,
	runInfo appmanager.AppRegistration,
	monitor readinessMonitor,
) (string, error) {
	registration := appmanager.AppRegistration{
		AppID:          appID,
		ContainerID:    "",
		HostPort:       port,
		ProcessID:      0,
		TimeoutSeconds: int(appStartupTimeout.Seconds()),
	}
	applyAppRunInfo(&registration, runInfo)
	return registerAppWithStartupMonitor(
		ctx,
		client,
		registration,
		monitor,
		portAppRegistrationTimeoutError(appID, port),
	)
}

func portAppRegistrationTimeoutError(appID string, port int) error {
	return fmt.Errorf(
		"%w: app %s was not discovered on port %d within %s",
		errAppStartupTimedOut,
		appID,
		port,
		appStartupTimeout,
	)
}

func (c *RunCommand) registerContainerAndWaitForApp(
	ctx context.Context,
	appID string,
	hostPort int,
	topology envtopology.Local,
	runInfo appmanager.AppRegistration,
	monitor readinessMonitor,
	jsonOutput bool,
) (string, error) {
	if c.cfg == nil {
		return "", errStudioctlConfigRequired
	}
	if err := appmanager.EnsureStarted(ctx, c.cfg, topology.IngressPort()); err != nil {
		return "", startupOperationError(ctx, "start app-manager", err)
	}

	client := appmanager.NewClient(c.cfg)
	baseURL, err := registerPortAppWithStartupMonitor(ctx, client, appID, hostPort, runInfo, monitor)
	if err != nil {
		return "", err
	}

	if !jsonOutput {
		c.out.Printlnf("App ready: %s", baseURL)
	}
	return baseURL, nil
}

func (c *RunCommand) registerProcessAndWaitForApp(
	ctx context.Context,
	appID string,
	processID int,
	topology envtopology.Local,
	runInfo appmanager.AppRegistration,
	monitor readinessMonitor,
	jsonOutput bool,
) (string, error) {
	if c.cfg == nil {
		return "", errStudioctlConfigRequired
	}
	if err := appmanager.EnsureStarted(ctx, c.cfg, topology.IngressPort()); err != nil {
		return "", startupOperationError(ctx, "start app-manager", err)
	}

	client := appmanager.NewClient(c.cfg)
	baseURL, err := registerProcessAppWithStartupMonitor(ctx, client, appID, processID, runInfo, monitor)
	if err != nil {
		return "", err
	}

	if !jsonOutput {
		c.out.Printlnf("App ready: %s", baseURL)
	}
	return baseURL, nil
}

func registerProcessAppWithStartupMonitor(
	ctx context.Context,
	client *appmanager.Client,
	appID string,
	processID int,
	runInfo appmanager.AppRegistration,
	monitor readinessMonitor,
) (string, error) {
	registration := appmanager.AppRegistration{
		AppID:          appID,
		ContainerID:    "",
		HostPort:       0,
		ProcessID:      processID,
		TimeoutSeconds: int(appStartupTimeout.Seconds()),
	}
	applyAppRunInfo(&registration, runInfo)
	return registerAppWithStartupMonitor(
		ctx,
		client,
		registration,
		monitor,
		processAppRegistrationTimeoutError(appID, processID),
	)
}

func applyAppRunInfo(registration *appmanager.AppRegistration, runInfo appmanager.AppRegistration) {
	if runInfo.ProcessID > 0 {
		registration.ProcessID = runInfo.ProcessID
	}
	registration.ContainerID = runInfo.ContainerID
	if runInfo.HostPort > 0 {
		registration.HostPort = runInfo.HostPort
	}
}

func registerAppWithStartupMonitor(
	ctx context.Context,
	client *appmanager.Client,
	registration appmanager.AppRegistration,
	monitor readinessMonitor,
	timeoutErr error,
) (string, error) {
	waitCtx, cancel := context.WithTimeout(ctx, appStartupTimeout)
	defer cancel()

	if err := monitor(waitCtx); err != nil {
		return "", startupMonitorError(ctx, waitCtx, err, timeoutErr)
	}

	registrationDone := make(chan appRegistrationResult, 1)
	go func() {
		baseURL, err := client.RegisterApp(waitCtx, registration)
		registrationDone <- appRegistrationResult{baseURL: baseURL, err: err}
	}()

	ticker := time.NewTicker(appStartupPollInterval)
	defer ticker.Stop()

	for {
		if err := startupContextError(ctx, waitCtx, timeoutErr); err != nil {
			return "", err
		}

		select {
		case result := <-registrationDone:
			if result.err == nil {
				return result.baseURL, nil
			}
			if errors.Is(result.err, appmanager.ErrAppEndpointNotFound) ||
				errors.Is(result.err, context.DeadlineExceeded) ||
				waitCtx.Err() != nil {
				return "", timeoutErr
			}
			if ctx.Err() != nil {
				return "", errAppRunStopped
			}
			return "", startupOperationError(ctx, "register app with app-manager", result.err)
		case <-ticker.C:
			if err := monitor(waitCtx); err != nil {
				return "", startupMonitorError(ctx, waitCtx, err, timeoutErr)
			}
		case <-ctx.Done():
			return "", errAppRunStopped
		case <-waitCtx.Done():
			return "", timeoutErr
		}
	}
}

type appRegistrationResult struct {
	err     error
	baseURL string
}

func startupMonitorError(ctx, waitCtx context.Context, err, timeoutErr error) error {
	if ctx.Err() != nil {
		return errAppRunStopped
	}
	if waitCtx.Err() != nil {
		return timeoutErr
	}
	return err
}

func startupContextError(ctx, waitCtx context.Context, timeoutErr error) error {
	if ctx.Err() != nil {
		return errAppRunStopped
	}
	if waitCtx.Err() != nil {
		return timeoutErr
	}
	return nil
}

func processAppRegistrationTimeoutError(appID string, processID int) error {
	return fmt.Errorf(
		"%w: app %s was not discovered in process %d within %s",
		errAppStartupTimedOut,
		appID,
		processID,
		appStartupTimeout,
	)
}

func startupOperationError(ctx context.Context, operation string, err error) error {
	if ctx.Err() != nil {
		return errAppRunStopped
	}
	return fmt.Errorf("%s: %w", operation, err)
}

func (c *RunCommand) unregisterAppBestEffort(ctx context.Context, appID string) {
	if c.cfg == nil {
		return
	}

	cleanupCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), appManagerCleanupTimeout)
	defer cancel()

	if err := appmanager.NewClient(c.cfg).UnregisterApp(cleanupCtx, appID); err != nil {
		c.out.Verbosef("failed to unregister app %s from app-manager: %v", appID, err)
	}
}

func (c *RunCommand) runDocker(
	ctx context.Context,
	target appsvc.RunTarget,
	args []string,
	topology envtopology.Local,
	flags runFlags,
) error {
	result := target.Detection
	spec, specErr := c.service.BuildDockerRunSpec(result, args, topology, appsvc.DockerRunOptions{
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

	containerID, info, err := c.createDockerAppContainer(ctx, client, spec, flags.jsonOutput)
	if err != nil {
		return err
	}

	runInfo := containerAppRunInfo(containerID, info)
	baseURL, err := c.waitForDockerAppReady(
		ctx,
		client,
		containerID,
		info,
		target.AppID,
		topology,
		runInfo,
		flags.jsonOutput,
	)
	if err != nil {
		return c.withAppContainerCleanup(ctx, client, containerID, err)
	}

	if flags.detach {
		return c.detachedDockerOutput(target.AppID, containerID, info, baseURL, flags).Print(c.out)
	}
	defer c.unregisterAppBestEffort(ctx, target.AppID)

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

func (c *RunCommand) createDockerAppContainer(
	ctx context.Context,
	client containerruntime.ContainerClient,
	spec appsvc.DockerRunSpec,
	jsonOutput bool,
) (string, containerruntime.ContainerInfo, error) {
	if removeErr := client.ContainerRemove(ctx, spec.Config.Name, true); removeErr != nil &&
		!errors.Is(removeErr, containerruntime.ErrContainerNotFound) {
		return "", containerruntime.ContainerInfo{}, fmt.Errorf("remove existing app container: %w", removeErr)
	}

	containerID, err := client.CreateContainer(ctx, spec.Config)
	if err != nil {
		return "", containerruntime.ContainerInfo{}, fmt.Errorf("create app container: %w", err)
	}

	info, err := client.ContainerInspect(ctx, containerID)
	if err != nil {
		return "", containerruntime.ContainerInfo{}, c.withAppContainerCleanup(
			ctx,
			client,
			containerID,
			fmt.Errorf("inspect app container: %w", err),
		)
	}
	if !jsonOutput {
		c.printDockerRunInfo(info)
	}

	return containerID, info, nil
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
	topology envtopology.Local,
	runInfo appmanager.AppRegistration,
	jsonOutput bool,
) (string, error) {
	candidate, ok := appcontainers.CandidateFromContainer(info)
	if !ok {
		return "", errAppContainerEndpointUnavailable
	}

	baseURL, err := c.registerContainerAndWaitForApp(
		ctx,
		appID,
		candidate.HostPort,
		topology,
		runInfo,
		containerReadinessMonitor(client, containerID),
		jsonOutput,
	)
	if err != nil {
		return "", err
	}
	return baseURL, nil
}

func (c *RunCommand) detachedDockerOutput(
	appID string,
	containerID string,
	info containerruntime.ContainerInfo,
	baseURL string,
	flags runFlags,
) runDetachedOutput {
	output := runDetachedOutput{
		AppID:       appID,
		Mode:        runModeContainer,
		URL:         baseURL,
		LogPath:     "",
		ContainerID: containerID,
		Name:        info.Name,
		ProcessID:   0,
		HostPort:    0,
		JSONOutput:  flags.jsonOutput,
	}
	if candidate, ok := appcontainers.CandidateFromContainer(info); ok {
		output.HostPort = candidate.HostPort
	}
	return output
}

func containerAppRunInfo(containerID string, info containerruntime.ContainerInfo) appmanager.AppRegistration {
	runInfo := appmanager.AppRegistration{
		AppID:          "",
		ContainerID:    containerID,
		HostPort:       0,
		ProcessID:      0,
		TimeoutSeconds: 0,
	}
	if candidate, ok := appcontainers.CandidateFromContainer(info); ok {
		runInfo.HostPort = candidate.HostPort
	}
	return runInfo
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
		c.out.Printlnf("Port: %d", candidate.HostPort)
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
