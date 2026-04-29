package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os/exec"
	"runtime"
	"strings"

	selfsvc "altinn.studio/studioctl/internal/cmd/self"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

const selfMigrateSubcmd = "__migrate"

// SelfCommand implements the 'self' subcommand.
type SelfCommand struct {
	cfg        *config.Config
	out        *ui.Output
	service    *selfsvc.Service
	transition *selfsvc.Transition
}

// NewSelfCommand creates a new self command.
func NewSelfCommand(cfg *config.Config, out *ui.Output) *SelfCommand {
	return &SelfCommand{
		cfg:        cfg,
		out:        out,
		service:    selfsvc.NewService(cfg),
		transition: selfsvc.NewTransition(cfg, out),
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
		return c.runUninstall(ctx, subArgs)
	case selfMigrateSubcmd:
		return c.runMigrate(ctx, subArgs)
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
	state, err := c.transition.Prepare(ctx)
	if err != nil {
		return fmt.Errorf("prepare install: %w", err)
	}
	installedStudioctlPath := ""
	restoreOnFailure := true
	defer func() {
		if restoreOnFailure {
			c.transition.Restore(ctx, state, installedStudioctlPath)
		}
	}()

	c.out.Printlnf("Installing binary to %s...", targetPath)

	result, err := c.service.InstallBinary(targetPath)
	if err != nil {
		return fmt.Errorf("install binary: %w", err)
	}
	installedStudioctlPath = result.InstalledPath

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

	if err := c.installAppManager(ctx); err != nil {
		return err
	}
	restoreOnFailure = false
	if err := c.runInstalledMigrations(ctx, installedStudioctlPath); err != nil {
		return fmt.Errorf("run install migrations: %w", err)
	}
	if err := c.transition.RestartIfNeeded(ctx, state, installedStudioctlPath); err != nil {
		return fmt.Errorf("restart after install: %w", err)
	}
	return nil
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

	spinner := ui.NewSpinner(c.out, "Installing app-manager...")
	if !c.cfg.Verbose {
		spinner.Start()
	}

	result, err := c.service.InstallAppManager(ctx)
	if err != nil {
		spinner.StopWithError("Failed to install app-manager")
		return fmt.Errorf("install app-manager: %w", err)
	}

	spinner.StopWithSuccess("App-manager installed")
	c.out.Verbosef("Installed to: %s", result.InstalledPath)
	return nil
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

	if runtime.GOOS == "windows" {
		return fmt.Errorf("%w: windows executable is locked while running", selfsvc.ErrUpdateUnsupported)
	}

	state, err := c.transition.Prepare(ctx)
	if err != nil {
		return fmt.Errorf("prepare update: %w", err)
	}
	updatedStudioctlPath := ""
	restoreOnFailure := true
	defer func() {
		if restoreOnFailure {
			c.transition.Restore(ctx, state, updatedStudioctlPath)
		}
	}()

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
	updatedStudioctlPath = result.TargetPath

	c.out.Verbosef("Updated binary path: %s", result.TargetPath)
	c.out.Verbosef("Release source: %s", result.ReleaseSource)
	c.out.Verbosef("Asset: %s", result.Asset)
	if err := c.updateAppManager(ctx, result.Version); err != nil {
		return fmt.Errorf("update app-manager: %w", err)
	}

	restoreOnFailure = false
	if err := c.runInstalledMigrations(ctx, result.TargetPath); err != nil {
		return fmt.Errorf("run update migrations: %w", err)
	}
	if err := c.transition.RestartIfNeeded(ctx, state, result.TargetPath); err != nil {
		return fmt.Errorf("restart after update: %w", err)
	}

	c.out.Successf("%s updated successfully.", osutil.CurrentBin())
	return nil
}

func (c *SelfCommand) updateAppManager(
	ctx context.Context,
	version string,
) error {
	result, err := c.service.InstallAppManagerVersion(ctx, version)
	if err != nil {
		return fmt.Errorf("install app-manager: %w", err)
	}
	c.out.Verbosef("Updated app-manager path: %s", result.InstalledPath)
	return nil
}

func (c *SelfCommand) runInstalledMigrations(ctx context.Context, studioctlPath string) error {
	args := c.migrationCommandArgs()
	c.out.Verbosef("Running migrations with: %s %v", studioctlPath, args)

	//nolint:gosec // G204: studioctlPath is the just-installed studioctl binary path.
	cmd := exec.CommandContext(ctx, studioctlPath, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		msg := strings.TrimSpace(string(output))
		if msg != "" {
			return fmt.Errorf("run installed studioctl migrations: %w: %s", err, msg)
		}
		return fmt.Errorf("run installed studioctl migrations: %w", err)
	}
	return nil
}

func (c *SelfCommand) migrationCommandArgs() []string {
	args := make([]string, 0, 7)
	if c.cfg.Home != "" {
		args = append(args, "--home", c.cfg.Home)
	}
	if c.cfg.SocketDir != "" {
		args = append(args, "--socket-dir", c.cfg.SocketDir)
	}
	if c.cfg.Verbose {
		args = append(args, "--verbose")
	}
	return append(args, "self", selfMigrateSubcmd)
}

func (c *SelfCommand) runMigrate(ctx context.Context, args []string) error {
	if len(args) != 0 {
		return fmt.Errorf("%w: %s", ErrInvalidFlagValue, strings.Join(args, " "))
	}
	if err := c.transition.RunMigrations(ctx); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}
	return nil
}

func (c *SelfCommand) runUninstall(ctx context.Context, args []string) error {
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

	state, err := c.transition.Prepare(ctx)
	if err != nil {
		return fmt.Errorf("prepare uninstall: %w", err)
	}
	removed := false
	defer func() {
		if !removed {
			c.transition.Restore(ctx, state, "")
		}
	}()

	if resetErr := c.transition.ResetEnvs(ctx); resetErr != nil {
		return fmt.Errorf("reset environments before uninstall: %w", resetErr)
	}
	if validateErr := c.service.ValidateHomeRemoval(); validateErr != nil {
		return fmt.Errorf("validate home directory removal: %w", validateErr)
	}

	removedHome, err := c.service.RemoveHome()
	if err != nil {
		return fmt.Errorf("remove home directory: %w", err)
	}

	result, err := c.service.UninstallBinary()
	if err != nil {
		return fmt.Errorf("self uninstall: %w", err)
	}
	removed = true

	c.out.Successf("Removed %s", result.RemovedPath)
	c.out.Successf("Removed %s", removedHome)
	return nil
}
