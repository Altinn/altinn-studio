package cmd

import (
	"bufio"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

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

const (
	loginStateBytes              = 24
	loginCodeVerifierBytes       = 48
	loginCallbackHeaderTimeout   = 5 * time.Second
	loginCallbackShutdownTimeout = 2 * time.Second
	loginCallbackSuccessHTML     = "<!doctype html><title>studioctl login</title><p>Login complete. You can close this window.</p>"
	loginCallbackCancelledHTML   = "<!doctype html><title>studioctl login</title><p>Login cancelled. You can close this window.</p>"
)

var errLoginCancelled = errors.New("login cancelled")

// AuthCommand implements the 'auth' subcommand.
type AuthCommand struct {
	out             *ui.Output
	service         *authsvc.Service
	credentialsHome string
}

// NewAuthCommand creates a new auth command.
func NewAuthCommand(cfg *config.Config, out *ui.Output) *AuthCommand {
	return &AuthCommand{
		out:             out,
		service:         authsvc.NewService(cfg),
		credentialsHome: cfg.Home,
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

type gitCredentialRequest struct {
	Protocol string
	Host     string
	Path     string
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

	request, err := readGitCredentialRequest(os.Stdin)
	if err != nil {
		//nolint:nilerr // Git credential helpers fail closed by producing no credentials.
		return nil
	}

	creds, err := authstore.LoadCredentials(c.credentialsHome)
	if err != nil {
		//nolint:nilerr // Git credential helpers fail closed by producing no credentials.
		return nil
	}
	envCreds, err := creds.Get(env)
	if err != nil {
		//nolint:nilerr // Git credential helpers fail closed by producing no credentials.
		return nil
	}
	if !matchesGitCredentialRequest(request, envCreds.SchemeOrDefault(), envCreds.Host) {
		return nil
	}

	c.out.Printlnf("username=%s", envCreds.Username)
	c.out.Printlnf("password=%s", envCreds.ApiKey)
	c.out.Println("")
	return nil
}

func readGitCredentialRequest(input io.Reader) (gitCredentialRequest, error) {
	var request gitCredentialRequest
	scanner := bufio.NewScanner(input)
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			break
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		switch key {
		case "protocol":
			request.Protocol = value
		case "host":
			request.Host = value
		case "path":
			request.Path = value
		}
	}
	if err := scanner.Err(); err != nil {
		return gitCredentialRequest{}, fmt.Errorf("read git credential request: %w", err)
	}
	return request, nil
}

func matchesGitCredentialRequest(request gitCredentialRequest, scheme, host string) bool {
	if request.Protocol != scheme || request.Host != host {
		return false
	}
	path := strings.TrimPrefix(request.Path, "/")
	return path == "repos" || strings.HasPrefix(path, "repos/")
}

// loginFlags holds parsed flags for the auth login command.
type loginFlags struct {
	env       string
	host      string
	noBrowser bool
}

type loginTarget struct {
	scheme string
	host   string
}

func (c *AuthCommand) parseLoginFlags(args []string) (loginFlags, bool, error) {
	fs := flag.NewFlagSet("auth login", flag.ContinueOnError)
	f := loginFlags{
		env:       authstore.DefaultEnv,
		host:      "",
		noBrowser: false,
	}
	fs.StringVar(&f.env, "env", authstore.DefaultEnv, "Environment name (prod, dev, staging)")
	fs.StringVar(&f.host, "host", "", "Altinn Studio host (default: based on env)")
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

	target, err := c.resolveLoginTarget(flags)
	if err != nil {
		return err
	}

	result, err := c.loginWithBrowser(ctx, flags, target)
	if err != nil {
		if errors.Is(err, errLoginCancelled) {
			c.out.Println("Login cancelled")
			return nil
		}
		return err
	}

	c.out.Successf("Logged in to %s as %s", flags.env, result.Username)
	return nil
}

func (c *AuthCommand) resolveLoginTarget(flags loginFlags) (loginTarget, error) {
	host, err := c.service.ResolveHost(flags.env, flags.host)
	if err != nil {
		if errors.Is(err, authsvc.ErrUnknownEnvironment) {
			return loginTarget{}, fmt.Errorf(
				"%w: %q (use --host to specify the Altinn Studio host)",
				ErrUnknownEnvironment,
				flags.env,
			)
		}
		return loginTarget{}, fmt.Errorf("resolve host: %w", err)
	}

	scheme := authstore.SchemeForEnv(flags.env)
	if parsed, parseErr := url.Parse(host); parseErr == nil && parsed.Scheme != "" {
		if parsed.Scheme != "http" && parsed.Scheme != "https" {
			return loginTarget{}, fmt.Errorf("%w: unsupported host scheme %q", ErrInvalidFlagValue, parsed.Scheme)
		}
		scheme = parsed.Scheme
		host = parsed.Host
	}

	return loginTarget{scheme: scheme, host: host}, nil
}

func (c *AuthCommand) loginWithBrowser(
	ctx context.Context,
	flags loginFlags,
	target loginTarget,
) (authsvc.LoginResult, error) {
	allowOverwrite := false
	existing, err := authstore.LoadCredentials(c.credentialsHome)
	if err != nil {
		return authsvc.LoginResult{}, fmt.Errorf("load credentials: %w", err)
	}
	if envCreds, getErr := existing.Get(flags.env); getErr == nil {
		c.out.Warningf("Already logged in to %s as %s", flags.env, envCreds.Username)
		confirmed, confirmErr := c.confirmOverwrite(ctx)
		if confirmErr != nil {
			return authsvc.LoginResult{}, confirmErr
		}
		if !confirmed {
			return authsvc.LoginResult{}, errLoginCancelled
		}
		allowOverwrite = true
	}

	code, codeVerifier, err := c.waitForBrowserLogin(ctx, flags, target)
	if err != nil {
		return authsvc.LoginResult{}, err
	}

	result, err := c.service.ExchangeCode(ctx, authsvc.CodeExchangeRequest{
		Env:            flags.env,
		Scheme:         target.scheme,
		Host:           target.host,
		Code:           code,
		CodeVerifier:   codeVerifier,
		AllowOverwrite: allowOverwrite,
	})
	if err != nil {
		return authsvc.LoginResult{}, mapLoginError(err, flags.env)
	}
	return result, nil
}

func (c *AuthCommand) waitForBrowserLogin(
	ctx context.Context,
	flags loginFlags,
	target loginTarget,
) (string, string, error) {
	var listenConfig net.ListenConfig
	listener, err := listenConfig.Listen(ctx, "tcp", "127.0.0.1:0")
	if err != nil {
		return "", "", fmt.Errorf("start login callback server: %w", err)
	}
	defer listener.Close() //nolint:errcheck // Best effort cleanup after server shutdown

	state, err := randomBase64URL(loginStateBytes)
	if err != nil {
		return "", "", fmt.Errorf("generate login state: %w", err)
	}
	codeVerifier, err := randomBase64URL(loginCodeVerifierBytes)
	if err != nil {
		return "", "", fmt.Errorf("generate code verifier: %w", err)
	}
	codeChallenge := createCodeChallenge(codeVerifier)

	codeCh := make(chan string, 1)
	errCh := make(chan error, 1)
	//nolint:exhaustruct // Only non-zero settings are relevant for this short-lived callback server.
	server := &http.Server{
		ReadHeaderTimeout: loginCallbackHeaderTimeout,
		Handler:           loginCallbackHandler(state, codeCh, errCh),
	}

	go func() {
		if serveErr := server.Serve(listener); serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			errCh <- fmt.Errorf("serve login callback: %w", serveErr)
		}
	}()
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(ctx, loginCallbackShutdownTimeout)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
			c.out.Verbosef("failed to shutdown login callback server: %v", err)
		}
	}()

	callbackURL := "http://" + listener.Addr().String() + "/callback"
	loginURL := buildStudioctlLoginURL(target.scheme, target.host, callbackURL, state, codeChallenge, flags.env)

	c.out.Println("Opening browser for Ansattporten login...")
	if flags.noBrowser {
		c.out.Printlnf("Open this URL to continue: %s", loginURL)
	} else if err := osutil.OpenContext(ctx, loginURL); err != nil {
		c.out.Warningf("Failed to open browser: %v", err)
		c.out.Printlnf("Open this URL to continue: %s", loginURL)
	}

	select {
	case code := <-codeCh:
		return code, codeVerifier, nil
	case err := <-errCh:
		return "", "", err
	case <-ctx.Done():
		return "", "", fmt.Errorf("login cancelled: %w", ctx.Err())
	}
}

func loginCallbackHandler(state string, codeCh chan<- string, errCh chan<- error) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/callback" {
			http.NotFound(w, r)
			return
		}
		if got := r.URL.Query().Get("state"); got != state {
			http.Error(w, "Invalid login state.", http.StatusBadRequest)
			errCh <- ErrInvalidToken
			return
		}
		if errorCode := r.URL.Query().Get("error"); errorCode != "" {
			if errorCode == "access_denied" {
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				if _, err := w.Write([]byte(loginCallbackCancelledHTML)); err != nil {
					errCh <- fmt.Errorf("write login response: %w", err)
					return
				}
				errCh <- errLoginCancelled
				return
			}
			http.Error(w, "Login failed.", http.StatusBadRequest)
			errCh <- ErrInvalidToken
			return
		}
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "Missing login code.", http.StatusBadRequest)
			errCh <- ErrLoginCodeRequired
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		if _, err := w.Write([]byte(loginCallbackSuccessHTML)); err != nil {
			errCh <- fmt.Errorf("write login response: %w", err)
			return
		}
		codeCh <- code
	})
}

func buildStudioctlLoginURL(scheme, host, callbackURL, state, codeChallenge, env string) string {
	authorizeValues := url.Values{}
	authorizeValues.Set("redirect_uri", callbackURL)
	authorizeValues.Set("state", state)
	authorizeValues.Set("code_challenge", codeChallenge)
	authorizeValues.Set("client_name", "studioctl "+env)

	authorizePath := "/designer/api/v1/studioctl/auth/authorize?" + authorizeValues.Encode()
	loginValues := url.Values{}
	loginValues.Set("redirect_to", authorizePath)

	return scheme + "://" + host + "/Login?" + loginValues.Encode()
}

func randomBase64URL(size int) (string, error) {
	buf := make([]byte, size)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("read random bytes: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func createCodeChallenge(codeVerifier string) string {
	sum := sha256.Sum256([]byte(codeVerifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
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
