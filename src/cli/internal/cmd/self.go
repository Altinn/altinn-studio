package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"runtime"
	"strings"

	envtypes "altinn.studio/studioctl/internal/cmd/env"
	envregistry "altinn.studio/studioctl/internal/cmd/env/registry"
	selfcmd "altinn.studio/studioctl/internal/cmd/self"
	"altinn.studio/studioctl/internal/config"
	installpkg "altinn.studio/studioctl/internal/install"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

const (
	selfCompleteInstallSubcmd = "__complete-install"
	selfMigrateSubcmd         = "__migrate"
)

// SelfCommand implements the 'self' subcommand.
type SelfCommand struct {
	cfg              *config.Config
	out              *ui.Output
	service          *installpkg.Service
	transition       *selfcmd.Transition
	interactiveInput func() (io.Reader, func() error, error)
}

type applyBundleOptions struct {
	TargetDir  string
	Candidates []selfcmd.Candidate
	WarnPath   bool
}

// NewSelfCommand creates a new self command.
func NewSelfCommand(cfg *config.Config, out *ui.Output) *SelfCommand {
	return &SelfCommand{
		cfg:              cfg,
		out:              out,
		service:          installpkg.NewService(cfg, envInstallHooks(cfg, out)),
		transition:       selfcmd.NewTransition(cfg, out),
		interactiveInput: ui.InteractiveInput,
	}
}

func envInstallHooks(cfg *config.Config, out *ui.Output) func(context.Context) error {
	return func(ctx context.Context) error {
		envs, err := envregistry.Envs(
			envregistry.WithConfig(cfg),
			envregistry.WithOutput(out),
		)
		if err != nil {
			return fmt.Errorf("load environments: %w", err)
		}
		return runEnvInstallHooks(ctx, envs)
	}
}

func runEnvInstallHooks(ctx context.Context, envs []envtypes.Env) error {
	for _, env := range envs {
		installer, ok := env.(envtypes.Installer)
		if !ok {
			continue
		}
		if err := installer.OnInstall(ctx); err != nil {
			return fmt.Errorf("%s install hook: %w", env.Name(), err)
		}
	}
	return nil
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
	case selfCompleteInstallSubcmd, selfMigrateSubcmd:
		// __migrate is a preview.7 compatibility alias used by old updaters after replacing the binary.
		return c.runCompleteInstall(ctx, subArgs)
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
			"  -h, --help          Show this help message",
			"",
			"If --path is not specified, an interactive picker will prompt you to",
			"choose from detected installation locations. If no terminal input is",
			"available, the recommended writable location is used automatically.",
		))
	}

	var targetPath string
	fs.StringVar(&targetPath, "path", "", "Install to specific directory")
	// TODO: Remove --skip-resources after releases that passed it from install scripts are no longer supported.
	fs.Bool("skip-resources", false, "Deprecated no-op compatibility flag")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	candidates := selfcmd.DetectCandidates(nil)

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

	return c.performInstall(ctx, targetPath, candidates)
}

func (c *SelfCommand) resolveInstallLocation(
	ctx context.Context,
	candidates []selfcmd.Candidate,
) (string, error) {
	if dir, ok := selfcmd.ExistingInstallDir(); ok {
		c.out.Verbosef("using existing install location: %s", dir)
		return dir, nil
	}

	input, cleanup, err := c.interactiveInput()
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

func (c *SelfCommand) defaultInstallLocation(candidates []selfcmd.Candidate) (string, error) {
	target, ok := selfcmd.DefaultInstallLocation(candidates)
	if ok {
		return target, nil
	}

	return "", c.handleNoWritableLocations()
}

func (c *SelfCommand) pickInstallLocation(
	ctx context.Context,
	input io.Reader,
	candidates []selfcmd.Candidate,
) (string, error) {
	if len(candidates) == 0 {
		return "", c.handleNoWritableLocations()
	}

	picker := selfcmd.NewPicker(c.out, input, candidates)
	selected, err := picker.Run(ctx)
	if err != nil {
		return "", fmt.Errorf("select install location: %w", err)
	}
	return selected, nil
}

func (c *SelfCommand) performInstall(
	ctx context.Context,
	targetPath string,
	candidates []selfcmd.Candidate,
) error {
	bundle, err := c.service.CurrentBundle(os.Getenv(config.EnvResourcesArchive), targetPath)
	if err != nil {
		return fmt.Errorf("create install bundle: %w", err)
	}

	return c.applyBundle(ctx, bundle, applyBundleOptions{
		TargetDir:  targetPath,
		Candidates: candidates,
		WarnPath:   true,
	})
}

func (c *SelfCommand) applyBundle(
	ctx context.Context,
	bundle installpkg.Bundle,
	opts applyBundleOptions,
) error {
	state, err := c.transition.Prepare(ctx)
	if err != nil {
		return fmt.Errorf("prepare self operation: %w", err)
	}
	installedPath := ""
	restoreOnFailure := true
	defer func() {
		if restoreOnFailure {
			c.transition.Restore(ctx, state, installedPath)
		}
	}()

	result, err := c.service.InstallBundleBinary(bundle, installpkg.BinaryInstallOptions{
		BeforeInstallBinary: func(path string) {
			c.out.Printlnf("Installing binary to %s...", path)
		},
		AfterInstallBinary: func(result installpkg.BundleInstallResult) {
			if result.BinaryAlreadyInstalled {
				c.out.Successf("%s is already installed at this location.", osutil.CurrentBin())
			} else {
				c.out.Successf("Binary installed to %s", result.BinaryPath)
			}

			if opts.WarnPath && !selfcmd.LocationInPath(opts.TargetDir, opts.Candidates) {
				c.out.Println("")
				c.out.Warning("This directory is not in your PATH.")
				c.out.Println("")
				c.out.Println(selfcmd.LocationPathInstructions(opts.TargetDir))
			}
		},
	})
	installedPath = result.BinaryPath
	if err != nil {
		return fmt.Errorf("install binary: %w", err)
	}
	if err := c.runInstalledCompleteInstall(ctx, installedPath); err != nil {
		return fmt.Errorf("complete install: %w", err)
	}
	restoreOnFailure = false
	return nil
}

func (c *SelfCommand) handleNoWritableLocations() error {
	c.out.Error("No writable installation locations found.")
	c.out.Println("")
	c.out.Printlnf("You can manually install %s by copying it to a directory in your PATH.", osutil.CurrentBin())
	c.out.Println("Common locations include:")
	c.out.Println("  - ~/.local/bin (Linux/macOS)")
	c.out.Println("  - /usr/local/bin (requires sudo)")
	return selfcmd.ErrNoWritableInstallLocation
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
	resolved, err := c.service.ResolveUpdateBundle(
		ctx,
		installpkg.UpdateOptions{
			Version:      version,
			SkipChecksum: skipChecksum,
		},
	)
	if err != nil {
		return fmt.Errorf("resolve update bundle: %w", err)
	}
	if resolved.Cleanup != nil {
		defer func() {
			if cleanupErr := resolved.Cleanup(); cleanupErr != nil {
				c.out.Verbosef("failed to clean up update bundle: %v", cleanupErr)
			}
		}()
	}

	if err := c.applyBundle(ctx, resolved.Bundle, applyBundleOptions{
		TargetDir:  "",
		Candidates: nil,
		WarnPath:   false,
	}); err != nil {
		return fmt.Errorf("apply update bundle: %w", err)
	}

	c.out.Successf("%s updated successfully.", osutil.CurrentBin())
	return nil
}

func (c *SelfCommand) runInstalledCompleteInstall(ctx context.Context, studioctlPath string) error {
	args := c.installedSelfCommandArgs(selfCompleteInstallSubcmd)
	c.out.Verbosef("Completing installation with: %s %v", studioctlPath, args)

	c.out.Println("")
	resourcesSpinner := ui.NewSpinner(c.out, "Completing installation...")
	if !c.cfg.Verbose {
		resourcesSpinner.Start()
	}

	//nolint:gosec // G204: studioctlPath is the just-installed studioctl binary path.
	cmd := exec.CommandContext(ctx, studioctlPath, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		resourcesSpinner.StopWithError("Failed to complete installation")
		msg := strings.TrimSpace(string(output))
		if msg != "" {
			return fmt.Errorf("run installed studioctl install completion: %w: %s", err, msg)
		}
		return fmt.Errorf("run installed studioctl install completion: %w", err)
	}

	resourcesSpinner.StopWithSuccess("Installation completed")
	c.out.Verbosef("Installed app-manager to: %s", c.cfg.AppManagerInstallDir())
	c.out.Verbosef("Installed localtest resources to: %s", c.cfg.DataDir)
	return nil
}

func (c *SelfCommand) runCompleteInstall(ctx context.Context, args []string) error {
	if len(args) != 0 {
		return fmt.Errorf("%w: %s", ErrInvalidFlagValue, strings.Join(args, " "))
	}
	bundle := installpkg.Bundle{
		Version:              c.cfg.Version,
		BinaryPath:           "",
		ResourcesArchivePath: os.Getenv(config.EnvResourcesArchive),
	}
	if err := c.service.InstallBundleResources(ctx, bundle); err != nil {
		return fmt.Errorf("install resources: %w", err)
	}
	if err := c.transition.RunMigrations(ctx); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}
	return nil
}

func (c *SelfCommand) installedSelfCommandArgs(subcmd string) []string {
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
	return append(args, "self", subcmd)
}

type selfUninstallFlags struct {
	yes bool
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
			"  -y, --yes   Skip confirmation prompt",
			"  -h, --help  Show this help message",
		))
	}

	var flags selfUninstallFlags
	fs.BoolVar(&flags.yes, "y", false, "Skip confirmation prompt")
	fs.BoolVar(&flags.yes, "yes", false, "Skip confirmation prompt")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	if runtime.GOOS == osutil.OSWindows {
		c.out.Error("Self-uninstall while running is not supported on Windows.")
		c.out.Println("Run this after studioctl has exited:")
		c.out.Println(`  Remove-Item "<path-to-studioctl.exe>"`)
		return nil
	}

	if proceed, err := c.confirmUninstallIfNeeded(ctx, flags); err != nil {
		return err
	} else if !proceed {
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

func (c *SelfCommand) confirmUninstallIfNeeded(
	ctx context.Context,
	flags selfUninstallFlags,
) (bool, error) {
	if flags.yes {
		return true, nil
	}

	input, cleanup, err := c.interactiveInput()
	if err != nil {
		return false, fmt.Errorf(
			"%w: --yes is required when no terminal input is available",
			ErrInvalidFlagValue,
		)
	}
	defer func() {
		if cleanupErr := cleanup(); cleanupErr != nil {
			c.out.Verbosef("failed to close terminal input: %v", cleanupErr)
		}
	}()

	confirmed, err := ui.Confirm(
		ctx,
		c.out,
		input,
		fmt.Sprintf("Uninstall %s and delete local data? [y/N]: ", osutil.CurrentBin()),
	)
	if err != nil {
		return false, fmt.Errorf("confirm uninstall: %w", err)
	}
	if !confirmed {
		c.out.Println("Uninstall cancelled")
		return false, nil
	}

	return true, nil
}
