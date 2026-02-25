// Package studio provides an API client for Altinn Studio (Gitea).
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

	"altinn.studio/studioctl/internal/auth"
)

const (
	// apiBasePath is the base path for the Gitea API.
	apiBasePath = "/repos/api/v1"

	// httpTimeout is the default timeout for HTTP requests.
	httpTimeout = 30 * time.Second
)

// Sentinel errors for the studio client.
var (
	// ErrRepoNotFound is returned when a repository doesn't exist.
	ErrRepoNotFound = errors.New("repository not found")

	// ErrUnauthorized is returned when the token is invalid or expired.
	ErrUnauthorized = errors.New("unauthorized: invalid or expired token")

	// ErrDestinationExists is returned when the clone destination already exists.
	ErrDestinationExists = errors.New("destination already exists")

	// ErrGitNotFound is returned when git is not available.
	ErrGitNotFound = errors.New("git command not found")

	// ErrGitCloneFailed is returned when git clone fails.
	ErrGitCloneFailed = errors.New("git clone failed")

	// ErrUnexpectedStatus is returned for unexpected HTTP status codes.
	ErrUnexpectedStatus = errors.New("unexpected HTTP status")
)

// User represents a Gitea user.
//
//nolint:tagliatelle,govet // JSON tags match Gitea API; field order matches API doc
type User struct {
	ID       int64  `json:"id"`
	Login    string `json:"login"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
}

// Repository represents a Gitea repository.
//
//nolint:tagliatelle,govet // JSON tags match Gitea API; field order matches API doc
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
	host       string
	token      string
	username   string
	httpClient *http.Client
	scheme     string // "https" or "http" (http only for testing)
}

// NewClient creates a new Studio API client from credentials.
func NewClient(creds *auth.EnvCredentials) *Client {
	return &Client{
		host:     creds.Host,
		token:    creds.Token,
		username: creds.Username,
		scheme:   "https",
		httpClient: &http.Client{
			Timeout: httpTimeout,
		},
	}
}

// NewClientWithHTTP creates a new client with a custom HTTP client (for testing).
func NewClientWithHTTP(host, token, username string, httpClient *http.Client) *Client {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: httpTimeout}
	}
	return &Client{
		host:       host,
		token:      token,
		username:   username,
		scheme:     "https",
		httpClient: httpClient,
	}
}

// GetUser validates the token and returns the current user.
func (c *Client) GetUser(ctx context.Context) (*User, error) {
	endpoint := fmt.Sprintf("%s://%s%s/user", c.scheme, c.host, apiBasePath)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	c.setAuthHeader(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close() //nolint:errcheck // Best effort close on error path

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

	c.setAuthHeader(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close() //nolint:errcheck // Best effort close on error path

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

	return c.execGitClone(ctx, cloneURL, absPath)
}

// buildCloneURL constructs the HTTPS clone URL with embedded credentials.
func (c *Client) buildCloneURL(org, repo string) string {
	var u url.URL
	u.Scheme = c.scheme
	u.Host = c.host
	u.Path = fmt.Sprintf("/repos/%s/%s.git", org, repo)
	u.User = url.UserPassword(c.username, c.token)
	return u.String()
}

// execGitClone runs git clone command.
func (c *Client) execGitClone(ctx context.Context, cloneURL, destPath string) error {
	gitPath, err := exec.LookPath("git")
	if err != nil {
		return ErrGitNotFound
	}

	//nolint:gosec // G204: cloneURL and destPath are constructed from validated inputs
	cmd := exec.CommandContext(ctx, gitPath, "clone", cloneURL, destPath)

	output, err := cmd.CombinedOutput()
	if err != nil {
		sanitized := sanitizeGitOutput(string(output), c.token)
		return fmt.Errorf("%w: %s", ErrGitCloneFailed, sanitized)
	}

	return nil
}

// setAuthHeader sets the authorization header for API requests.
func (c *Client) setAuthHeader(req *http.Request) {
	req.Header.Set("Authorization", "token "+c.token)
}

// pathExists checks if a file or directory exists.
func pathExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// sanitizeGitOutput removes sensitive data from git output.
func sanitizeGitOutput(output, token string) string {
	if token != "" {
		output = strings.ReplaceAll(output, token, "****")
	}
	return output
}
