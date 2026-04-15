package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"time"

	containerruntime "altinn.studio/devenv/pkg/container"
	"altinn.studio/studioctl/internal/appcontainers"
	"altinn.studio/studioctl/internal/appimage"
	runsvc "altinn.studio/studioctl/internal/cmd/run"
	"altinn.studio/studioctl/internal/config"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

const (
	runModeNative                     = "native"
	runModeDocker                     = "docker"
	foregroundContainerCleanupTimeout = 10 * time.Second
	dotnetShutdownTimeout             = 10 * time.Second
)

var (
	errAppContainerExited = errors.New("app container exited")
	errAppRunStopped      = errors.New("app run stopped")
)

// RunCommand implements the 'run' subcommand.
type RunCommand struct {
	out     *ui.Output
	service *runsvc.Service
}

// NewRunCommand creates a new run command.
func NewRunCommand(cfg *config.Config, out *ui.Output) *RunCommand {
	return &RunCommand{
		out:     out,
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
		"  -m, --mode MODE       Run mode: native or docker (default: native)",
		"  -d, --detach          Run app container in background (docker mode)",
		"  --random-host-port    Publish app container to a random host port (docker mode)",
		"  --image-tag IMAGE     Use a specific app container image tag (docker mode)",
		"  --pull                Pull app container image before start (docker mode)",
		"  --skip-build          Skip building the app container image (docker mode)",
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
	if flags.mode != runModeNative && flags.mode != runModeDocker {
		return fmt.Errorf("%w: %s", ErrUnsupportedRuntime, flags.mode)
	}

	result, err := c.service.ResolveApp(ctx, flags.appPath)
	if err != nil {
		if errors.Is(err, repocontext.ErrAppNotFound) {
			return fmt.Errorf("%w: run from an app directory or use -p to specify path", ErrNoAppFound)
		}
		return fmt.Errorf("detect app: %w", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("get working directory: %w", err)
	}
	if result.AppRoot != cwd {
		c.out.Verbosef("Using app at %s (detected via %s)", result.AppRoot, result.AppDetectedFrom)
	}

	var runErr error
	switch flags.mode {
	case runModeNative:
		runErr = c.runDotnet(ctx, result.AppRoot, dotnetArgs)
	case runModeDocker:
		runErr = c.runDocker(ctx, result, dotnetArgs, flags)
	default:
		return fmt.Errorf("%w: %s", ErrUnsupportedRuntime, flags.mode)
	}
	if errors.Is(runErr, errAppRunStopped) {
		c.out.Println("App stopped.")
		return nil
	}
	return runErr
}

func (c *RunCommand) runDotnet(ctx context.Context, appPath string, args []string) error {
	spec := c.service.BuildDotnetRunSpec(ctx, appPath, args, os.Environ())

	c.out.Verbosef("Running: dotnet %v", spec.Args)

	//nolint:gosec // G204: subprocess arguments are from CLI flags, intentional passthrough behavior
	cmd := exec.CommandContext(context.WithoutCancel(ctx), "dotnet", spec.Args...)
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

func (c *RunCommand) runDocker(ctx context.Context, result repocontext.Detection, args []string, flags runFlags) error {
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
		if !flags.detach {
			if removeErr := c.removeForegroundContainer(ctx, client, containerID); removeErr != nil {
				return errors.Join(fmt.Errorf("inspect app container: %w", err), removeErr)
			}
		}
		return fmt.Errorf("inspect app container: %w", err)
	}
	c.printDockerRunInfo(info)

	if flags.detach {
		return nil
	}

	runErr := c.followContainer(ctx, client, containerID)
	removeErr := c.removeForegroundContainer(ctx, client, containerID)
	if removeErr != nil {
		if errors.Is(runErr, errAppRunStopped) {
			return removeErr
		}
		return errors.Join(runErr, removeErr)
	}
	return runErr
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
