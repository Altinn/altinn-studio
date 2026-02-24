package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"

	shellsvc "altinn.studio/studioctl/internal/cmd/shell"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

var errUnexpectedAliasStatus = errors.New("unexpected alias result status")

// ShellCommand implements the 'shell' subcommand.
type ShellCommand struct {
	out     *ui.Output
	service *shellsvc.Service
}

// NewShellCommand creates a new shell command.
func NewShellCommand(_ *config.Config, out *ui.Output) *ShellCommand {
	return &ShellCommand{
		out:     out,
		service: shellsvc.NewService(),
	}
}

// Name returns the command name.
func (c *ShellCommand) Name() string { return "shell" }

// Synopsis returns a short description.
func (c *ShellCommand) Synopsis() string { return "Shell integration (alias, completions)" }

// Usage returns the full help text.
func (c *ShellCommand) Usage() string {
	return fmt.Sprintf(`Usage: %s shell <subcommand> [options]

Configure shell integration for %s.

Subcommands:
  alias    Configure a shell alias for %s

Run '%s shell <subcommand> --help' for more information.
`, osutil.CurrentBin(), osutil.CurrentBin(), osutil.CurrentBin(), osutil.CurrentBin())
}

// Run executes the command.
func (c *ShellCommand) Run(ctx context.Context, args []string) error {
	if len(args) == 0 {
		c.out.Print(c.Usage())
		return nil
	}

	subCmd := args[0]
	subArgs := args[1:]

	switch subCmd {
	case "alias":
		return c.runAlias(ctx, subArgs)
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.Usage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, subCmd)
	}
}

type aliasFlags struct {
	aliasName string
	shell     string
	dryRun    bool
}

func (c *ShellCommand) runAlias(ctx context.Context, args []string) error {
	flags, showHelp, err := c.parseAliasFlags(args)
	if err != nil {
		return err
	}
	if showHelp {
		c.out.Print(c.aliasUsage())
		return nil
	}

	result, err := c.service.ConfigureAlias(ctx, shellsvc.AliasOptions{
		AliasName: flags.aliasName,
		Shell:     flags.shell,
		DryRun:    flags.dryRun,
	})
	if err != nil {
		return fmt.Errorf("configure alias: %w", err)
	}

	return c.renderAliasResult(flags.aliasName, result)
}

func (c *ShellCommand) aliasUsage() string {
	return fmt.Sprintf(`Usage: %s shell alias [options]

Configure a shell alias for %s.

Options:
  -a, --alias NAME   Alias name (default: "s")
  -s, --shell SHELL  Shell type: bash, zsh, fish, powershell (auto-detected if not specified)
  --dry-run          Print what would be added without modifying files
  -h                 Show this help

Supported shells:
  bash        ~/.bashrc
  zsh         ~/.zshrc
  fish        ~/.config/fish/config.fish
  powershell  $PROFILE (Windows PowerShell profile)

Examples:
  %s shell alias              # Add 's' alias to detected shell
  %s shell alias -a studio    # Use 'studio' as alias name
  %s shell alias --dry-run    # Preview changes without modifying files
  %s shell alias -s zsh       # Force zsh shell type
`, osutil.CurrentBin(), osutil.CurrentBin(), osutil.CurrentBin(), osutil.CurrentBin(), osutil.CurrentBin(), osutil.CurrentBin())
}

func (c *ShellCommand) parseAliasFlags(args []string) (aliasFlags, bool, error) {
	fs := flag.NewFlagSet("shell alias", flag.ContinueOnError)
	f := aliasFlags{
		aliasName: "s",
		shell:     "",
		dryRun:    false,
	}

	fs.StringVar(&f.aliasName, "a", "s", "Alias name")
	fs.StringVar(&f.aliasName, "alias", "s", "Alias name")
	fs.StringVar(&f.shell, "s", "", "Shell type")
	fs.StringVar(&f.shell, "shell", "", "Shell type")
	fs.BoolVar(&f.dryRun, "dry-run", false, "Preview changes")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return f, true, nil
		}
		return f, false, fmt.Errorf("parsing flags: %w", err)
	}

	return f, false, nil
}

func (c *ShellCommand) renderAliasResult(aliasName string, result shellsvc.AliasResult) error {
	switch result.Status {
	case shellsvc.AliasStatusDryRun:
		c.out.Printf("Shell:       %s\n", result.Shell)
		c.out.Printf("Config file: %s\n", result.ConfigPath)
		c.out.Printf("Alias line:  %s\n", result.AliasLine)
		return nil
	case shellsvc.AliasStatusAlreadyConfigured:
		c.out.Success("Alias already configured in " + result.ConfigPath)
		return nil
	case shellsvc.AliasStatusConflict:
		c.out.Warning(fmt.Sprintf("Alias '%s' already exists with different value:", aliasName))
		c.out.Printf("  Existing: %s\n", result.ExistingLine)
		c.out.Printf("  New:      %s\n", result.AliasLine)
		c.out.Println("Remove the existing alias manually if you want to update it.")
		return nil
	case shellsvc.AliasStatusAdded:
		c.out.Success(fmt.Sprintf("Added alias '%s' to %s", aliasName, result.ConfigPath))
		c.out.Println("")
		c.out.Println("To use the alias, reload your shell configuration:")
		c.out.Printf("  %s\n", result.ReloadCommand)
		return nil
	default:
		return fmt.Errorf("%w: %q", errUnexpectedAliasStatus, result.Status)
	}
}
