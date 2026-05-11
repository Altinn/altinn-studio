package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"

	containerruntime "altinn.studio/devenv/pkg/container"
	appsvc "altinn.studio/studioctl/internal/cmd/app"
	"altinn.studio/studioctl/internal/config"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
)

type containerClientFactory func(context.Context) (containerruntime.ContainerClient, error)
type stopProcessFunc func(context.Context, int) error

var (
	errAppContainerIDMissing = errors.New("app container id or name missing")
	errAppProcessIDMissing   = errors.New("app process id missing")
)

// StopCommand implements `studioctl stop` and `studioctl app stop`.
type StopCommand struct {
	out             *ui.Output
	server          studioctlServerAccess
	service         *appsvc.Service
	containerClient containerClientFactory
	stopProcess     stopProcessFunc
}

type appStopFlags struct {
	appPath    string
	all        bool
	jsonOutput bool
}

type stoppedAppOutput struct {
	AppID       string `json:"appId"`
	Mode        string `json:"mode"`
	URL         string `json:"url"`
	ContainerID string `json:"containerId,omitempty"`
	Name        string `json:"name,omitempty"`
	ProcessID   int    `json:"processId,omitempty"`
	HostPort    int    `json:"hostPort,omitempty"`
}

type appStopOutput struct {
	Stopped    []stoppedAppOutput `json:"stopped"`
	Running    bool               `json:"running"`
	JSONOutput bool               `json:"-"`
}

// NewStopCommand creates a new top-level stop alias command.
func NewStopCommand(cfg *config.Config, out *ui.Output) *StopCommand {
	return newStopCommand(cfg, out, appsvc.NewService(cfg.Home))
}

func newStopCommand(cfg *config.Config, out *ui.Output, service *appsvc.Service) *StopCommand {
	return &StopCommand{
		out:             out,
		server:          newStudioctlServerAccess(cfg),
		service:         service,
		containerClient: containerruntime.Detect,
		stopProcess: func(ctx context.Context, pid int) error {
			return osutil.StopProcess(ctx, pid, dotnetShutdownTimeout)
		},
	}
}

// Name returns the command name.
func (c *StopCommand) Name() string { return "stop" }

// Synopsis returns a short description.
func (c *StopCommand) Synopsis() string { return "Stop app (alias for 'app stop')" }

// Usage returns the top-level stop command usage.
func (c *StopCommand) Usage() string {
	return c.UsageFor("stop")
}

// UsageFor returns usage text for the supplied command path.
func (c *StopCommand) UsageFor(commandPath string) string {
	return joinLines(
		fmt.Sprintf("Usage: %s %s [-p PATH] [--all]", osutil.CurrentBin(), commandPath),
		"",
		"Stops detached Studio apps discovered by studioctl-server.",
		"",
		"Options:",
		"  -p, --path PATH       Specify app directory (overrides auto-detect)",
		"  --all                Stop all discovered app runs with stop handles",
		"  --json               Output as JSON",
		"  -h, --help           Show this help",
	)
}

// Run executes the top-level stop alias.
func (c *StopCommand) Run(ctx context.Context, args []string) error {
	return c.RunWithCommandPath(ctx, args, "stop")
}

// RunWithCommandPath executes stop with usage text bound to commandPath.
func (c *StopCommand) RunWithCommandPath(ctx context.Context, args []string, commandPath string) error {
	flags, help, err := c.parseStopFlags(args, commandPath)
	if err != nil {
		return err
	}
	if help {
		c.out.Print(c.UsageFor(commandPath))
		return nil
	}

	var appID string
	if !flags.all {
		target, err := c.service.ResolveRunTarget(ctx, flags.appPath)
		if err != nil {
			if errors.Is(err, repocontext.ErrAppNotFound) {
				return fmt.Errorf("%w: run from an app directory, use -p, or use --all", ErrNoAppFound)
			}
			return fmt.Errorf("resolve app: %w", err)
		}
		appID = target.AppID
	}

	return c.stopApps(ctx, appID, flags)
}

func (c *StopCommand) parseStopFlags(args []string, commandPath string) (appStopFlags, bool, error) {
	fs := flag.NewFlagSet(commandPath, flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	var flags appStopFlags
	fs.StringVar(&flags.appPath, "p", "", "App directory path")
	fs.StringVar(&flags.appPath, "path", "", "App directory path")
	fs.BoolVar(&flags.all, "all", false, "Stop all discovered app runs with stop handles")
	fs.BoolVar(&flags.jsonOutput, "json", false, "Output as JSON")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return flags, true, nil
		}
		return flags, false, fmt.Errorf("parsing flags: %w", err)
	}
	if flags.all && flags.appPath != "" {
		return flags, false, fmt.Errorf("%w: --all cannot be combined with --path", ErrInvalidFlagValue)
	}
	return flags, false, nil
}

func (c *StopCommand) stopApps(ctx context.Context, appID string, flags appStopFlags) error {
	if err := c.server.ensure(ctx); err != nil {
		return startStudioctlServerError(err)
	}

	status, err := c.server.client.Status(ctx)
	if err != nil {
		if errors.Is(err, studioctlserver.ErrNotRunning) {
			return appStopOutput{Stopped: nil, Running: false, JSONOutput: flags.jsonOutput}.Print(c.out)
		}
		return fmt.Errorf("get studioctl-server status: %w", err)
	}

	apps := sortDiscoveredApps(filterApps(status.Apps, appID, true))
	if len(apps) == 0 {
		return appStopOutput{Stopped: nil, Running: true, JSONOutput: flags.jsonOutput}.Print(c.out)
	}

	var containerClient containerruntime.ContainerClient
	defer func() {
		if containerClient != nil {
			if err := containerClient.Close(); err != nil {
				c.out.Verbosef("failed to close container client: %v", err)
			}
		}
	}()

	var stopped []stoppedAppOutput
	var stopErrors []error
	for _, app := range apps {
		output, err := c.stopApp(ctx, app, &containerClient)
		if err != nil {
			stopErrors = append(stopErrors, fmt.Errorf("%s: %w", app.AppID, err))
			continue
		}
		c.unregisterBestEffort(ctx, app)
		stopped = append(stopped, output)
	}

	if err := (appStopOutput{Running: true, Stopped: stopped, JSONOutput: flags.jsonOutput}).Print(c.out); err != nil {
		return err
	}
	return errors.Join(stopErrors...)
}

func (c *StopCommand) stopApp(
	ctx context.Context,
	app studioctlserver.DiscoveredApp,
	containerClient *containerruntime.ContainerClient,
) (stoppedAppOutput, error) {
	output := stoppedAppOutput{
		AppID:       app.AppID,
		Mode:        appMode(app),
		URL:         app.BaseURL,
		ContainerID: app.ContainerID,
		Name:        app.Name,
		ProcessID:   0,
		HostPort:    0,
	}
	if app.HostPort != nil {
		output.HostPort = *app.HostPort
	}

	stopMode := appStopMode(app)
	switch stopMode {
	case runModeProcess:
		pid := appProcessID(app)
		if pid <= 0 {
			return stoppedAppOutput{}, fmt.Errorf("%w: %s", errAppProcessIDMissing, app.AppID)
		}
		stopProcess := c.stopProcess
		if stopProcess == nil {
			stopProcess = func(ctx context.Context, pid int) error {
				return osutil.StopProcess(ctx, pid, dotnetShutdownTimeout)
			}
		}
		if err := stopProcess(ctx, pid); err != nil {
			return stoppedAppOutput{}, fmt.Errorf("stop app process %d: %w", pid, err)
		}
		output.ProcessID = pid
	case runModeContainer:
		if err := c.ensureContainerRuntime(ctx, containerClient); err != nil {
			return stoppedAppOutput{}, err
		}
		client := *containerClient
		nameOrID := app.ContainerID
		if nameOrID == "" {
			nameOrID = app.Name
		}
		if nameOrID == "" {
			return stoppedAppOutput{}, fmt.Errorf("%w: %s", errAppContainerIDMissing, app.AppID)
		}
		if err := client.ContainerStop(ctx, nameOrID, nil); err != nil &&
			!errors.Is(err, containerruntime.ErrContainerNotFound) {
			return stoppedAppOutput{}, fmt.Errorf("stop app container %s: %w", nameOrID, err)
		}
		if err := client.ContainerRemove(ctx, nameOrID, true); err != nil &&
			!errors.Is(err, containerruntime.ErrContainerNotFound) {
			return stoppedAppOutput{}, fmt.Errorf("remove app container %s: %w", nameOrID, err)
		}
	default:
		return stoppedAppOutput{}, fmt.Errorf("%w: %s", ErrUnsupportedRuntime, stopMode)
	}

	return output, nil
}

func (c *StopCommand) ensureContainerRuntime(
	ctx context.Context,
	containerClient *containerruntime.ContainerClient,
) error {
	if *containerClient != nil {
		return nil
	}

	containerClientFactory := c.containerClient
	if containerClientFactory == nil {
		containerClientFactory = containerruntime.Detect
	}
	client, err := containerClientFactory(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	*containerClient = client
	return nil
}

func (c *StopCommand) unregisterBestEffort(ctx context.Context, app studioctlserver.DiscoveredApp) {
	if err := c.server.client.UnregisterApp(ctx, app.AppID); err != nil {
		c.out.Verbosef("failed to unregister app %s from studioctl-server: %v", app.AppID, err)
	}
}

func (o appStopOutput) Print(out *ui.Output) error {
	if o.JSONOutput {
		return printJSONOutput(out, "app stop", o)
	}
	if !o.Running {
		out.Println("studioctl-server is not running.")
		return nil
	}
	if len(o.Stopped) == 0 {
		out.Println("No matching apps running.")
		return nil
	}
	for _, app := range o.Stopped {
		out.Printlnf("Stopped %s (%s).", app.AppID, app.Mode)
	}
	return nil
}
