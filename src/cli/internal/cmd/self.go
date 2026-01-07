package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/install"
	"altinn.studio/studioctl/internal/selfinstall"
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
  install   Install studioctl to a standard location
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
	case "install":
		return c.runInstall(ctx, subArgs)
	case "update":
		return c.runUpdate(ctx, subArgs)
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.Usage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, subCmd)
	}
}

func (c *SelfCommand) runInstall(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("self install", flag.ContinueOnError)
	fs.Usage = func() {
		c.out.Print(`Usage: studioctl self install [options]

Install studioctl binary to PATH and download localtest resources.

Options:
  --path DIR          Install binary to specific directory (non-interactive)
  --skip-resources    Skip downloading localtest resources
  -h, --help          Show this help message

If --path is not specified, an interactive picker will prompt you to
choose from detected installation locations.
`)
	}

	var targetPath string
	var skipResources bool
	fs.StringVar(&targetPath, "path", "", "Install to specific directory")
	fs.BoolVar(&skipResources, "skip-resources", false, "Skip downloading localtest resources")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	// Detect candidate directories
	candidates := selfinstall.DetectCandidates(c.out)

	// If --path not specified, use interactive picker
	if targetPath == "" {
		selected, err := c.pickInstallLocation(ctx, candidates)
		if err != nil {
			return err
		}
		if selected == "" {
			// User skipped
			return nil
		}
		targetPath = selected
	}

	return c.performInstall(ctx, targetPath, candidates, skipResources)
}

func (c *SelfCommand) pickInstallLocation(ctx context.Context, candidates []selfinstall.Candidate) (string, error) {
	if len(candidates) == 0 {
		return "", c.handleNoWritableLocations()
	}

	picker := selfinstall.NewPicker(c.out, candidates)
	selected, err := picker.Run(ctx)
	if err != nil {
		if errors.Is(err, selfinstall.ErrSkipped) {
			c.out.Println("")
			c.out.Println("Installation skipped.")
			c.out.Println("You can manually move the studioctl binary to a directory in your PATH.")
			return "", nil
		}
		return "", fmt.Errorf("select install location: %w", err)
	}
	return selected, nil
}

func (c *SelfCommand) performInstall(
	ctx context.Context,
	targetPath string,
	candidates []selfinstall.Candidate,
	skipResources bool,
) error {
	c.out.Printf("Installing binary to %s...\n", targetPath)

	installedPath, err := selfinstall.Install(targetPath)
	if err != nil {
		if errors.Is(err, selfinstall.ErrAlreadyInstalled) {
			c.out.Success("studioctl is already installed at this location.")
		} else {
			return fmt.Errorf("install binary: %w", err)
		}
	} else {
		c.out.Successf("Binary installed to %s", installedPath)
	}

	// Check if the directory is in PATH
	if !c.isInPath(targetPath, candidates) {
		c.out.Println("")
		c.out.Warning("This directory is not in your PATH.")
		c.out.Println("")
		c.out.Println(selfinstall.PathInstructions(targetPath))
	}

	// Install resources unless skipped
	if !skipResources {
		if err := c.installResources(ctx); err != nil {
			return err
		}
	}

	return nil
}

func (c *SelfCommand) handleNoWritableLocations() error {
	c.out.Error("No writable installation locations found.")
	c.out.Println("")
	c.out.Println("You can manually install studioctl by copying it to a directory in your PATH.")
	c.out.Println("Common locations include:")
	c.out.Println("  - ~/.local/bin (Linux/macOS)")
	c.out.Println("  - /usr/local/bin (requires sudo)")
	return selfinstall.ErrNoWritableLocation
}

func (c *SelfCommand) isInPath(dir string, candidates []selfinstall.Candidate) bool {
	for _, cand := range candidates {
		if cand.Path == dir {
			return cand.InPath
		}
	}
	return false
}

func (c *SelfCommand) installResources(ctx context.Context) error {
	c.out.Println("")

	// Check if already installed
	if install.IsInstalled(c.cfg.DataDir, c.cfg.Version) {
		c.out.Success("Localtest resources already installed.")
		return nil
	}

	spinner := ui.NewSpinner(c.out, "Installing localtest resources...")
	if !c.cfg.Verbose {
		spinner.Start()
	}

	opts := install.Options{
		DataDir: c.cfg.DataDir,
		Version: c.cfg.Version,
		Force:   false,
	}

	if err := install.Install(ctx, opts); err != nil {
		spinner.StopWithError("Failed to install resources")
		return fmt.Errorf("install resources: %w", err)
	}

	spinner.StopWithSuccess("Localtest resources installed")
	c.out.Verbosef("Installed to: %s", c.cfg.DataDir)

	// Persist default config file
	if err := config.Install(c.cfg.Home, false); err != nil {
		c.out.Warningf("Failed to create config: %v", err)
	} else {
		c.out.Verbosef("Config installed to: %s", c.cfg.Home)
	}

	return nil
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
