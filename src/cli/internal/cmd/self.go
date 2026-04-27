package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"runtime"

	"altinn.studio/studioctl/internal/appmanager"
	selfsvc "altinn.studio/studioctl/internal/cmd/self"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

// SelfCommand implements the 'self' subcommand.
type SelfCommand struct {
	cfg     *config.Config
	out     *ui.Output
	service *selfsvc.Service
}

// NewSelfCommand creates a new self command.
func NewSelfCommand(cfg *config.Config, out *ui.Output) *SelfCommand {
	return &SelfCommand{
		cfg:     cfg,
		out:     out,
		service: selfsvc.NewService(cfg),
	}
}

// Name returns the command name.
func (c *SelfCommand) Name() string { return "self" }

// Synopsis returns a short description.
func (c *SelfCommand) Synopsis() string { return fmt.Sprintf("Manage %s itself", osutil.CurrentBin()) }

// Usage returns the full help text.
func (c *SelfCommand) Usage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s self <subcommand> [options]", osutil.CurrentBin()),
		"",
		fmt.Sprintf("Manage the %s installation.", osutil.CurrentBin()),
		"",
		"Subcommands:",
		"  install   Install binary, app-manager, and localtest resources",
		"  update    Check for and install updates",
		"  uninstall Remove installed binary",
		"",
		fmt.Sprintf("Run '%s self <subcommand> --help' for more information.", osutil.CurrentBin()),
	)
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
	case "uninstall":
		return c.runUninstall(subArgs)
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
		c.out.Print(joinLines(
			fmt.Sprintf("Usage: %s self install [options]", osutil.CurrentBin()),
			"",
			fmt.Sprintf("Install %s, app-manager, and localtest resources.", osutil.CurrentBin()),
			"",
			"Options:",
			"  --path DIR          Install binary to specific directory (non-interactive)",
			"  --skip-resources    Skip localtest resources",
			"  -h, --help          Show this help message",
			"",
			"If --path is not specified, an interactive picker will prompt you to",
			"choose from detected installation locations. If no terminal input is",
			"available, the recommended writable location is used automatically.",
		))
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

	candidates := c.service.DetectCandidates()

	if targetPath == "" {
		selected, err := c.resolveInstallLocation(ctx, candidates)
		if err != nil {
			return err
		}
		if selected == "" {
			return nil
		}
		targetPath = selected
	}

	return c.performInstall(ctx, targetPath, candidates, skipResources)
}

func (c *SelfCommand) resolveInstallLocation(
	ctx context.Context,
	candidates []selfsvc.Candidate,
) (string, error) {
	input, cleanup, err := ui.InteractiveInput()
	if err != nil {
		c.out.Verbosef("terminal input unavailable, using default install location: %v", err)
		return c.defaultInstallLocation(candidates)
	}
	defer func() {
		if cleanupErr := cleanup(); cleanupErr != nil {
			c.out.Verbosef("failed to close terminal input: %v", cleanupErr)
		}
	}()

	return c.pickInstallLocation(ctx, input, candidates)
}

func (c *SelfCommand) defaultInstallLocation(candidates []selfsvc.Candidate) (string, error) {
	target, ok := selfsvc.DefaultInstallLocation(candidates)
	if ok {
		return target, nil
	}

	return "", c.handleNoWritableLocations()
}

func (c *SelfCommand) pickInstallLocation(
	ctx context.Context,
	input io.Reader,
	candidates []selfsvc.Candidate,
) (string, error) {
	if len(candidates) == 0 {
		return "", c.handleNoWritableLocations()
	}

	picker := selfsvc.NewPicker(c.out, input, candidates)
	selected, err := picker.Run(ctx)
	if err != nil {
		if errors.Is(err, selfsvc.ErrSkipped) {
			c.out.Println("")
			c.out.Println("Installation skipped.")
			c.out.Printlnf("You can manually move the %s binary to a directory in your PATH.", osutil.CurrentBin())
			return "", nil
		}
		return "", fmt.Errorf("select install location: %w", err)
	}
	return selected, nil
}

func (c *SelfCommand) performInstall(
	ctx context.Context,
	targetPath string,
	candidates []selfsvc.Candidate,
	skipResources bool,
) error {
	c.out.Printlnf("Installing binary to %s...", targetPath)

	result, err := c.service.InstallBinary(targetPath)
	if err != nil {
		return fmt.Errorf("install binary: %w", err)
	}

	if result.AlreadyInstalled {
		c.out.Successf("%s is already installed at this location.", osutil.CurrentBin())
	} else {
		c.out.Successf("Binary installed to %s", result.InstalledPath)
	}

	if !c.service.IsInPath(targetPath, candidates) {
		c.out.Println("")
		c.out.Warning("This directory is not in your PATH.")
		c.out.Println("")
		c.out.Println(c.service.PathInstructions(targetPath))
	}

	if !skipResources {
		if err := c.installResources(ctx); err != nil {
			return err
		}
	}

	return c.installAppManager(ctx)
}

func (c *SelfCommand) handleNoWritableLocations() error {
	c.out.Error("No writable installation locations found.")
	c.out.Println("")
	c.out.Printlnf("You can manually install %s by copying it to a directory in your PATH.", osutil.CurrentBin())
	c.out.Println("Common locations include:")
	c.out.Println("  - ~/.local/bin (Linux/macOS)")
	c.out.Println("  - /usr/local/bin (requires sudo)")
	return selfsvc.ErrNoWritableLocation
}

func (c *SelfCommand) installResources(ctx context.Context) error {
	c.out.Println("")

	if c.service.ResourcesInstalled() {
		c.out.Success("Localtest resources already installed.")
		return nil
	}

	spinner := ui.NewSpinner(c.out, "Installing localtest resources...")
	if !c.cfg.Verbose {
		spinner.Start()
	}

	result, err := c.service.InstallResources(ctx)
	if err != nil {
		spinner.StopWithError("Failed to install resources")
		return fmt.Errorf("install resources: %w", err)
	}

	if result.AlreadyInstalled {
		spinner.Stop()
		c.out.Success("Localtest resources already installed.")
		return nil
	}

	spinner.StopWithSuccess("Localtest resources installed")
	c.out.Verbosef("Installed to: %s", c.cfg.DataDir)

	return nil
}

func (c *SelfCommand) installAppManager(ctx context.Context) error {
	c.out.Println("")

	wasRunning, err := c.stopAppManagerForReplacement(ctx)
	if err != nil {
		return err
	}

	spinner := ui.NewSpinner(c.out, "Installing app-manager...")
	if !c.cfg.Verbose {
		spinner.Start()
	}

	result, err := c.service.InstallAppManager(ctx)
	if err != nil {
		spinner.StopWithError("Failed to install app-manager")
		c.restartAppManagerAfterFailedReplacement(ctx, wasRunning, "")
		return fmt.Errorf("install app-manager: %w", err)
	}

	spinner.StopWithSuccess("App-manager installed")
	c.out.Verbosef("Installed to: %s", result.InstalledPath)

	return c.restartAppManagerIfNeeded(ctx, wasRunning, "")
}

func (c *SelfCommand) runUpdate(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("self update", flag.ContinueOnError)
	fs.Usage = func() {
		c.out.Print(joinLines(
			fmt.Sprintf("Usage: %s self update [options]", osutil.CurrentBin()),
			"",
			fmt.Sprintf("Update %s in-place.", osutil.CurrentBin()),
			"",
			"Options:",
			"  --version VERSION    Release version (vX.Y.Z or studioctl/vX.Y.Z, default: newest available)",
			"  --skip-checksum      Skip SHA256 checksum verification",
			"  -h, --help           Show this help message",
		))
	}

	var version string
	var skipChecksum bool
	fs.StringVar(&version, "version", "", "Release version")
	fs.BoolVar(&skipChecksum, "skip-checksum", false, "Skip SHA256 checksum verification")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	c.out.Printlnf("Current version: %s", c.cfg.Version)
	result, err := c.service.UpdateBinary(
		ctx,
		selfsvc.UpdateOptions{
			Version:      version,
			SkipChecksum: skipChecksum,
		},
	)
	if err != nil {
		return fmt.Errorf("self update: %w", err)
	}

	c.out.Verbosef("Updated binary path: %s", result.TargetPath)
	c.out.Verbosef("Release source: %s", result.ReleaseSource)
	c.out.Verbosef("Asset: %s", result.Asset)
	if err := c.updateAppManager(ctx, result.Version, result.TargetPath); err != nil {
		return fmt.Errorf("update app-manager: %w", err)
	}

	c.out.Successf("%s updated successfully.", osutil.CurrentBin())
	return nil
}

func (c *SelfCommand) updateAppManager(ctx context.Context, version, studioctlPath string) error {
	wasRunning, err := c.stopAppManagerForReplacement(ctx)
	if err != nil {
		return err
	}
	result, err := c.service.InstallAppManagerVersion(ctx, version)
	if err != nil {
		c.restartAppManagerAfterFailedReplacement(ctx, wasRunning, studioctlPath)
		return fmt.Errorf("install app-manager: %w", err)
	}
	c.out.Verbosef("Updated app-manager path: %s", result.InstalledPath)

	return c.restartAppManagerIfNeeded(ctx, wasRunning, studioctlPath)
}

func (c *SelfCommand) stopAppManagerForReplacement(ctx context.Context) (bool, error) {
	done, err := appmanager.Shutdown(ctx, c.cfg)
	if err != nil {
		if errors.Is(err, appmanager.ErrNotRunning) {
			return false, nil
		}
		return false, fmt.Errorf("stop existing app-manager before install: %w", err)
	}
	if done == nil {
		return false, nil
	}

	if shutdownErr := <-done; shutdownErr != nil {
		if errors.Is(shutdownErr, appmanager.ErrNotRunning) {
			return false, nil
		}
		return false, fmt.Errorf("stop existing app-manager before install: %w", shutdownErr)
	}

	return true, nil
}

func (c *SelfCommand) restartAppManagerAfterFailedReplacement(
	ctx context.Context,
	wasRunning bool,
	studioctlPath string,
) {
	if !wasRunning {
		return
	}
	if err := c.restartAppManager(ctx, studioctlPath); err != nil {
		c.out.Verbosef("failed to restart app-manager after failed install: %v", err)
	}
}

func (c *SelfCommand) restartAppManagerIfNeeded(ctx context.Context, wasRunning bool, studioctlPath string) error {
	if !wasRunning {
		return nil
	}
	if err := c.restartAppManager(ctx, studioctlPath); err != nil {
		return fmt.Errorf("restart app-manager: %w", err)
	}
	return nil
}

func (c *SelfCommand) restartAppManager(ctx context.Context, studioctlPath string) error {
	topology := envtopology.NewLocal(envtopology.DefaultIngressPortString())
	if studioctlPath == "" {
		if err := appmanager.EnsureStarted(
			ctx,
			c.cfg,
			topology.IngressPort(),
		); err != nil {
			return fmt.Errorf("ensure app-manager started: %w", err)
		}
		return nil
	}

	if err := appmanager.EnsureStartedWithStudioctlPath(
		ctx,
		c.cfg,
		topology.IngressPort(),
		studioctlPath,
	); err != nil {
		return fmt.Errorf("ensure app-manager started with studioctl path: %w", err)
	}
	return nil
}

func (c *SelfCommand) runUninstall(args []string) error {
	fs := flag.NewFlagSet("self uninstall", flag.ContinueOnError)
	fs.Usage = func() {
		c.out.Print(joinLines(
			fmt.Sprintf("Usage: %s self uninstall [options]", osutil.CurrentBin()),
			"",
			fmt.Sprintf("Remove the installed %s.", osutil.CurrentBin()),
			"",
			"Options:",
			"  -h, --help  Show this help message",
		))
	}

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	if runtime.GOOS == "windows" {
		c.out.Error("Self-uninstall while running is not supported on Windows.")
		c.out.Println("Run this after studioctl has exited:")
		c.out.Println(`  Remove-Item "<path-to-studioctl.exe>"`)
		return nil
	}

	result, err := c.service.UninstallBinary()
	if err != nil {
		return fmt.Errorf("self uninstall: %w", err)
	}

	c.out.Successf("Removed %s", result.RemovedPath)
	c.out.Println("Localtest resources and configuration were not removed.")
	return nil
}
