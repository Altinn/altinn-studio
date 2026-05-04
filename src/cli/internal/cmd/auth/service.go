// Package auth contains command-specific auth application logic.
package auth

import (
	"context"
	"errors"
	"fmt"
	"sort"

	authstore "altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/studio"
)

var (
	// ErrUnknownEnvironment indicates that no host mapping exists for the provided environment.
	ErrUnknownEnvironment = errors.New("unknown environment")
	// ErrTokenRequired indicates missing login token input.
	ErrTokenRequired = errors.New("token is required")
	// ErrInvalidToken indicates that token validation failed with unauthorized response.
	ErrInvalidToken = errors.New("invalid token")
)

// AlreadyLoggedInError indicates credentials already exist for the environment.
type AlreadyLoggedInError struct {
	Env      string
	Username string
}

func (e AlreadyLoggedInError) Error() string {
	return fmt.Sprintf("already logged in to %s as %s", e.Env, e.Username)
}

// Service contains auth command logic.
type Service struct {
	credentialsHome string
}

// NewService creates a new auth command service.
func NewService(credentialsHome string) *Service {
	return &Service{credentialsHome: credentialsHome}
}

// ResolveHost resolves the effective host based on env and explicit override.
func (s *Service) ResolveHost(env, override string) (string, error) {
	if override != "" {
		return override, nil
	}

	host := authstore.HostForEnv(env)
	if host == "" {
		return "", fmt.Errorf("%w: %q", ErrUnknownEnvironment, env)
	}
	return host, nil
}

// LoginRequest contains login inputs.
type LoginRequest struct {
	Env            string
	Host           string
	Token          string
	AllowOverwrite bool
}

// LoginResult contains login output details.
type LoginResult struct {
	Username string
}

// Login validates/stores credentials for one environment.
func (s *Service) Login(ctx context.Context, req LoginRequest) (LoginResult, error) {
	if req.Token == "" {
		return LoginResult{}, ErrTokenRequired
	}

	creds, err := authstore.LoadCredentials(s.credentialsHome)
	if err != nil {
		return LoginResult{}, fmt.Errorf("load credentials: %w", err)
	}

	if existing, existingErr := creds.Get(req.Env); existingErr == nil && !req.AllowOverwrite {
		return LoginResult{}, AlreadyLoggedInError{
			Env:      req.Env,
			Username: existing.Username,
		}
	}

	client := studio.NewClientWithHTTP(req.Host, req.Token, "", nil)
	user, err := client.GetUser(ctx)
	if err != nil {
		if errors.Is(err, studio.ErrUnauthorized) {
			return LoginResult{}, fmt.Errorf("%w: authentication failed", ErrInvalidToken)
		}
		return LoginResult{}, fmt.Errorf("validate token: %w", err)
	}

	creds.Set(req.Env, authstore.EnvCredentials{
		Host:     req.Host,
		Token:    req.Token,
		Username: user.Login,
	})
	if err := authstore.SaveCredentials(s.credentialsHome, creds); err != nil {
		return LoginResult{}, fmt.Errorf("save credentials: %w", err)
	}

	return LoginResult{Username: user.Login}, nil
}

// StatusRequest contains filters for status query.
type StatusRequest struct {
	Env string
}

// StatusEnvironment is one environment auth status entry.
type StatusEnvironment struct {
	Env      string `json:"env"`
	Host     string `json:"host"`
	Username string `json:"username"`
	Status   string `json:"status"`
}

// StatusResult contains auth status query result.
type StatusResult struct {
	MissingEnv   string              `json:"missingEnv,omitempty"`
	Environments []StatusEnvironment `json:"environments"`
}

// Status returns auth status for one/all environments.
func (s *Service) Status(ctx context.Context, req StatusRequest) (StatusResult, error) {
	creds, err := authstore.LoadCredentials(s.credentialsHome)
	if err != nil {
		return StatusResult{}, fmt.Errorf("load credentials: %w", err)
	}

	if !creds.HasCredentials() {
		return StatusResult{
			MissingEnv:   "",
			Environments: make([]StatusEnvironment, 0),
		}, nil
	}

	if req.Env != "" {
		envCreds, err := creds.Get(req.Env)
		if err != nil {
			if errors.Is(err, authstore.ErrNotLoggedIn) {
				return StatusResult{
					Environments: make([]StatusEnvironment, 0),
					MissingEnv:   req.Env,
				}, nil
			}
			return StatusResult{}, fmt.Errorf("get credentials for %s: %w", req.Env, err)
		}

		return StatusResult{
			MissingEnv: "",
			Environments: []StatusEnvironment{
				{
					Env:      req.Env,
					Host:     envCreds.Host,
					Username: envCreds.Username,
					Status:   validateToken(ctx, envCreds),
				},
			},
		}, nil
	}

	envNames := creds.EnvNames()
	sort.Strings(envNames)
	envs := make([]StatusEnvironment, 0, len(envNames))
	for _, envName := range envNames {
		envCreds, err := creds.Get(envName)
		if err != nil {
			continue
		}

		envs = append(envs, StatusEnvironment{
			Env:      envName,
			Host:     envCreds.Host,
			Username: envCreds.Username,
			Status:   validateToken(ctx, envCreds),
		})
	}

	return StatusResult{
		MissingEnv:   "",
		Environments: envs,
	}, nil
}

// LogoutRequest contains logout inputs.
type LogoutRequest struct {
	Env string
	All bool
}

// LogoutResult contains logout output details.
type LogoutResult struct {
	Removed bool
}

// Logout clears credentials for one/all environments.
func (s *Service) Logout(req LogoutRequest) (LogoutResult, error) {
	creds, err := authstore.LoadCredentials(s.credentialsHome)
	if err != nil {
		return LogoutResult{}, fmt.Errorf("load credentials: %w", err)
	}

	if req.All {
		creds.DeleteAll()
		if err := authstore.SaveCredentials(s.credentialsHome, creds); err != nil {
			return LogoutResult{}, fmt.Errorf("save credentials: %w", err)
		}
		return LogoutResult{Removed: true}, nil
	}

	if _, err := creds.Get(req.Env); err != nil {
		if errors.Is(err, authstore.ErrNotLoggedIn) {
			return LogoutResult{Removed: false}, nil
		}
		return LogoutResult{}, fmt.Errorf("get credentials for %s: %w", req.Env, err)
	}

	creds.Delete(req.Env)
	if err := authstore.SaveCredentials(s.credentialsHome, creds); err != nil {
		return LogoutResult{}, fmt.Errorf("save credentials: %w", err)
	}

	return LogoutResult{Removed: true}, nil
}

func validateToken(ctx context.Context, creds *authstore.EnvCredentials) string {
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
