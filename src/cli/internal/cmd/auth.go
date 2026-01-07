package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"sort"
	"strings"

	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/browser"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/studio"
	"altinn.studio/studioctl/internal/ui"
)

// AuthCommand implements the 'auth' subcommand.
type AuthCommand struct {
	cfg *config.Config
	out *ui.Output
}

// NewAuthCommand creates a new auth command.
func NewAuthCommand(cfg *config.Config, out *ui.Output) *AuthCommand {
	return &AuthCommand{cfg: cfg, out: out}
}

// Name returns the command name.
func (c *AuthCommand) Name() string { return "auth" }

// Synopsis returns a short description.
func (c *AuthCommand) Synopsis() string { return "Manage authentication with Altinn Studio" }

// Usage returns the full help text.
func (c *AuthCommand) Usage() string {
	return `Usage: studioctl auth <subcommand> [options]

Manage authentication with Altinn Studio.

Subcommands:
  login     Authenticate with Altinn Studio using a Personal Access Token
            (requires 'read:user' and 'repo' scopes)
  status    Show authentication status
  logout    Clear stored credentials

Run 'studioctl auth <subcommand> --help' for more information.
`
}

// Run executes the command.
func (c *AuthCommand) Run(ctx context.Context, args []string) error {
	if len(args) == 0 {
		c.out.Print(c.Usage())
		return nil
	}

	subCmd := args[0]
	subArgs := args[1:]

	switch subCmd {
	case "login":
		return c.runLogin(ctx, subArgs)
	case "status":
		return c.runStatus(ctx, subArgs)
	case "logout":
		return c.runLogout(ctx, subArgs)
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.Usage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, subCmd)
	}
}

// loginFlags holds parsed flags for the auth login command.
type loginFlags struct {
	env         string
	host        string
	token       string
	openBrowser bool
}

func (c *AuthCommand) parseLoginFlags(args []string) (loginFlags, bool, error) {
	fs := flag.NewFlagSet("auth login", flag.ContinueOnError)
	f := loginFlags{
		env:         auth.DefaultEnv,
		host:        "",
		token:       "",
		openBrowser: false,
	}
	fs.StringVar(&f.env, "env", auth.DefaultEnv, "Environment name (prod, dev, staging)")
	fs.StringVar(&f.host, "host", "", "Altinn Studio host (default: based on env)")
	fs.StringVar(&f.token, "token", "", "Personal Access Token (not recommended, use interactive prompt)")
	fs.BoolVar(&f.openBrowser, "open", false, "Open browser to create a new Personal Access Token")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return f, true, nil
		}
		return f, false, fmt.Errorf("parsing flags: %w", err)
	}
	return f, false, nil
}

func (c *AuthCommand) openPATPage(ctx context.Context, host string) {
	patURL := fmt.Sprintf("https://%s/repos/user/settings/applications", host)
	c.out.Verbosef("Opening browser to: %s", patURL)
	if err := browser.OpenContext(ctx, patURL); err != nil {
		c.out.Warningf("Failed to open browser: %v", err)
		c.out.Printf("Please open manually: %s\n", patURL)
	}
}

func (c *AuthCommand) promptForToken(ctx context.Context, env, host string) (string, error) {
	c.out.Printf("Enter Personal Access Token for %s (%s): ", env, host)
	tokenBytes, err := ui.ReadPassword(ctx, c.out)
	c.out.Println("") // newline after password input
	if err != nil {
		return "", fmt.Errorf("read token: %w", err)
	}
	return strings.TrimSpace(string(tokenBytes)), nil
}

func (c *AuthCommand) runLogin(ctx context.Context, args []string) error {
	flags, helpShown, err := c.parseLoginFlags(args)
	if err != nil {
		return err
	}
	if helpShown {
		return nil
	}

	// Determine host
	host := flags.host
	if host == "" {
		host = auth.HostForEnv(flags.env)
		if host == "" {
			return fmt.Errorf("%w: %q (use --host to specify the Altinn Studio host)", ErrUnknownEnvironment, flags.env)
		}
	}

	if flags.openBrowser {
		c.openPATPage(ctx, host)
	}

	// Load existing credentials
	creds, loadErr := auth.LoadCredentials(c.cfg.Home)
	if loadErr != nil {
		return fmt.Errorf("load credentials: %w", loadErr)
	}

	// Check if already logged in
	if existing, getErr := creds.Get(flags.env); getErr == nil {
		c.out.Warningf("Already logged in to %s as %s", flags.env, existing.Username)
		confirmed, confirmErr := c.confirmOverwrite(ctx)
		if confirmErr != nil {
			return confirmErr
		}
		if !confirmed {
			c.out.Println("Login cancelled")
			return nil
		}
	}

	// Get token
	token := flags.token
	if token == "" {
		token, err = c.promptForToken(ctx, flags.env, host)
		if err != nil {
			return err
		}
	}

	if token == "" {
		return ErrTokenRequired
	}

	// Validate token by fetching user info
	c.out.Verbose("Validating token...")
	client := studio.NewClientWithHTTP(host, token, "", nil)
	user, err := client.GetUser(ctx)
	if err != nil {
		if errors.Is(err, studio.ErrUnauthorized) {
			return fmt.Errorf("%w: authentication failed", ErrInvalidToken)
		}
		return fmt.Errorf("validate token: %w", err)
	}

	// Store credentials
	creds.Set(flags.env, auth.EnvCredentials{
		Host:     host,
		Token:    token,
		Username: user.Login,
	})

	if err := auth.SaveCredentials(c.cfg.Home, creds); err != nil {
		return fmt.Errorf("save credentials: %w", err)
	}

	c.out.Successf("Logged in to %s as %s", flags.env, user.Login)
	return nil
}

func (c *AuthCommand) runStatus(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("auth status", flag.ContinueOnError)
	var env string
	var jsonOutput bool
	fs.StringVar(&env, "env", "", "Show status for specific environment only")
	fs.BoolVar(&jsonOutput, "json", false, "Output in JSON format")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	creds, err := auth.LoadCredentials(c.cfg.Home)
	if err != nil {
		return fmt.Errorf("load credentials: %w", err)
	}

	if !creds.HasCredentials() {
		c.out.Println("Not logged in to any environment")
		c.out.Println("")
		c.out.Println("Run 'studioctl auth login' to authenticate")
		return nil
	}

	// Filter to specific env if requested
	envNames := creds.EnvNames()
	if env != "" {
		envCreds, getErr := creds.Get(env)
		if getErr != nil {
			if errors.Is(getErr, auth.ErrNotLoggedIn) {
				c.out.Printf("Not logged in to %s\n", env)
				return nil
			}
			return fmt.Errorf("get credentials for %s: %w", env, getErr)
		}
		rows := make([][]string, 1, 2)
		rows[0] = []string{"ENV", "HOST", "USERNAME", "STATUS"}
		status := c.validateToken(ctx, envCreds)
		rows = append(rows, []string{env, envCreds.Host, envCreds.Username, status})
		c.out.Table(rows)
		return nil
	}

	// Sort environments for consistent output
	sort.Strings(envNames)

	// Build status table
	rows := [][]string{{"ENV", "HOST", "USERNAME", "STATUS"}}
	for _, envName := range envNames {
		envCreds, err := creds.Get(envName)
		if err != nil {
			continue // Skip if credentials not found (shouldn't happen)
		}
		status := c.validateToken(ctx, envCreds)
		rows = append(rows, []string{envName, envCreds.Host, envCreds.Username, status})
	}

	c.out.Table(rows)
	return nil
}

func (c *AuthCommand) runLogout(_ context.Context, args []string) error {
	fs := flag.NewFlagSet("auth logout", flag.ContinueOnError)
	var env string
	var all bool
	fs.StringVar(&env, "env", auth.DefaultEnv, "Environment to logout from")
	fs.BoolVar(&all, "all", false, "Logout from all environments")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	creds, err := auth.LoadCredentials(c.cfg.Home)
	if err != nil {
		return fmt.Errorf("load credentials: %w", err)
	}

	if all {
		creds.DeleteAll()
		if err := auth.SaveCredentials(c.cfg.Home, creds); err != nil {
			return fmt.Errorf("save credentials: %w", err)
		}
		c.out.Success("Logged out from all environments")
		return nil
	}

	if _, getErr := creds.Get(env); getErr != nil {
		if errors.Is(getErr, auth.ErrNotLoggedIn) {
			// Not logged in, silent success
			return nil
		}
		return fmt.Errorf("get credentials for %s: %w", env, getErr)
	}

	creds.Delete(env)
	if err := auth.SaveCredentials(c.cfg.Home, creds); err != nil {
		return fmt.Errorf("save credentials: %w", err)
	}

	c.out.Successf("Logged out from %s", env)
	return nil
}

// validateToken checks if a token is still valid.
func (c *AuthCommand) validateToken(ctx context.Context, creds *auth.EnvCredentials) string {
	client := studio.NewClient(creds)
	_, err := client.GetUser(ctx)
	if err != nil {
		if errors.Is(err, studio.ErrUnauthorized) {
			return "invalid"
		}
		return "error"
	}
	return "valid"
}

// confirmOverwrite prompts the user to confirm overwriting existing credentials.
// Returns (confirmed, error) where error is ui.ErrInterrupted on Ctrl+C.
func (c *AuthCommand) confirmOverwrite(ctx context.Context) (bool, error) {
	c.out.Print("Overwrite existing credentials? [y/N]: ")
	response, err := ui.ReadLine(ctx, os.Stdin)
	if err != nil {
		c.out.Println("") // newline after interrupt
		return false, fmt.Errorf("read confirmation: %w", err)
	}
	answer := strings.TrimSpace(strings.ToLower(string(response)))
	return answer == "y" || answer == "yes", nil
}
