package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"strings"

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
	service *appsvc.Service
}

// NewAppCommand creates a new app command.
func NewAppCommand(cfg *config.Config, out *ui.Output) *AppCommand {
	return &AppCommand{
		out:     out,
		service: appsvc.NewService(cfg.Home),
	}
}

// Name returns the command name.
func (c *AppCommand) Name() string { return "app" }

// Synopsis returns a short description.
func (c *AppCommand) Synopsis() string { return "Manage Altinn app" }

// Usage returns the full help text.
func (c *AppCommand) Usage() string {
	return fmt.Sprintf(`Usage: %s app <subcommand> [options]

Manage Altinn apps.

Subcommands:
  clone     Clone an app repository from Altinn Studio
  update    Update Altinn.App NuGet packages and frontend

Run '%s app <subcommand> --help' for more information.
`, osutil.CurrentBin(), osutil.CurrentBin())
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
	case "clone":
		return c.runClone(ctx, subArgs)
	case "update":
		return c.runUpdate(ctx, subArgs)
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.Usage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, subCmd)
	}
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

	c.out.Printf("App found: %s\n", result.AppPath)
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
	c.out.Printf("Next steps:\n")
	c.out.Printf("  cd %s && %s env up\n", dest, osutil.CurrentBin())

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
