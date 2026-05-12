// Package studio provides an API client for Altinn Studio.
package studio

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"altinn.studio/devenv/pkg/processutil"
	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/httpclient"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	// apiBasePath is the base path for the Altinn Studio repos API.
	apiBasePath = "/repos/api/v1"

	// httpTimeout is the default timeout for HTTP requests.
	httpTimeout = 30 * time.Second
)

// Sentinel errors for the studio client.
var (
	// ErrRepoNotFound is returned when a repository doesn't exist.
	ErrRepoNotFound = errors.New("repository not found")

	// ErrUnauthorized is returned when the API key is invalid or expired.
	ErrUnauthorized = errors.New("unauthorized: invalid or expired API key")

	// ErrDestinationExists is returned when the clone destination already exists.
	ErrDestinationExists = errors.New("destination already exists")

	// ErrGitNotFound is returned when git is not available.
	ErrGitNotFound = errors.New("git command not found")

	// ErrGitCloneFailed is returned when git clone fails.
	ErrGitCloneFailed = errors.New("git clone failed")

	// ErrUnexpectedStatus is returned for unexpected HTTP status codes.
	ErrUnexpectedStatus = errors.New("unexpected HTTP status")
)

// User represents a repos API user.
//
//nolint:tagliatelle,govet // JSON tags match the repos API; field order matches API doc
type User struct {
	ID       int64  `json:"id"`
	Login    string `json:"login"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
}

// Repository represents a repos API repository.
//
//nolint:tagliatelle,govet // JSON tags match the repos API; field order matches API doc
type Repository struct {
	ID          int64  `json:"id"`
	Owner       *User  `json:"owner"`
	Name        string `json:"name"`
	FullName    string `json:"full_name"`
	Description string `json:"description"`
	CloneURL    string `json:"clone_url"`
	SSHURL      string `json:"ssh_url"`
	HTMLURL     string `json:"html_url"`
}

// Client is an API client for Altinn Studio.
type Client struct {
	env             string
	credentialsHome string
	host            string
	version         config.Version
	apiKey          string
	httpClient      *http.Client
	scheme          string // "https" or "http" (http only for testing)
}

// NewClient creates a new Studio API client from credentials.
func NewClient(creds *auth.EnvCredentials, version config.Version) *Client {
	return NewClientForEnv(auth.DefaultEnv, "", creds, version)
}

// NewClientForEnv creates a new Studio API client for a named environment.
func NewClientForEnv(env, credentialsHome string, creds *auth.EnvCredentials, version config.Version) *Client {
	return &Client{
		env:             env,
		credentialsHome: credentialsHome,
		host:            creds.Host,
		apiKey:          creds.ApiKey,
		version:         version,
		scheme:          creds.SchemeOrDefault(),
		httpClient: &http.Client{
			Timeout: httpTimeout,
		},
	}
}

// NewClientWithHTTP creates a new client with a custom HTTP client (for testing).
func NewClientWithHTTP(host, apiKey string, version config.Version, httpClient *http.Client) *Client {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: httpTimeout}
	}
	return &Client{
		env:             auth.DefaultEnv,
		credentialsHome: "",
		host:            host,
		apiKey:          apiKey,
		version:         version,
		scheme:          "https",
		httpClient:      httpClient,
	}
}

// GetUser validates the API key and returns the current user.
func (c *Client) GetUser(ctx context.Context) (*User, error) {
	endpoint := fmt.Sprintf("%s://%s%s/user", c.scheme, c.host, apiBasePath)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	c.setRequestHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer closeResponseBody(resp.Body)

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, ErrUnauthorized
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body) //nolint:errcheck // Best effort read for error message
		return nil, fmt.Errorf("%w %d: %s", ErrUnexpectedStatus, resp.StatusCode, string(body))
	}

	var user User
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &user, nil
}

// GetRepo returns information about a repository.
func (c *Client) GetRepo(ctx context.Context, org, repo string) (*Repository, error) {
	endpoint := fmt.Sprintf("%s://%s%s/repos/%s/%s",
		c.scheme, c.host, apiBasePath,
		url.PathEscape(org), url.PathEscape(repo))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	c.setRequestHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer closeResponseBody(resp.Body)

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, ErrUnauthorized
	}

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("%w: %s/%s", ErrRepoNotFound, org, repo)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body) //nolint:errcheck // Best effort read for error message
		return nil, fmt.Errorf("%w %d: %s", ErrUnexpectedStatus, resp.StatusCode, string(body))
	}

	var repository Repository
	if err := json.NewDecoder(resp.Body).Decode(&repository); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &repository, nil
}

// CloneRepo clones a repository to the specified destination.
func (c *Client) CloneRepo(ctx context.Context, org, repo, destPath string) error {
	absPath, err := filepath.Abs(destPath)
	if err != nil {
		return fmt.Errorf("resolve destination path: %w", err)
	}

	if pathExists(absPath) {
		return fmt.Errorf("%w: %s", ErrDestinationExists, absPath)
	}

	if _, err := c.GetRepo(ctx, org, repo); err != nil {
		return fmt.Errorf("verify repository: %w", err)
	}

	cloneURL := c.buildCloneURL(org, repo)

	if err := c.execGitClone(ctx, cloneURL, absPath); err != nil {
		return err
	}

	if err := c.configureGitCredentialHelper(ctx, absPath); err != nil {
		if cleanupErr := os.RemoveAll(absPath); cleanupErr != nil {
			return errors.Join(err, fmt.Errorf("remove failed clone destination: %w", cleanupErr))
		}
		return err
	}

	return nil
}

// buildCloneURL constructs the HTTPS clone URL.
func (c *Client) buildCloneURL(org, repo string) string {
	var u url.URL
	u.Scheme = c.scheme
	u.Host = c.host
	u.Path = fmt.Sprintf("/repos/%s/%s.git", org, repo)
	u.RawPath = fmt.Sprintf("/repos/%s/%s.git", url.PathEscape(org), url.PathEscape(repo))
	return u.String()
}

// execGitClone runs git clone command.
func (c *Client) execGitClone(ctx context.Context, cloneURL, destPath string) error {
	gitPath, err := exec.LookPath("git")
	if err != nil {
		return ErrGitNotFound
	}

	args := []string{
		"-c",
		"http.userAgent=" + c.version.UserAgent(),
		"clone",
		cloneURL,
		destPath,
	}
	args = append(c.gitCredentialConfigArgs(), args...)

	cmd := processutil.CommandContext(ctx, gitPath, args...)

	output, err := cmd.CombinedOutput()
	if err != nil {
		sanitized := sanitizeGitOutput(string(output), c.secret())
		return fmt.Errorf("%w: %s", ErrGitCloneFailed, sanitized)
	}

	return nil
}

func (c *Client) configureGitCredentialHelper(ctx context.Context, repoPath string) error {
	gitPath, err := exec.LookPath("git")
	if err != nil {
		return ErrGitNotFound
	}

	commands := [][]string{
		{
			"-C",
			repoPath,
			"config",
			"--local",
			"--replace-all",
			c.gitCredentialHelperConfigKey(),
			"",
		},
		{
			"-C",
			repoPath,
			"config",
			"--local",
			"--add",
			c.gitCredentialHelperConfigKey(),
			c.gitCredentialHelperCommand(),
		},
		{
			"-C",
			repoPath,
			"config",
			"--local",
			"--replace-all",
			c.gitCredentialUseHTTPPathConfigKey(),
			"true",
		},
	}

	for _, args := range commands {
		cmd := processutil.CommandContext(ctx, gitPath, args...)
		output, err := cmd.CombinedOutput()
		if err != nil {
			sanitized := sanitizeGitOutput(string(output), c.secret())
			return fmt.Errorf("configure git credential helper: %w: %s", err, sanitized)
		}
	}

	return nil
}

func (c *Client) gitCredentialHelperConfigKey() string {
	var u url.URL
	u.Scheme = c.scheme
	u.Host = c.host
	u.Path = "/repos"
	return "credential." + u.String() + ".helper"
}

func (c *Client) gitCredentialUseHTTPPathConfigKey() string {
	var u url.URL
	u.Scheme = c.scheme
	u.Host = c.host
	u.Path = "/repos"
	return "credential." + u.String() + ".useHttpPath"
}

func (c *Client) gitCredentialConfigArgs() []string {
	helperKey := c.gitCredentialHelperConfigKey()
	return []string{
		"-c", helperKey + "=",
		"-c", helperKey + "=" + c.gitCredentialHelperCommand(),
		"-c", c.gitCredentialUseHTTPPathConfigKey() + "=true",
	}
}

func (c *Client) gitCredentialHelperCommand() string {
	args := []string{
		"!" + shellQuote(osutil.CurrentBinPath()),
	}
	if c.credentialsHome != "" {
		args = append(args, "--home", shellQuote(c.credentialsHome))
	}
	args = append(args, "auth", "git-credential", "--env", shellQuote(c.env))
	return strings.Join(args, " ")
}

func shellQuote(value string) string {
	if value == "" {
		return "''"
	}
	return "'" + strings.ReplaceAll(value, "'", "'\\''") + "'"
}

// setRequestHeaders sets the shared headers for API requests.
func (c *Client) setRequestHeaders(req *http.Request) {
	req.Header.Set("X-Api-Key", c.apiKey)
	httpclient.SetUserAgent(req, c.version)
}

// pathExists checks if a file or directory exists.
func pathExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func closeResponseBody(body io.Closer) {
	if err := body.Close(); err != nil {
		return
	}
}

// sanitizeGitOutput removes sensitive data from git output.
func sanitizeGitOutput(output, secret string) string {
	if secret != "" {
		output = strings.ReplaceAll(output, secret, "****")
	}
	return output
}

func (c *Client) secret() string {
	return c.apiKey
}
