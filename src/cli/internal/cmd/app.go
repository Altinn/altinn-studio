package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"path/filepath"
	"strings"

	"altinn.studio/studioctl/internal/appdetect"
	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/studio"
	"altinn.studio/studioctl/internal/ui"
)

// AppCommand implements the 'app' subcommand.
type AppCommand struct {
	cfg *config.Config
	out *ui.Output
}

// NewAppCommand creates a new app command.
func NewAppCommand(cfg *config.Config, out *ui.Output) *AppCommand {
	return &AppCommand{cfg: cfg, out: out}
}

// Name returns the command name.
func (c *AppCommand) Name() string { return "app" }

// Synopsis returns a short description.
func (c *AppCommand) Synopsis() string { return "Manage Altinn app" }

// Usage returns the full help text.
func (c *AppCommand) Usage() string {
	return `Usage: studioctl app <subcommand> [options]

Manage Altinn apps.

Subcommands:
  clone     Clone an app repository from Altinn Studio
  update    Update Altinn.App NuGet packages and frontend

Run 'studioctl app <subcommand> --help' for more information.
`
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

func (c *AppCommand) runUpdate(_ context.Context, args []string) error {
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

	// Detect app
	detector := appdetect.NewDetector()
	result, err := detector.DetectFromCwd(appPath)
	if err != nil {
		if errors.Is(err, appdetect.ErrNotFound) {
			return fmt.Errorf("%w: run from an app directory or use -p to specify path", ErrNoAppFound)
		}
		return fmt.Errorf("detect app: %w", err)
	}

	c.out.Printf("App found: %s\n", result.Path)
	c.out.Println("")

	// Placeholder: actual update logic requires app-manager server
	c.out.Println("App update not yet implemented.")
	c.out.Println("This command requires the app-manager server (Phase 5).")
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

	// Require org/repo argument
	remaining := fs.Args()
	if len(remaining) == 0 {
		return fmt.Errorf("%w: usage: studioctl app clone [--env ENV] <org>/<repo> [destination]", ErrMissingArgument)
	}

	// Parse org/repo
	repoArg := remaining[0]
	org, repo, parseErr := parseOrgRepo(repoArg)
	if parseErr != nil {
		return parseErr
	}

	// Determine destination
	dest := repo
	if len(remaining) > 1 {
		dest = remaining[1]
	}

	// Load credentials
	creds, loadErr := auth.LoadCredentials(c.cfg.Home)
	if loadErr != nil {
		return fmt.Errorf("load credentials: %w", loadErr)
	}

	envCreds, getErr := creds.Get(env)
	if getErr != nil {
		return fmt.Errorf("%w: %s (run 'studioctl auth login --env %s')", ErrNotLoggedIn, env, env)
	}

	c.out.Verbosef("Cloning %s/%s from %s...", org, repo, envCreds.Host)

	// Clone using studio client
	client := studio.NewClient(envCreds)
	if cloneErr := client.CloneRepo(ctx, org, repo, dest); cloneErr != nil {
		// Return wrapped errors for specific cases, pass through otherwise
		if errors.Is(cloneErr, studio.ErrRepoNotFound) {
			return fmt.Errorf("%w: %s/%s on %s", studio.ErrRepoNotFound, org, repo, envCreds.Host)
		}
		if errors.Is(cloneErr, studio.ErrDestinationExists) {
			return fmt.Errorf("%w: %s", studio.ErrDestinationExists, dest)
		}
		if errors.Is(cloneErr, studio.ErrUnauthorized) {
			return fmt.Errorf("%w (run 'studioctl auth login --env %s')", ErrInvalidToken, env)
		}
		return fmt.Errorf("clone failed: %w", cloneErr)
	}

	// Get absolute path for display (fallback to dest if Abs fails)
	absPath, err := filepath.Abs(dest)
	if err != nil {
		absPath = dest
	}
	c.out.Successf("Cloned to %s", absPath)
	c.out.Println("")
	c.out.Printf("Next steps:\n")
	c.out.Printf("  cd %s && studioctl env up\n", dest)

	return nil
}

// parseOrgRepo parses "org/repo" format.
func parseOrgRepo(s string) (org, repo string, err error) {
	parts := strings.SplitN(s, "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", fmt.Errorf("%w: %q (expected org/repo)", ErrInvalidRepoFormat, s)
	}
	return parts[0], parts[1], nil
}
