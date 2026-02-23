package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"

	runsvc "altinn.studio/studioctl/internal/cmd/run"
	"altinn.studio/studioctl/internal/config"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

// RunCommand implements the 'run' subcommand.
type RunCommand struct {
	out     *ui.Output
	service *runsvc.Service
}

// NewRunCommand creates a new run command.
func NewRunCommand(cfg *config.Config, out *ui.Output) *RunCommand {
	return &RunCommand{
		out:     out,
		service: runsvc.NewService(),
	}
}

// Name returns the command name.
func (c *RunCommand) Name() string { return "run" }

// Synopsis returns a short description.
func (c *RunCommand) Synopsis() string { return "Run app natively (wraps 'dotnet run')" }

// Usage returns the full help text.
func (c *RunCommand) Usage() string {
	return fmt.Sprintf(`Usage: %s run [-p PATH] [-- dotnet args]

Runs the Altinn app using 'dotnet run'. The app is auto-detected from the
current directory, or can be specified with -p.

Arguments after -- are passed directly to dotnet.

Options:
  -p, --path PATH  Specify app directory (overrides auto-detect)
  -h, --help       Show this help
`, osutil.CurrentBin())
}

// Run executes the command.
func (c *RunCommand) Run(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("run", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	var appPath string
	fs.StringVar(&appPath, "p", "", "App directory path")
	fs.StringVar(&appPath, "path", "", "App directory path")

	var cmdArgs, dotnetArgs []string
	for i, arg := range args {
		if arg == "--" {
			cmdArgs = args[:i]
			dotnetArgs = args[i+1:]
			break
		}
	}
	if len(cmdArgs) == 0 && len(dotnetArgs) == 0 {
		cmdArgs = args
	}

	if err := fs.Parse(cmdArgs); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			c.out.Print(c.Usage())
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	result, err := c.service.ResolveApp(ctx, appPath)
	if err != nil {
		if errors.Is(err, repocontext.ErrAppNotFound) {
			return fmt.Errorf("%w: run from an app directory or use -p to specify path", ErrNoAppFound)
		}
		return fmt.Errorf("detect app: %w", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("get working directory: %w", err)
	}
	if result.AppRoot != cwd {
		c.out.Verbosef("Using app at %s (detected via %s)", result.AppRoot, result.AppDetectedFrom)
	}

	return c.runDotnet(ctx, result.AppRoot, dotnetArgs)
}

func (c *RunCommand) runDotnet(ctx context.Context, appPath string, args []string) error {
	spec := c.service.BuildDotnetRunSpec(appPath, args, os.Environ())

	c.out.Verbosef("Running: dotnet %v", spec.Args)

	//nolint:gosec // G204: subprocess arguments are from CLI flags, intentional passthrough behavior
	cmd := exec.CommandContext(ctx, "dotnet", spec.Args...)
	cmd.Dir = spec.Dir
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	cmd.Env = spec.Env

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("running dotnet: %w", err)
	}
	return nil
}
