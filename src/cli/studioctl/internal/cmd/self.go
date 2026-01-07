package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

// SelfCommand implements the 'self' subcommand.
type SelfCommand struct {
	cfg *config.Config
	out *ui.Output
}

// NewSelfCommand creates a new self command.
func NewSelfCommand(cfg *config.Config, out *ui.Output) *SelfCommand {
	return &SelfCommand{cfg: cfg, out: out}
}

// Name returns the command name.
func (c *SelfCommand) Name() string { return "self" }

// Synopsis returns a short description.
func (c *SelfCommand) Synopsis() string { return "Manage studioctl itself" }

// Usage returns the full help text.
func (c *SelfCommand) Usage() string {
	return `Usage: studioctl self <subcommand> [options]

Manage the studioctl installation.

Subcommands:
  update    Check for and install updates

Run 'studioctl self <subcommand> --help' for more information.
`
}

// Run executes the command.
func (c *SelfCommand) Run(ctx context.Context, args []string) error {
	if len(args) == 0 {
		c.out.Print(c.Usage())
		return nil
	}

	subCmd := args[0]
	subArgs := args[1:]

	switch subCmd {
	case "update":
		return c.runUpdate(ctx, subArgs)
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.Usage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, subCmd)
	}
}

func (c *SelfCommand) runUpdate(_ context.Context, args []string) error {
	fs := flag.NewFlagSet("self update", flag.ContinueOnError)
	var preview bool
	fs.BoolVar(&preview, "preview", false, "Include preview releases")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	c.out.Printf("Current version: %s\n", c.cfg.Version)
	c.out.Println("")

	// Placeholder: actual update logic would use ReleaseClient
	c.out.Println("Self-update not yet implemented.")
	c.out.Println("Download latest release from: https://github.com/Altinn/altinn-studio/releases")

	return nil
}
