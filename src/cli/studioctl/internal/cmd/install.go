package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/install"
	"altinn.studio/studioctl/internal/ui"
)

// InstallCommand implements the 'install' subcommand.
type InstallCommand struct {
	cfg *config.Config
	out *ui.Output
}

// NewInstallCommand creates a new install command.
func NewInstallCommand(cfg *config.Config, out *ui.Output) *InstallCommand {
	return &InstallCommand{cfg: cfg, out: out}
}

// Name returns the command name.
func (c *InstallCommand) Name() string { return "install" }

// Synopsis returns a short description.
func (c *InstallCommand) Synopsis() string { return "Install localtest resources" }

// Usage returns the full help text.
func (c *InstallCommand) Usage() string {
	return `Usage: studioctl install [options]

Install localtest resources to the studioctl data directory.

Resources include:
  - testdata/  Authorization, register, and profile data
  - infra/     Configuration files

If STUDIOCTL_RESOURCES_TARBALL is set, extracts from that local tarball.
Otherwise, downloads from GitHub releases matching the installed version.

Options:
  --force     Force reinstall even if already installed
  -h, --help  Show this help message
`
}

// Run executes the command.
func (c *InstallCommand) Run(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("install", flag.ContinueOnError)
	var force bool
	fs.BoolVar(&force, "force", false, "Force reinstall")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	// Log install source
	if tarball := os.Getenv(install.EnvResourcesTarball); tarball != "" {
		c.out.Verbosef("Installing from local tarball: %s", tarball)
	} else {
		c.out.Verbosef("Installing from GitHub release: %s", c.cfg.Version)
	}

	opts := install.Options{
		DataDir: c.cfg.DataDir,
		Version: c.cfg.Version,
		Force:   force,
	}

	// Check if already installed
	if !force && install.IsInstalled(c.cfg.DataDir, c.cfg.Version) {
		c.out.Println("Resources already installed.")
		c.out.Verbosef("Use --force to reinstall")
		return nil
	}

	spinner := ui.NewSpinner("Installing localtest resources...")
	if !c.cfg.Verbose {
		spinner.Start()
	}

	if err := install.Install(ctx, opts); err != nil {
		spinner.StopWithError("Failed to install resources")
		if errors.Is(err, install.ErrAlreadyInstalled) {
			c.out.Println("Resources already installed.")
			return nil
		}
		return fmt.Errorf("install resources: %w", err)
	}

	spinner.StopWithSuccess("Resources installed")
	c.out.Verbosef("Installed to: %s", c.cfg.DataDir)

	// Persist default config file if it doesn't exist or force is set
	if err := c.persistConfig(force); err != nil {
		c.out.Warningf("Failed to create config: %v", err)
	}

	return nil
}

// persistConfig writes the embedded config to the user's home directory.
func (c *InstallCommand) persistConfig(force bool) error {
	if err := config.Install(c.cfg.Home, force); err != nil {
		return fmt.Errorf("install config: %w", err)
	}
	c.out.Verbosef("Config installed to: %s", c.cfg.Home)
	return nil
}
