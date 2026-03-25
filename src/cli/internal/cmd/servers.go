package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"

	"altinn.studio/studioctl/internal/appmanager"
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
	return fmt.Sprintf(`Usage: %s servers <subcommand> [options]

Manage %s background servers.

Subcommands:
  up      Start all servers (app-manager)
  status  Show server status (app-manager)
  down    Stop all servers (app-manager)

Run '%s servers <subcommand> --help' for more information.
`, osutil.CurrentBin(), osutil.CurrentBin(), osutil.CurrentBin())
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
	if err := appmanager.Start(ctx, c.cfg); err != nil {
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

	processID, appManagerVersion, dotnetVersion, err := c.client.Status(ctx)
	if err != nil {
		if errors.Is(err, appmanager.ErrNotRunning) {
			c.out.Println("app-manager is not running.")
			return nil
		}
		return fmt.Errorf("get app-manager status: %w", err)
	}
	c.out.Println("app-manager is running.")
	c.out.Printf("Process ID: %d\n", processID)
	c.out.Println("app-manager version: " + appManagerVersion)
	c.out.Println(".NET version: " + dotnetVersion)

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

	if err := c.client.Shutdown(ctx); err != nil {
		if errors.Is(err, appmanager.ErrNotRunning) {
			c.out.Println("app-manager is not running.")
			return nil
		}
		return fmt.Errorf("shutdown app-manager: %w", err)
	}
	c.out.Println("app-manager shutdown requested.")

	return nil
}
