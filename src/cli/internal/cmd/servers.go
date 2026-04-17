package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"

	"altinn.studio/studioctl/internal/appmanager"
	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

// ServersCommand implements the 'servers' subcommand.
type ServersCommand struct {
	cfg    *config.Config
	out    *ui.Output
	client *appmanager.Client
}

// NewServersCommand creates a new servers command.
func NewServersCommand(cfg *config.Config, out *ui.Output) *ServersCommand {
	return &ServersCommand{
		cfg:    cfg,
		out:    out,
		client: appmanager.NewClient(cfg),
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
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.Usage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, subCmd)
	}
}

func (c *ServersCommand) runUp(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("servers up", flag.ContinueOnError)
	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	if err := c.client.Health(ctx); err == nil {
		c.out.Println("app-manager is already running.")
		return nil
	}
	if err := appmanager.EnsureStarted(
		ctx,
		c.cfg,
		envlocaltest.DefaultLoadBalancerPortString(),
	); err != nil {
		return fmt.Errorf("start app-manager: %w", err)
	}
	c.out.Println("app-manager started.")

	return nil
}

func (c *ServersCommand) runStatus(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("servers status", flag.ContinueOnError)
	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	status, err := c.client.Status(ctx)
	if err != nil {
		if errors.Is(err, appmanager.ErrNotRunning) {
			c.out.Println("app-manager is not running.")
			return nil
		}
		return fmt.Errorf("get app-manager status: %w", err)
	}
	// TODO: table output. Should be refactored to be descriptive table subsequently rendered (columns are sometimes messed up)
	c.out.Println("app-manager is running.")
	c.out.Printlnf("Process ID: %d", status.ProcessID)
	c.out.Println("app-manager version: " + status.AppManagerVersion)
	c.out.Println(".NET version: " + status.DotnetVersion)
	if status.Tunnel.Enabled {
		state := "disconnected"
		if status.Tunnel.Connected {
			state = "connected"
		}
		c.out.Println("tunnel: " + state)
		c.out.Println("tunnel url: " + status.Tunnel.URL)
	} else {
		c.out.Println("tunnel: disabled")
	}
	c.out.Printlnf("discovered apps: %d", len(status.Apps))

	return nil
}

func (c *ServersCommand) runDown(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("servers down", flag.ContinueOnError)
	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	done, err := appmanager.Shutdown(ctx, c.cfg)
	if err != nil {
		if errors.Is(err, appmanager.ErrNotRunning) {
			c.out.Println("app-manager is not running.")
			return nil
		}
		return fmt.Errorf("shutdown app-manager: %w", err)
	}
	_ = done
	c.out.Println("app-manager shutdown requested.")

	return nil
}
