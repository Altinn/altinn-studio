package cmd

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"strings"

	containerruntime "altinn.studio/devenv/pkg/container"
	"altinn.studio/studioctl/internal/appcontainers"
	"altinn.studio/studioctl/internal/appimage"
	"altinn.studio/studioctl/internal/auth"
	appsvc "altinn.studio/studioctl/internal/cmd/app"
	"altinn.studio/studioctl/internal/config"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/studio"
	"altinn.studio/studioctl/internal/ui"
)

// AppCommand implements the 'app' subcommand.
type AppCommand struct {
	out     *ui.Output
	ps      *AppPsCommand
	run     *RunCommand
	stop    *StopCommand
	service *appsvc.Service
}

type appBuildOutput struct {
	ImageTag   string `json:"imageTag"`
	Pushed     bool   `json:"pushed"`
	JSONOutput bool   `json:"-"`
}

type appBuildFlags struct {
	appPath    string
	mode       string
	imageTag   string
	push       bool
	jsonOutput bool
}

func (o appBuildOutput) PrintImage(out *ui.Output) error {
	if o.JSONOutput {
		return nil
	}
	out.Printlnf("Image: %s", o.ImageTag)
	return nil
}

func (o appBuildOutput) PrintFinal(out *ui.Output) error {
	if o.JSONOutput {
		return printJSONOutput(out, "app build", o)
	}
	if o.Pushed {
		out.Printlnf("Pushed: %s", o.ImageTag)
	}
	return nil
}

// NewAppCommand creates a new app command.
func NewAppCommand(cfg *config.Config, out *ui.Output) *AppCommand {
	service := appsvc.NewService(cfg.Home)
	return &AppCommand{
		out:     out,
		ps:      newAppPsCommand(cfg, out, service),
		run:     newRunCommand(cfg, out, service),
		stop:    newStopCommand(cfg, out, service),
		service: service,
	}
}

// Name returns the command name.
func (c *AppCommand) Name() string { return "app" }

// Synopsis returns a short description.
func (c *AppCommand) Synopsis() string { return "Manage Altinn app" }

// Usage returns the full help text.
func (c *AppCommand) Usage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s app <subcommand> [options]", osutil.CurrentBin()),
		"",
		"Manage Altinn apps.",
		"",
		"Subcommands:",
		"  build     Build an app container image",
		"  clone     Clone an app repository from Altinn Studio",
		"  ps        List running apps",
		"  run       Run app locally",
		"  stop      Stop running apps",
		"  update    Update Altinn.App NuGet packages and frontend",
		"",
		fmt.Sprintf("Run '%s app <subcommand> --help' for more information.", osutil.CurrentBin()),
	)
}

// Run executes the command.
func (c *AppCommand) Run(ctx context.Context, args []string) error {
	if len(args) == 0 {
		c.out.Print(c.Usage())
		return nil
	}

	subCmd := args[0]
	subArgs := args[1:]

	switch subCmd {
	case "build":
		return c.runBuild(ctx, subArgs)
	case "clone":
		return c.runClone(ctx, subArgs)
	case "ps":
		return c.ps.RunWithCommandPath(ctx, subArgs, "app ps")
	case "run":
		return c.run.RunWithCommandPath(ctx, subArgs, "app run")
	case "stop":
		return c.stop.RunWithCommandPath(ctx, subArgs, "app stop")
	case "update":
		return c.runUpdate(ctx, subArgs)
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.Usage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, subCmd)
	}
}

func (c *AppCommand) runBuild(ctx context.Context, args []string) error {
	flags, help, err := c.parseAppBuildFlags(args)
	if err != nil {
		return err
	}
	if help {
		c.out.Print(c.appBuildUsage())
		return nil
	}

	result, err := c.service.ResolveTarget(ctx, flags.appPath)
	if err != nil {
		if errors.Is(err, repocontext.ErrAppNotFound) {
			return fmt.Errorf("%w: run from an app directory or use -p to specify path", ErrNoAppFound)
		}
		return fmt.Errorf("detect app: %w", err)
	}

	spec, err := appimage.BuildSpecForApp(result, flags.imageTag)
	if err != nil {
		return fmt.Errorf("build docker image spec: %w", err)
	}
	cleanupDockerfile, err := appimage.MaterializeDockerfile(&spec)
	if err != nil {
		return fmt.Errorf("materialize dockerfile: %w", err)
	}
	defer cleanupGeneratedDockerfile(c.out, cleanupDockerfile)

	client, err := containerruntime.Detect(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	defer func() {
		if cerr := client.Close(); cerr != nil {
			c.out.Verbosef("failed to close container client: %v", cerr)
		}
	}()

	c.out.Verbosef("Building app image %s", spec.ImageTag)
	if err := client.Build(ctx, spec.ContextPath, spec.Dockerfile, spec.ImageTag, spec.Build); err != nil {
		return fmt.Errorf("build app image: %w", err)
	}
	output := appBuildOutput{ImageTag: spec.ImageTag, Pushed: false, JSONOutput: flags.jsonOutput}
	if err := output.PrintImage(c.out); err != nil {
		return err
	}

	if flags.push {
		c.out.Verbosef("Pushing app image %s", spec.ImageTag)
		if err := client.Push(ctx, spec.ImageTag); err != nil {
			return fmt.Errorf("push app image: %w", err)
		}
		output.Pushed = true
	}

	return output.PrintFinal(c.out)
}

func (c *AppCommand) parseAppBuildFlags(args []string) (appBuildFlags, bool, error) {
	fs := flag.NewFlagSet("app build", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	var flags appBuildFlags
	fs.StringVar(&flags.appPath, "p", "", "App directory path")
	fs.StringVar(&flags.appPath, "path", "", "App directory path")
	fs.StringVar(&flags.mode, "m", runModeContainer, "Build mode")
	fs.StringVar(&flags.mode, "mode", runModeContainer, "Build mode")
	fs.StringVar(&flags.imageTag, "image-tag", "", "App container image tag")
	fs.BoolVar(&flags.push, "push", false, "Push app container image after build")
	fs.BoolVar(&flags.jsonOutput, "json", false, "Output as JSON")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return flags, true, nil
		}
		return flags, false, fmt.Errorf("parsing flags: %w", err)
	}
	if flags.mode != runModeContainer {
		return flags, false, fmt.Errorf("%w: %s", ErrUnsupportedRuntime, flags.mode)
	}
	if flags.push && flags.imageTag == "" {
		return flags, false, fmt.Errorf("%w: --push requires --image-tag", ErrInvalidFlagValue)
	}

	return flags, false, nil
}

func (c *AppCommand) appBuildUsage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s app build [-p PATH] [--image-tag IMAGE] [--push]", osutil.CurrentBin()),
		"",
		"Builds an Altinn app container image.",
		"",
		"Options:",
		"  -p, --path PATH       Specify app directory (overrides auto-detect)",
		"  -m, --mode MODE       Build mode: container (default: container)",
		"  --image-tag IMAGE     App container image tag",
		"  --push                Push app container image after build",
		"  --json                Output as JSON",
		"  -h, --help            Show this help",
	)
}

func (c *AppCommand) runUpdate(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("app update", flag.ContinueOnError)
	var appPath string
	var allowMajor bool
	fs.StringVar(&appPath, "p", "", "App directory path")
	fs.StringVar(&appPath, "path", "", "App directory path")
	fs.BoolVar(&allowMajor, "allow-major", false, "Allow major version updates")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	result, err := c.service.ResolveUpdateTarget(ctx, appPath)
	if err != nil {
		if errors.Is(err, repocontext.ErrAppNotFound) {
			return fmt.Errorf("%w: run from an app directory or use -p to specify path", ErrNoAppFound)
		}
		return fmt.Errorf("detect app: %w", err)
	}

	c.out.Printlnf("App found: %s", result.AppPath)
	c.out.Println("")

	c.out.Println("App update not yet implemented.")
	c.out.Println("")
	c.out.Println("To update manually:")
	c.out.Println("  1. Update NuGet packages in App/App.csproj")
	c.out.Println("  2. Run 'dotnet restore'")

	return nil
}

func (c *AppCommand) runClone(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("app clone", flag.ContinueOnError)
	var env string
	fs.StringVar(&env, "env", auth.DefaultEnv, "Environment name (prod, dev, staging)")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	remaining := fs.Args()
	if len(remaining) == 0 {
		return fmt.Errorf(
			"%w: usage: %s app clone [--env ENV] <org>/<repo> [destination]",
			ErrMissingArgument,
			osutil.CurrentBin(),
		)
	}

	repoArg := remaining[0]
	org, repo, parseErr := parseOrgRepo(repoArg)
	if parseErr != nil {
		return parseErr
	}

	dest := repo
	if len(remaining) > 1 {
		dest = remaining[1]
	}

	host, err := c.service.ResolveHost(env)
	if err != nil {
		if errors.Is(err, appsvc.ErrNotLoggedIn) {
			return fmt.Errorf("%w: %s (run '%s auth login --env %s')", ErrNotLoggedIn, env, osutil.CurrentBin(), env)
		}
		return fmt.Errorf("resolve host: %w", err)
	}

	c.out.Verbosef("Cloning %s/%s from %s...", org, repo, host)

	result, err := c.service.Clone(ctx, appsvc.CloneRequest{
		Env:         env,
		Org:         org,
		Repo:        repo,
		Destination: dest,
	})
	if err != nil {
		return mapCloneError(err, env, org, repo, host, dest)
	}

	c.out.Successf("Cloned to %s", result.AbsPath)
	c.out.Println("")
	c.out.Println("Next steps:")
	c.out.Printlnf("  cd %s && %s env up", dest, osutil.CurrentBin())

	return nil
}

func mapCloneError(err error, env, org, repo, host, dest string) error {
	switch {
	case errors.Is(err, appsvc.ErrNotLoggedIn):
		return fmt.Errorf("%w: %s (run '%s auth login --env %s')", ErrNotLoggedIn, env, osutil.CurrentBin(), env)
	case errors.Is(err, studio.ErrRepoNotFound):
		return fmt.Errorf("%w: %s/%s on %s", studio.ErrRepoNotFound, org, repo, host)
	case errors.Is(err, studio.ErrDestinationExists):
		return fmt.Errorf("%w: %s", studio.ErrDestinationExists, dest)
	case errors.Is(err, studio.ErrUnauthorized):
		return fmt.Errorf("%w (run '%s auth login --env %s')", ErrInvalidToken, osutil.CurrentBin(), env)
	default:
		return fmt.Errorf("clone failed: %w", err)
	}
}

// parseOrgRepo parses "org/repo" format.
func parseOrgRepo(s string) (org, repo string, err error) {
	parts := strings.SplitN(s, "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", fmt.Errorf("%w: %q (expected org/repo)", ErrInvalidRepoFormat, s)
	}
	return parts[0], parts[1], nil
}

// AppContainersCommand is a hidden command used by app-manager for container runtime discovery.
type AppContainersCommand struct {
	out *ui.Output
}

// NewAppContainersCommand creates a hidden app-container discovery command.
func NewAppContainersCommand(_ *config.Config, out *ui.Output) *AppContainersCommand {
	return &AppContainersCommand{out: out}
}

// Name returns the command name.
func (c *AppContainersCommand) Name() string { return "__app-containers" }

// Synopsis returns a short description.
func (c *AppContainersCommand) Synopsis() string { return "List app containers" }

// Usage returns the full help text.
func (c *AppContainersCommand) Usage() string { return "" }

// Run executes the command.
func (c *AppContainersCommand) Run(ctx context.Context, _ []string) error {
	client, err := containerruntime.Detect(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	defer func() {
		if cerr := client.Close(); cerr != nil {
			c.out.Verbosef("failed to close container client: %v", cerr)
		}
	}()

	candidates, err := appcontainers.Discover(ctx, client)
	if err != nil {
		return fmt.Errorf("discover app containers: %w", err)
	}

	data, err := json.Marshal(candidates)
	if err != nil {
		return fmt.Errorf("encode app-container candidates: %w", err)
	}
	c.out.Println(string(data))
	return nil
}
