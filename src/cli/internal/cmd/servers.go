package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

// ServersCommand implements the 'servers' subcommand.
type ServersCommand struct {
	cfg *config.Config
	out *ui.Output
}

// NewServersCommand creates a new servers command.
func NewServersCommand(cfg *config.Config, out *ui.Output) *ServersCommand {
	return &ServersCommand{cfg: cfg, out: out}
}

// Name returns the command name.
func (c *ServersCommand) Name() string { return "servers" }

// Synopsis returns a short description.
func (c *ServersCommand) Synopsis() string { return "Manage studioctl servers" }

// Usage returns the full help text.
func (c *ServersCommand) Usage() string {
	return `Usage: studioctl servers <subcommand> [options]

Manage studioctl background servers.

Subcommands:
  down    Stop all servers (app-manager)

Run 'studioctl servers <subcommand> --help' for more information.
`
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
	case "down":
		return c.runDown(ctx, subArgs)
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.Usage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, subCmd)
	}
}

func (c *ServersCommand) runDown(_ context.Context, args []string) error {
	fs := flag.NewFlagSet("servers down", flag.ContinueOnError)
	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	// Placeholder: actual server management requires ServerManager
	c.out.Println("No servers running.")
	c.out.Println("")
	c.out.Println("The app-manager server will be implemented in Phase 5.")

	return nil
}
