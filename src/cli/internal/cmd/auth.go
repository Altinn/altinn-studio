package cmd

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"strings"

	authstore "altinn.studio/studioctl/internal/auth"
	authsvc "altinn.studio/studioctl/internal/cmd/auth"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

type authStatusFlags struct {
	env        string
	jsonOutput bool
}

var errLoginCancelled = errors.New("login cancelled")

// AuthCommand implements the 'auth' subcommand.
type AuthCommand struct {
	out     *ui.Output
	service *authsvc.Service
}

// NewAuthCommand creates a new auth command.
func NewAuthCommand(cfg *config.Config, out *ui.Output) *AuthCommand {
	return &AuthCommand{
		out:     out,
		service: authsvc.NewService(cfg.Home),
	}
}

// Name returns the command name.
func (c *AuthCommand) Name() string { return "auth" }

// Synopsis returns a short description.
func (c *AuthCommand) Synopsis() string { return "Manage authentication with Altinn Studio" }

// Usage returns the full help text.
func (c *AuthCommand) Usage() string {
	return fmt.Sprintf(`Usage: %s auth <subcommand> [options]

Manage authentication with Altinn Studio.

Subcommands:
  login     Authenticate with Altinn Studio using a Personal Access Token
            (requires 'read:user' and 'repo' scopes)
  status    Show authentication status
  logout    Clear stored credentials

Run '%s auth <subcommand> --help' for more information.
`, osutil.CurrentBin(), osutil.CurrentBin())
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
		env:         authstore.DefaultEnv,
		host:        "",
		token:       "",
		openBrowser: false,
	}
	fs.StringVar(&f.env, "env", authstore.DefaultEnv, "Environment name (prod, dev, staging)")
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
	if err := osutil.OpenContext(ctx, patURL); err != nil {
		c.out.Warningf("Failed to open browser: %v", err)
		c.out.Printf("Please open manually: %s\n", patURL)
	}
}

func (c *AuthCommand) promptForToken(ctx context.Context, env, host string) (string, error) {
	c.out.Printf("Enter Personal Access Token for %s (%s): ", env, host)
	tokenBytes, err := ui.ReadPassword(ctx, c.out)
	c.out.Println("")
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

	host, err := c.resolveLoginHost(flags)
	if err != nil {
		return err
	}

	if flags.openBrowser {
		c.openPATPage(ctx, host)
	}

	token, err := c.resolveLoginToken(ctx, flags, host)
	if err != nil {
		return err
	}

	result, err := c.loginWithOverwrite(ctx, flags.env, host, token)
	if err != nil {
		if errors.Is(err, errLoginCancelled) {
			return nil
		}
		return err
	}

	c.out.Successf("Logged in to %s as %s", flags.env, result.Username)
	c.out.Warning("NOTE: for this login method, `app clone` stores your username/token in the repository origin URL.")
	return nil
}

func (c *AuthCommand) resolveLoginHost(flags loginFlags) (string, error) {
	host, err := c.service.ResolveHost(flags.env, flags.host)
	if err != nil {
		if errors.Is(err, authsvc.ErrUnknownEnvironment) {
			return "", fmt.Errorf(
				"%w: %q (use --host to specify the Altinn Studio host)",
				ErrUnknownEnvironment,
				flags.env,
			)
		}
		return "", fmt.Errorf("resolve host: %w", err)
	}
	return host, nil
}

func (c *AuthCommand) resolveLoginToken(ctx context.Context, flags loginFlags, host string) (string, error) {
	if flags.token != "" {
		return flags.token, nil
	}
	return c.promptForToken(ctx, flags.env, host)
}

func (c *AuthCommand) loginWithOverwrite(
	ctx context.Context,
	env, host, token string,
) (authsvc.LoginResult, error) {
	result, err := c.loginOnce(ctx, env, host, token, false)
	if err == nil {
		return result, nil
	}

	var alreadyLoggedIn authsvc.AlreadyLoggedInError
	if !errors.As(err, &alreadyLoggedIn) {
		return authsvc.LoginResult{}, mapLoginError(err, env)
	}

	c.out.Warningf("Already logged in to %s as %s", alreadyLoggedIn.Env, alreadyLoggedIn.Username)
	confirmed, confirmErr := c.confirmOverwrite(ctx)
	if confirmErr != nil {
		return authsvc.LoginResult{}, confirmErr
	}
	if !confirmed {
		c.out.Println("Login cancelled")
		return authsvc.LoginResult{}, errLoginCancelled
	}

	result, err = c.loginOnce(ctx, env, host, token, true)
	if err != nil {
		return authsvc.LoginResult{}, mapLoginError(err, env)
	}

	return result, nil
}

func (c *AuthCommand) loginOnce(
	ctx context.Context,
	env, host, token string,
	allowOverwrite bool,
) (authsvc.LoginResult, error) {
	c.out.Verbose("Validating token...")
	result, err := c.service.Login(ctx, authsvc.LoginRequest{
		Env:            env,
		Host:           host,
		Token:          token,
		AllowOverwrite: allowOverwrite,
	})
	if err != nil {
		return authsvc.LoginResult{}, fmt.Errorf("login: %w", err)
	}
	return result, nil
}

func mapLoginError(err error, env string) error {
	switch {
	case errors.Is(err, authsvc.ErrTokenRequired):
		return ErrTokenRequired
	case errors.Is(err, authsvc.ErrInvalidToken):
		return fmt.Errorf("%w: authentication failed", ErrInvalidToken)
	default:
		return fmt.Errorf("login failed for %s: %w", env, err)
	}
}

func (c *AuthCommand) runStatus(ctx context.Context, args []string) error {
	flags, helpShown, err := c.parseStatusFlags(args)
	if err != nil {
		return err
	}
	if helpShown {
		return nil
	}

	status, err := c.service.Status(ctx, authsvc.StatusRequest{Env: flags.env})
	if err != nil {
		return fmt.Errorf("get auth status: %w", err)
	}

	if len(status.Environments) == 0 {
		if flags.jsonOutput {
			return c.printAuthStatusJSON(status)
		}
		if status.MissingEnv != "" {
			c.out.Printf("Not logged in to %s\n", status.MissingEnv)
			return nil
		}

		c.out.Println("Not logged in to any environment")
		c.out.Println("")
		c.out.Printf("Run '%s auth login' to authenticate\n", osutil.CurrentBin())
		return nil
	}

	if flags.jsonOutput {
		return c.printAuthStatusJSON(status)
	}

	rows := [][]string{{"ENV", "HOST", "USERNAME", "STATUS"}}
	for _, envStatus := range status.Environments {
		rows = append(rows, []string{envStatus.Env, envStatus.Host, envStatus.Username, envStatus.Status})
	}

	c.out.Table(rows)
	return nil
}

func (c *AuthCommand) parseStatusFlags(args []string) (authStatusFlags, bool, error) {
	fs := flag.NewFlagSet("auth status", flag.ContinueOnError)
	f := authStatusFlags{
		env:        "",
		jsonOutput: false,
	}
	fs.StringVar(&f.env, "env", "", "Show status for specific environment only")
	fs.BoolVar(&f.jsonOutput, "json", false, "Output in JSON format")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return f, true, nil
		}
		return f, false, fmt.Errorf("parsing flags: %w", err)
	}

	return f, false, nil
}

func (c *AuthCommand) printAuthStatusJSON(status authsvc.StatusResult) error {
	if status.Environments == nil {
		status.Environments = make([]authsvc.StatusEnvironment, 0)
	}
	payload, err := json.Marshal(status)
	if err != nil {
		return fmt.Errorf("marshal auth status json: %w", err)
	}
	c.out.Printf("%s\n", payload)
	return nil
}

func (c *AuthCommand) runLogout(_ context.Context, args []string) error {
	fs := flag.NewFlagSet("auth logout", flag.ContinueOnError)
	var env string
	var all bool
	fs.StringVar(&env, "env", authstore.DefaultEnv, "Environment to logout from")
	fs.BoolVar(&all, "all", false, "Logout from all environments")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	result, err := c.service.Logout(authsvc.LogoutRequest{
		Env: env,
		All: all,
	})
	if err != nil {
		return fmt.Errorf("logout: %w", err)
	}

	if all {
		c.out.Success("Logged out from all environments")
		return nil
	}

	if !result.Removed {
		return nil
	}

	c.out.Successf("Logged out from %s", env)
	return nil
}

// confirmOverwrite prompts the user to confirm overwriting existing credentials.
// Returns (confirmed, error) where error is ui.ErrInterrupted on Ctrl+C.
func (c *AuthCommand) confirmOverwrite(ctx context.Context) (bool, error) {
	c.out.Print("Overwrite existing credentials? [y/N]: ")
	response, err := ui.ReadLine(ctx, os.Stdin)
	if err != nil {
		c.out.Println("")
		return false, fmt.Errorf("read confirmation: %w", err)
	}
	answer := strings.TrimSpace(strings.ToLower(string(response)))
	return answer == "y" || answer == "yes", nil
}
