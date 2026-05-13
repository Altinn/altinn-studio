package cmd

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"

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

const authStatusSubcommand = "status"

// AuthCommand implements the 'auth' subcommand.
type AuthCommand struct {
	out     *ui.Output
	service *authsvc.Service
}

// NewAuthCommand creates a new auth command.
func NewAuthCommand(cfg *config.Config, out *ui.Output) *AuthCommand {
	return &AuthCommand{
		out:     out,
		service: authsvc.NewService(cfg),
	}
}

// Name returns the command name.
func (c *AuthCommand) Name() string { return "auth" }

// Synopsis returns a short description.
func (c *AuthCommand) Synopsis() string { return "Manage authentication with Altinn Studio" }

// Usage returns the full help text.
func (c *AuthCommand) Usage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s auth <subcommand> [options]", osutil.CurrentBin()),
		"",
		"Manage authentication with Altinn Studio.",
		"",
		"Subcommands:",
		"  login     Authenticate with Altinn Studio using Ansattporten",
		"  status    Show authentication status",
		"  logout    Clear stored credentials",
		"",
		fmt.Sprintf("Run '%s auth <subcommand> --help' for more information.", osutil.CurrentBin()),
	)
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
	case authStatusSubcommand:
		return c.runStatus(ctx, subArgs)
	case "logout":
		return c.runLogout(ctx, subArgs)
	case "git-credential":
		return c.runGitCredential(subArgs)
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.Usage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, subCmd)
	}
}

func (c *AuthCommand) runGitCredential(args []string) error {
	fs := flag.NewFlagSet("auth git-credential", flag.ContinueOnError)
	var env string
	fs.StringVar(&env, "env", authstore.DefaultEnv, "Environment name")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	operation := "get"
	if fs.NArg() > 0 {
		operation = fs.Arg(0)
	}
	if operation != "get" {
		return nil
	}

	result, err := c.service.GitCredential(os.Stdin, env)
	if err != nil {
		return fmt.Errorf("resolve git credentials: %w", err)
	}
	if !result.Found {
		return nil
	}

	c.out.Printlnf("username=%s", result.Username)
	c.out.Printlnf("password=%s", result.Password)
	c.out.Println("")
	return nil
}

// loginFlags holds parsed flags for the auth login command.
type loginFlags struct {
	env       string
	noBrowser bool
}

func (c *AuthCommand) parseLoginFlags(args []string) (loginFlags, bool, error) {
	fs := flag.NewFlagSet("auth login", flag.ContinueOnError)
	f := loginFlags{
		env:       authstore.DefaultEnv,
		noBrowser: false,
	}
	fs.StringVar(&f.env, "env", authstore.DefaultEnv, "Environment name (prod, dev, staging, local)")
	fs.BoolVar(&f.noBrowser, "no-browser", false, "Print login URL instead of opening a browser")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return f, true, nil
		}
		return f, false, fmt.Errorf("parsing flags: %w", err)
	}
	return f, false, nil
}

func (c *AuthCommand) runLogin(ctx context.Context, args []string) error {
	flags, helpShown, err := c.parseLoginFlags(args)
	if err != nil {
		return err
	}
	if helpShown {
		return nil
	}

	target, err := c.service.ResolveLoginTarget(flags.env)
	if err != nil {
		if errors.Is(err, authsvc.ErrUnknownEnvironment) {
			return fmt.Errorf("%w: %q", ErrUnknownEnvironment, flags.env)
		}
		return fmt.Errorf("resolve host: %w", err)
	}

	result, err := c.loginWithBrowser(ctx, flags, target)
	if err != nil {
		if errors.Is(err, authsvc.ErrLoginCancelled) {
			c.out.Println("Login cancelled")
			return nil
		}
		return err
	}

	c.out.Successf("Logged in to %s as %s", flags.env, result.Username)
	return nil
}

func (c *AuthCommand) loginWithBrowser(
	ctx context.Context,
	flags loginFlags,
	target authsvc.LoginTarget,
) (authsvc.LoginResult, error) {
	allowOverwrite := false
	existing, err := c.service.ExistingLogin(flags.env)
	if err != nil {
		return authsvc.LoginResult{}, fmt.Errorf("check existing login: %w", err)
	}
	if existing.Exists {
		c.out.Warningf("Already logged in to %s as %s", flags.env, existing.Username)
		confirmed, confirmErr := c.confirmOverwrite(ctx)
		if confirmErr != nil {
			return authsvc.LoginResult{}, confirmErr
		}
		if !confirmed {
			return authsvc.LoginResult{}, authsvc.ErrLoginCancelled
		}
		allowOverwrite = true
	}

	code, codeVerifier, err := c.waitForBrowserLogin(ctx, flags, target)
	if err != nil {
		return authsvc.LoginResult{}, err
	}

	result, err := c.service.ExchangeCode(ctx, authsvc.CodeExchangeRequest{
		Env:            flags.env,
		Scheme:         target.Scheme,
		Host:           target.Host,
		Code:           code,
		CodeVerifier:   codeVerifier,
		AllowOverwrite: allowOverwrite,
	})
	if err != nil {
		return authsvc.LoginResult{}, mapLoginError(err, flags.env)
	}
	if result.RevokePreviousError != "" {
		c.out.Warningf("Logged in, but failed to revoke previous API key: %s", result.RevokePreviousError)
	}
	return result, nil
}

func (c *AuthCommand) waitForBrowserLogin(
	ctx context.Context,
	flags loginFlags,
	target authsvc.LoginTarget,
) (string, string, error) {
	session, err := c.service.StartBrowserLogin(ctx, flags.env, target)
	if err != nil {
		return "", "", fmt.Errorf("start browser login: %w", err)
	}
	defer func() {
		if closeErr := session.Close(ctx); closeErr != nil {
			c.out.Verbosef("failed to shutdown login callback server: %v", closeErr)
		}
	}()

	c.out.Println("Opening browser for Ansattporten login...")
	if flags.noBrowser {
		c.out.Printlnf("Open this URL to continue: %s", session.LoginURL)
	} else if openErr := osutil.OpenContext(ctx, session.LoginURL); openErr != nil {
		c.out.Warningf("Failed to open browser: %v", openErr)
		c.out.Printlnf("Open this URL to continue: %s", session.LoginURL)
	}

	result, err := session.Wait(ctx)
	if err != nil {
		return "", "", fmt.Errorf("wait for browser login: %w", err)
	}
	return result.Code, result.CodeVerifier, nil
}

func mapLoginError(err error, env string) error {
	switch {
	case errors.Is(err, authsvc.ErrLoginCodeRequired):
		return ErrLoginCodeRequired
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
			c.out.Printlnf("Not logged in to %s", status.MissingEnv)
			return nil
		}

		c.out.Println("Not logged in to any environment")
		c.out.Println("")
		c.out.Printlnf("Run '%s auth login' to authenticate", osutil.CurrentBin())
		return nil
	}

	if flags.jsonOutput {
		return c.printAuthStatusJSON(status)
	}

	table := ui.NewTable(
		ui.NewColumn("ENV"),
		ui.NewColumn("HOST"),
		ui.NewColumn("USERNAME"),
		ui.NewColumn("STATUS"),
	)
	for _, envStatus := range status.Environments {
		table.Row(
			ui.Text(envStatus.Env),
			ui.Text(envStatus.Host),
			ui.Text(envStatus.Username),
			ui.Text(envStatus.Status),
		)
	}

	c.out.RenderTable(table)
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
	c.out.Println(string(payload))
	return nil
}

func (c *AuthCommand) runLogout(ctx context.Context, args []string) error {
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

	result, err := c.service.Logout(ctx, authsvc.LogoutRequest{
		Env: env,
		All: all,
	})
	if err != nil {
		return fmt.Errorf("logout: %w", err)
	}

	if all {
		if result.RevokeError != "" {
			c.out.Warningf(
				"Some API keys could not be revoked; local credentials were kept for retry: %s",
				result.RevokeError,
			)
		}
		if !result.Removed {
			return nil
		}
		c.out.Success("Logged out from environments with revoked credentials")
		return nil
	}

	if !result.Removed {
		if result.RevokeError != "" {
			c.out.Warningf(
				"Failed to revoke API key for %s; local credentials were kept for retry: %s",
				env,
				result.RevokeError,
			)
		}
		return nil
	}

	if result.RevokeError != "" {
		c.out.Warningf("Failed to revoke API key: %s", result.RevokeError)
	}
	c.out.Successf("Logged out from %s", env)
	return nil
}

// confirmOverwrite prompts the user to confirm overwriting existing credentials.
// Returns (confirmed, error) where error is ui.ErrInterrupted on Ctrl+C.
func (c *AuthCommand) confirmOverwrite(ctx context.Context) (bool, error) {
	confirmed, err := ui.Confirm(ctx, c.out, os.Stdin, "Overwrite existing credentials? [y/N]: ")
	if err != nil {
		return false, fmt.Errorf("confirm overwrite: %w", err)
	}
	return confirmed, nil
}
