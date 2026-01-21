package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"altinn.studio/studioctl/internal/appdetect"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

// RunCommand implements the 'run' subcommand.
type RunCommand struct {
	cfg *config.Config
	out *ui.Output
}

// NewRunCommand creates a new run command.
func NewRunCommand(cfg *config.Config, out *ui.Output) *RunCommand {
	return &RunCommand{cfg: cfg, out: out}
}

// Name returns the command name.
func (c *RunCommand) Name() string { return "run" }

// Synopsis returns a short description.
func (c *RunCommand) Synopsis() string { return "Run app natively (wraps 'dotnet run')" }

// Usage returns the full help text.
func (c *RunCommand) Usage() string {
	return `Usage: studioctl run [-p PATH] [-- dotnet args]

Runs the Altinn app using 'dotnet run'. The app is auto-detected from the
current directory, or can be specified with -p.

Arguments after -- are passed directly to dotnet.

Options:
  -p, --path PATH  Specify app directory (overrides auto-detect)
  -h, --help       Show this help
`
}

// Run executes the command.
func (c *RunCommand) Run(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("run", flag.ContinueOnError)
	var appPath string
	fs.StringVar(&appPath, "p", "", "App directory path")
	fs.StringVar(&appPath, "path", "", "App directory path")

	// Find -- separator for passthrough args
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

	// Detect app
	detector := appdetect.NewDetector()
	result, err := detector.DetectFromCwd(appPath)
	if err != nil {
		if errors.Is(err, appdetect.ErrNotFound) {
			return fmt.Errorf("%w: run from an app directory or use -p to specify path", ErrNoAppFound)
		}
		return fmt.Errorf("detect app: %w", err)
	}

	// Print detection feedback if path differs from cwd
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("get working directory: %w", err)
	}
	if result.Path != cwd {
		c.out.Verbosef("Using app at %s (detected via %s)", result.Path, result.DetectedFrom)
	}

	return c.runDotnet(ctx, result.Path, dotnetArgs)
}

func (c *RunCommand) runDotnet(ctx context.Context, appPath string, args []string) error {
	// Build dotnet run command
	dotnetArgs := make([]string, 0, 3+len(args))
	dotnetArgs = append(dotnetArgs, "run", "--project", filepath.Join(appPath, "App"))
	dotnetArgs = append(dotnetArgs, args...)

	c.out.Verbosef("Running: dotnet %v", dotnetArgs)

	//nolint:gosec // G204: subprocess arguments are from CLI flags, intentional passthrough behavior
	cmd := exec.CommandContext(ctx, "dotnet", dotnetArgs...)
	cmd.Dir = appPath
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	// Set localtest environment variables (only if not already set)
	cmd.Env = os.Environ()
	cmd.Env = appendEnvIfUnset(cmd.Env, "ASPNETCORE_ENVIRONMENT", "Development")
	// Add localtest connection vars here when implementing env detection

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("running dotnet: %w", err)
	}
	return nil
}

// appendEnvIfUnset adds an environment variable only if it's not already set.
func appendEnvIfUnset(env []string, key, value string) []string {
	prefix := key + "="
	for _, e := range env {
		if len(e) >= len(prefix) && e[:len(prefix)] == prefix {
			return env // already set
		}
	}
	return append(env, key+"="+value)
}
