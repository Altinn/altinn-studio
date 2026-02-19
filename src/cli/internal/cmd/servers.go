package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"

	serversvc "altinn.studio/studioctl/internal/cmd/servers"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

// ServersCommand implements the 'servers' subcommand.
type ServersCommand struct {
	out     *ui.Output
	service *serversvc.Service
}

// NewServersCommand creates a new servers command.
func NewServersCommand(cfg *config.Config, out *ui.Output) *ServersCommand {
	return &ServersCommand{
		out:     out,
		service: serversvc.NewService(),
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

	result := c.service.Down()
	for _, line := range result.MessageLines {
		c.out.Println(line)
	}

	return nil
}
