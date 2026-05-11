package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"strconv"

	serverpkg "altinn.studio/studioctl/internal/cmd/server"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
)

const (
	serverStatusKeyWidth      = 19
	defaultServerLogTailLines = 100
	maxServerLogTailLines     = 10000
)

// ServerCommand implements the 'server' subcommand.
type ServerCommand struct {
	cfg           *config.Config
	out           *ui.Output
	client        serverClient
	ensureStarted ensureStartedFunc
	shutdown      shutdownFunc
}

type serverClient interface {
	Status(ctx context.Context) (*studioctlserver.Status, error)
}

type ensureStartedFunc func(ctx context.Context, cfg *config.Config, loadBalancerPort string) error
type shutdownFunc func(ctx context.Context, cfg *config.Config) (<-chan error, error)

type serverUpOutput struct {
	Running    bool `json:"running"`
	Started    bool `json:"started"`
	JSONOutput bool `json:"-"`
}

type serverStatusOutput struct {
	Status     *studioctlserver.Status `json:"status,omitempty"`
	Running    bool                    `json:"running"`
	JSONOutput bool                    `json:"-"`
}

type serverDownOutput struct {
	ShutdownRequested bool `json:"shutdownRequested"`
	WasRunning        bool `json:"wasRunning"`
	JSONOutput        bool `json:"-"`
}

func (o serverUpOutput) Print(out *ui.Output) error {
	if o.JSONOutput {
		return printJSONOutput(out, "server up", o)
	}
	if o.Started {
		out.Println("studioctl-server started.")
		return nil
	}
	out.Println("studioctl-server is already running.")
	return nil
}

func (o serverStatusOutput) Print(out *ui.Output) error {
	if o.Status != nil && o.Status.Apps == nil {
		o.Status.Apps = make([]studioctlserver.DiscoveredApp, 0)
	}
	if o.JSONOutput {
		return printJSONOutput(out, "server status", o)
	}
	if !o.Running {
		out.Println("studioctl-server is not running.")
		return nil
	}
	out.Println("studioctl-server is running.")
	out.Println("")

	table := ui.NewTable(
		ui.NewColumn("").WithMinWidth(serverStatusKeyWidth).WithStyle(ui.CellStyleDim),
		ui.NewColumn(""),
	).Indent(2)
	table.Row(ui.Text("Process ID"), ui.Text(strconv.Itoa(o.Status.ProcessID)))
	table.Row(ui.Text("studioctl-server version"), ui.Text(o.Status.StudioctlServerVersion))
	table.Row(ui.Text(".NET version"), ui.Text(o.Status.DotnetVersion))
	if o.Status.HostBridge.Enabled {
		state := "disconnected"
		if o.Status.HostBridge.Connected {
			state = "connected"
		}
		table.Row(ui.Text("host bridge"), ui.Text(state))
		table.Row(ui.Text("host bridge url"), ui.Text(o.Status.HostBridge.URL))
	} else {
		table.Row(ui.Text("host bridge"), ui.Text("disabled"))
	}
	table.Row(ui.Text("discovered apps"), ui.Text(strconv.Itoa(len(o.Status.Apps))))
	out.RenderTable(table)
	return nil
}

func (o serverDownOutput) Print(out *ui.Output) error {
	if o.JSONOutput {
		return printJSONOutput(out, "server down", o)
	}
	if !o.WasRunning {
		out.Println("studioctl-server is not running.")
		return nil
	}
	out.Println("studioctl-server shutdown requested.")
	return nil
}

// NewServerCommand creates a new server command.
func NewServerCommand(cfg *config.Config, out *ui.Output) *ServerCommand {
	return &ServerCommand{
		cfg:           cfg,
		out:           out,
		client:        studioctlserver.NewClient(cfg),
		ensureStarted: studioctlserver.EnsureStarted,
		shutdown:      studioctlserver.Shutdown,
	}
}

// Name returns the command name.
func (c *ServerCommand) Name() string { return "server" }

// Synopsis returns a short description.
func (c *ServerCommand) Synopsis() string {
	return fmt.Sprintf("Manage the %s server", osutil.CurrentBin())
}

// Usage returns the full help text.
func (c *ServerCommand) Usage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s server <subcommand> [options]", osutil.CurrentBin()),
		"",
		fmt.Sprintf("Manage the %s background server.", osutil.CurrentBin()),
		"",
		"Subcommands:",
		"  up      Start the server (studioctl-server)",
		"  status  Show server status (studioctl-server)",
		"  down    Stop the server (studioctl-server)",
		"  logs    Stream server logs (studioctl-server)",
		"",
		"Options for 'server logs':",
		"  -f, --follow  Follow log output (default: false)",
		"  --tail        Number of log lines to show (default: 100)",
		"  --json        Output as newline-delimited JSON",
		"",
		fmt.Sprintf("Run '%s server <subcommand> --help' for more information.", osutil.CurrentBin()),
	)
}

// Run executes the command.
func (c *ServerCommand) Run(ctx context.Context, args []string) error {
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

func (c *ServerCommand) runUp(ctx context.Context, args []string) error {
	jsonOutput, help, err := parseServerJSONFlag("server up", args)
	if err != nil {
		return err
	}
	if help {
		return nil
	}

	before, beforeErr := c.client.Status(ctx)
	if beforeErr != nil && !errors.Is(beforeErr, studioctlserver.ErrNotRunning) {
		return fmt.Errorf("get studioctl-server status before start: %w", beforeErr)
	}
	if err := c.startStudioctlServer(ctx); err != nil {
		return fmt.Errorf("start studioctl-server: %w", err)
	}
	after, afterErr := c.client.Status(ctx)
	if afterErr != nil {
		return fmt.Errorf("get studioctl-server status after start: %w", afterErr)
	}

	return serverUpOutput{
		Running:    true,
		Started:    serverStarted(before, after),
		JSONOutput: jsonOutput,
	}.Print(c.out)
}

func serverStarted(before, after *studioctlserver.Status) bool {
	return before == nil || before.ProcessID != after.ProcessID
}

func (c *ServerCommand) runStatus(ctx context.Context, args []string) error {
	jsonOutput, help, err := parseServerJSONFlag("server status", args)
	if err != nil {
		return err
	}
	if help {
		return nil
	}

	status, err := c.client.Status(ctx)
	if err != nil {
		if errors.Is(err, studioctlserver.ErrNotRunning) {
			return serverStatusOutput{Status: nil, Running: false, JSONOutput: jsonOutput}.Print(c.out)
		}
		return fmt.Errorf("get studioctl-server status: %w", err)
	}
	return serverStatusOutput{Running: true, Status: status, JSONOutput: jsonOutput}.Print(c.out)
}

func (c *ServerCommand) runDown(ctx context.Context, args []string) error {
	jsonOutput, help, err := parseServerJSONFlag("server down", args)
	if err != nil {
		return err
	}
	if help {
		return nil
	}

	done, err := c.stopStudioctlServer(ctx)
	if err != nil {
		if errors.Is(err, studioctlserver.ErrNotRunning) {
			return serverDownOutput{
				WasRunning:        false,
				ShutdownRequested: false,
				JSONOutput:        jsonOutput,
			}.Print(c.out)
		}
		return fmt.Errorf("shutdown studioctl-server: %w", err)
	}

	select {
	case err := <-done:
		if err != nil {
			return fmt.Errorf("shutdown studioctl-server: %w", err)
		}
	case <-ctx.Done():
		return fmt.Errorf("shutdown studioctl-server: %w", ctx.Err())
	}

	return serverDownOutput{
		WasRunning:        true,
		ShutdownRequested: true,
		JSONOutput:        jsonOutput,
	}.Print(c.out)
}

func parseServerJSONFlag(commandPath string, args []string) (jsonOutput bool, help bool, err error) {
	fs := flag.NewFlagSet(commandPath, flag.ContinueOnError)
	fs.BoolVar(&jsonOutput, "json", false, "Output as JSON")
	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return false, true, nil
		}
		return false, false, fmt.Errorf("parsing flags: %w", err)
	}
	return jsonOutput, false, nil
}

func (c *ServerCommand) runLogs(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("server logs", flag.ContinueOnError)
	var follow bool
	var jsonOutput bool
	var tail int
	fs.BoolVar(&follow, "f", defaultLogFollow, "Follow log output")
	fs.BoolVar(&follow, "follow", defaultLogFollow, "Follow log output")
	fs.BoolVar(&jsonOutput, "json", false, "Output as newline-delimited JSON")
	fs.IntVar(&tail, "tail", defaultServerLogTailLines, "Number of log lines to show")
	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}
	if tail < 0 {
		return fmt.Errorf("%w: --tail must be greater than or equal to 0", ErrInvalidFlagValue)
	}
	if tail > maxServerLogTailLines {
		return fmt.Errorf("%w: --tail must be less than or equal to %d", ErrInvalidFlagValue, maxServerLogTailLines)
	}

	return c.streamStudioctlServerLogs(ctx, tail, follow, jsonOutput)
}

func (c *ServerCommand) streamStudioctlServerLogs(
	ctx context.Context,
	tail int,
	follow bool,
	jsonOutput bool,
) error {
	if err := serverpkg.StreamLogs(ctx, c.cfg.StudioctlServerLogDir(), c.out, serverpkg.LogOptions{
		Tail:   tail,
		Follow: follow,
		JSON:   jsonOutput,
	}); err != nil {
		return fmt.Errorf("server logs: %w", err)
	}
	return nil
}

func (c *ServerCommand) startStudioctlServer(ctx context.Context) error {
	ensureStarted := c.ensureStarted
	if ensureStarted == nil {
		ensureStarted = studioctlserver.EnsureStarted
	}
	topology := envtopology.NewLocal(envtopology.DefaultIngressPortString())
	return ensureStarted(ctx, c.cfg, topology.IngressPort())
}

func (c *ServerCommand) stopStudioctlServer(ctx context.Context) (<-chan error, error) {
	shutdown := c.shutdown
	if shutdown == nil {
		shutdown = studioctlserver.Shutdown
	}
	return shutdown(ctx, c.cfg)
}
