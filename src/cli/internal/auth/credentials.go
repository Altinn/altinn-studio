// Package auth provides authentication management for studioctl.
package auth

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"

	"altinn.studio/studioctl/internal/osutil"
)

const (
	// credentialsFileName is the name of the credentials file in the studioctl home directory.
	credentialsFileName = "credentials.yaml"

	// DefaultEnv is the default environment name.
	DefaultEnv = "prod"

	// DefaultHost is the default Altinn Studio host.
	DefaultHost = "altinn.studio"
)

// Known environments with their default hosts.
//
//nolint:gochecknoglobals // Acts as constant lookup table for known environments
var knownEnvHosts = map[string]string{
	"prod":    "altinn.studio",
	"dev":     "dev.altinn.studio",
	"staging": "staging.altinn.studio",
}

// Sentinel errors for authentication.
var (
	// ErrNotLoggedIn is returned when credentials are not found for an environment.
	ErrNotLoggedIn = errors.New("not logged in")

	// ErrInvalidToken is returned when a token is invalid or expired.
	ErrInvalidToken = errors.New("invalid or expired token")
)

// Credentials is the root structure for the credentials file.
type Credentials struct {
	Envs map[string]EnvCredentials `yaml:"envs,omitempty"`
}

// EnvCredentials holds credentials for a specific environment.
type EnvCredentials struct {
	Host     string `yaml:"host"`     // e.g., "altinn.studio"
	Token    string `yaml:"token"`    // Personal Access Token
	Username string `yaml:"username"` // Retrieved from API validation
}

// CredentialsPath returns the full path to the credentials file.
func CredentialsPath(homeDir string) string {
	return filepath.Join(homeDir, credentialsFileName)
}

// LoadCredentials loads credentials from the studioctl home directory.
// Returns empty credentials if the file doesn't exist.
func LoadCredentials(homeDir string) (*Credentials, error) {
	creds := &Credentials{
		Envs: make(map[string]EnvCredentials),
	}

	credPath := CredentialsPath(homeDir)
	//nolint:gosec // G304: credPath is constructed from trusted homeDir
	data, err := os.ReadFile(credPath)
	if err != nil {
		if os.IsNotExist(err) {
			return creds, nil
		}
		return nil, fmt.Errorf("read credentials file: %w", err)
	}

	if err := yaml.Unmarshal(data, creds); err != nil {
		return nil, fmt.Errorf("parse credentials file: %w", err)
	}

	if creds.Envs == nil {
		creds.Envs = make(map[string]EnvCredentials)
	}

	return creds, nil
}

// SaveCredentials saves credentials to the studioctl home directory.
// Uses owner-only permissions for security (Unix mode + Windows ACLs).
func SaveCredentials(homeDir string, creds *Credentials) error {
	credPath := CredentialsPath(homeDir)

	data, err := yaml.Marshal(creds)
	if err != nil {
		return fmt.Errorf("marshal credentials: %w", err)
	}

	if err := os.WriteFile(credPath, data, osutil.FilePermOwnerOnly); err != nil {
		return fmt.Errorf("write credentials file: %w", err)
	}

	// On Windows, file mode is ignored; set ACLs explicitly
	if err := osutil.SecureFile(credPath); err != nil {
		return fmt.Errorf("secure credentials file: %w", err)
	}

	return nil
}

// Get returns credentials for the specified environment.
// Returns ErrNotLoggedIn if no credentials exist for that environment.
func (c *Credentials) Get(env string) (*EnvCredentials, error) {
	if c.Envs == nil {
		return nil, ErrNotLoggedIn
	}
	cred, ok := c.Envs[env]
	if !ok {
		return nil, ErrNotLoggedIn
	}
	return &cred, nil
}

// Set stores credentials for the specified environment.
func (c *Credentials) Set(env string, cred EnvCredentials) {
	if c.Envs == nil {
		c.Envs = make(map[string]EnvCredentials)
	}
	c.Envs[env] = cred
}

// Delete removes credentials for the specified environment.
func (c *Credentials) Delete(env string) {
	if c.Envs != nil {
		delete(c.Envs, env)
	}
}

// DeleteAll removes all stored credentials.
func (c *Credentials) DeleteAll() {
	c.Envs = make(map[string]EnvCredentials)
}

// HasCredentials returns true if any credentials are stored.
func (c *Credentials) HasCredentials() bool {
	return len(c.Envs) > 0
}

// EnvNames returns a list of all environment names with stored credentials.
func (c *Credentials) EnvNames() []string {
	if c.Envs == nil {
		return nil
	}
	names := make([]string, 0, len(c.Envs))
	for name := range c.Envs {
		names = append(names, name)
	}
	return names
}

// HostForEnv returns the default host for a known environment.
// Returns an empty string if the environment is unknown.
func HostForEnv(env string) string {
	if host, ok := knownEnvHosts[env]; ok {
		return host
	}
	return ""
}
