package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"strconv"

	"altinn.studio/studioctl/internal/appmanager"
	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	serverspkg "altinn.studio/studioctl/internal/cmd/servers"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

const (
	serverStatusKeyWidth       = 19
	defaultServersLogTailLines = 100
	maxServersLogTailLines     = 10000
)

// ServersCommand implements the 'servers' subcommand.
type ServersCommand struct {
	cfg           *config.Config
	out           *ui.Output
	client        serversClient
	ensureStarted ensureStartedFunc
	shutdown      shutdownFunc
}

type serversClient interface {
	Health(ctx context.Context) error
	Status(ctx context.Context) (*appmanager.Status, error)
}

type ensureStartedFunc func(ctx context.Context, cfg *config.Config, loadBalancerPort string) error
type shutdownFunc func(ctx context.Context, cfg *config.Config) (<-chan error, error)

type serversUpOutput struct {
	Running    bool `json:"running"`
	Started    bool `json:"started"`
	JSONOutput bool `json:"-"`
}

type serversStatusOutput struct {
	Status     *appmanager.Status `json:"status,omitempty"`
	Running    bool               `json:"running"`
	JSONOutput bool               `json:"-"`
}

type serversDownOutput struct {
	ShutdownRequested bool `json:"shutdownRequested"`
	WasRunning        bool `json:"wasRunning"`
	JSONOutput        bool `json:"-"`
}

func (o serversUpOutput) Print(out *ui.Output) error {
	if o.JSONOutput {
		return printJSONOutput(out, "servers up", o)
	}
	if o.Started {
		out.Println("app-manager started.")
		return nil
	}
	out.Println("app-manager is already running.")
	return nil
}

func (o serversStatusOutput) Print(out *ui.Output) error {
	if o.Status != nil && o.Status.Apps == nil {
		o.Status.Apps = make([]appmanager.DiscoveredApp, 0)
	}
	if o.JSONOutput {
		return printJSONOutput(out, "servers status", o)
	}
	if !o.Running {
		out.Println("app-manager is not running.")
		return nil
	}
	out.Println("app-manager is running.")
	out.Println("")

	table := ui.NewTable(
		ui.NewColumn("").WithMinWidth(serverStatusKeyWidth).WithStyle(ui.CellStyleDim),
		ui.NewColumn(""),
	).Indent(2)
	table.Row(ui.Text("Process ID"), ui.Text(strconv.Itoa(o.Status.ProcessID)))
	table.Row(ui.Text("app-manager version"), ui.Text(o.Status.AppManagerVersion))
	table.Row(ui.Text(".NET version"), ui.Text(o.Status.DotnetVersion))
	if o.Status.Tunnel.Enabled {
		state := "disconnected"
		if o.Status.Tunnel.Connected {
			state = "connected"
		}
		table.Row(ui.Text("tunnel"), ui.Text(state))
		table.Row(ui.Text("tunnel url"), ui.Text(o.Status.Tunnel.URL))
	} else {
		table.Row(ui.Text("tunnel"), ui.Text("disabled"))
	}
	table.Row(ui.Text("discovered apps"), ui.Text(strconv.Itoa(len(o.Status.Apps))))
	out.RenderTable(table)
	return nil
}

func (o serversDownOutput) Print(out *ui.Output) error {
	if o.JSONOutput {
		return printJSONOutput(out, "servers down", o)
	}
	if !o.WasRunning {
		out.Println("app-manager is not running.")
		return nil
	}
	out.Println("app-manager shutdown requested.")
	return nil
}

// NewServersCommand creates a new servers command.
func NewServersCommand(cfg *config.Config, out *ui.Output) *ServersCommand {
	return &ServersCommand{
		cfg:           cfg,
		out:           out,
		client:        appmanager.NewClient(cfg),
		ensureStarted: appmanager.EnsureStarted,
		shutdown:      appmanager.Shutdown,
	}
}

// Name returns the command name.
func (c *ServersCommand) Name() string { return "servers" }

// Synopsis returns a short description.
func (c *ServersCommand) Synopsis() string {
	return fmt.Sprintf("Manage %s servers", osutil.CurrentBin())
}

// Usage returns the full help text.
func (c *ServersCommand) Usage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s servers <subcommand> [options]", osutil.CurrentBin()),
		"",
		fmt.Sprintf("Manage %s background servers.", osutil.CurrentBin()),
		"",
		"Subcommands:",
		"  up      Start all servers (app-manager)",
		"  status  Show server status (app-manager)",
		"  down    Stop all servers (app-manager)",
		"  logs    Stream server logs (app-manager)",
		"",
		"Options for 'servers logs':",
		"  -f, --follow  Follow log output (default: true)",
		"  --tail        Number of log lines to show (default: 100)",
		"  --json        Output as newline-delimited JSON",
		"",
		fmt.Sprintf("Run '%s servers <subcommand> --help' for more information.", osutil.CurrentBin()),
	)
}

// Run executes the command.
func (c *ServersCommand) Run(ctx context.Context, args []string) error {
	if len(args) == 0 {
		c.out.Print(c.Usage())
		return nil
	}

	subCmd := args[0]
	subArgs := args[1:]

	switch subCmd {
	case "up":
		return c.runUp(ctx, subArgs)
	case "status":
		return c.runStatus(ctx, subArgs)
	case "down":
		return c.runDown(ctx, subArgs)
	case "logs":
		return c.runLogs(ctx, subArgs)
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.Usage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, subCmd)
	}
}

func (c *ServersCommand) runUp(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("servers up", flag.ContinueOnError)
	var jsonOutput bool
	fs.BoolVar(&jsonOutput, "json", false, "Output as JSON")
	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	wasRunning := c.client.Health(ctx) == nil
	if err := c.startAppManager(ctx); err != nil {
		return fmt.Errorf("start app-manager: %w", err)
	}
	return serversUpOutput{Running: true, Started: !wasRunning, JSONOutput: jsonOutput}.Print(c.out)
}

func (c *ServersCommand) runStatus(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("servers status", flag.ContinueOnError)
	var jsonOutput bool
	fs.BoolVar(&jsonOutput, "json", false, "Output as JSON")
	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	status, err := c.client.Status(ctx)
	if err != nil {
		if errors.Is(err, appmanager.ErrNotRunning) {
			return serversStatusOutput{Status: nil, Running: false, JSONOutput: jsonOutput}.Print(c.out)
		}
		return fmt.Errorf("get app-manager status: %w", err)
	}
	return serversStatusOutput{Running: true, Status: status, JSONOutput: jsonOutput}.Print(c.out)
}

func (c *ServersCommand) runDown(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("servers down", flag.ContinueOnError)
	var jsonOutput bool
	fs.BoolVar(&jsonOutput, "json", false, "Output as JSON")
	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	done, err := c.stopAppManager(ctx)
	if err != nil {
		if errors.Is(err, appmanager.ErrNotRunning) {
			return serversDownOutput{
				WasRunning:        false,
				ShutdownRequested: false,
				JSONOutput:        jsonOutput,
			}.Print(c.out)
		}
		return fmt.Errorf("shutdown app-manager: %w", err)
	}

	select {
	case err := <-done:
		if err != nil {
			return fmt.Errorf("shutdown app-manager: %w", err)
		}
	case <-ctx.Done():
		return fmt.Errorf("shutdown app-manager: %w", ctx.Err())
	}

	return serversDownOutput{
		WasRunning:        true,
		ShutdownRequested: true,
		JSONOutput:        jsonOutput,
	}.Print(c.out)
}

func (c *ServersCommand) runLogs(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("servers logs", flag.ContinueOnError)
	var follow bool
	var jsonOutput bool
	var tail int
	fs.BoolVar(&follow, "f", true, "Follow log output")
	fs.BoolVar(&follow, "follow", true, "Follow log output")
	fs.BoolVar(&jsonOutput, "json", false, "Output as newline-delimited JSON")
	fs.IntVar(&tail, "tail", defaultServersLogTailLines, "Number of log lines to show")
	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}
	if tail < 0 {
		return fmt.Errorf("%w: --tail must be greater than or equal to 0", ErrInvalidFlagValue)
	}
	if tail > maxServersLogTailLines {
		return fmt.Errorf("%w: --tail must be less than or equal to %d", ErrInvalidFlagValue, maxServersLogTailLines)
	}

	return c.streamAppManagerLogs(ctx, tail, follow, jsonOutput)
}

func (c *ServersCommand) streamAppManagerLogs(
	ctx context.Context,
	tail int,
	follow bool,
	jsonOutput bool,
) error {
	if err := serverspkg.StreamLogs(ctx, c.cfg.AppManagerLogDir(), c.out, serverspkg.LogOptions{
		Tail:   tail,
		Follow: follow,
		JSON:   jsonOutput,
	}); err != nil {
		return fmt.Errorf("servers logs: %w", err)
	}
	return nil
}

func (c *ServersCommand) startAppManager(ctx context.Context) error {
	ensureStarted := c.ensureStarted
	if ensureStarted == nil {
		ensureStarted = appmanager.EnsureStarted
	}
	return ensureStarted(ctx, c.cfg, envlocaltest.DefaultLoadBalancerPortString())
}

func (c *ServersCommand) stopAppManager(ctx context.Context) (<-chan error, error) {
	shutdown := c.shutdown
	if shutdown == nil {
		shutdown = appmanager.Shutdown
	}
	return shutdown(ctx, c.cfg)
}
