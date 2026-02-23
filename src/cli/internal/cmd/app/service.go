// Package app contains command-specific app application logic.
package app

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"

	"altinn.studio/studioctl/internal/auth"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/studio"
)

// ErrNotLoggedIn indicates missing credentials for the requested environment.
var ErrNotLoggedIn = errors.New("not logged in")

// Service contains app command logic.
type Service struct {
	credentialsHome string
}

// NewService creates a new app command service.
func NewService(credentialsHome string) *Service {
	return &Service{credentialsHome: credentialsHome}
}

// UpdateResult contains detected app location for update flow.
type UpdateResult struct {
	AppPath string
}

// ResolveUpdateTarget resolves the app path for the update command.
func (s *Service) ResolveUpdateTarget(ctx context.Context, appPath string) (UpdateResult, error) {
	detection, err := repocontext.DetectFromCwd(ctx, appPath)
	if err != nil {
		return UpdateResult{}, fmt.Errorf("detect app: %w", err)
	}
	if !detection.InAppRepo {
		return UpdateResult{}, repocontext.ErrAppNotFound
	}

	return UpdateResult{AppPath: detection.AppRoot}, nil
}

// CloneRequest contains clone inputs.
type CloneRequest struct {
	Destination string
	Env         string
	Org         string
	Repo        string
}

// CloneResult contains clone output metadata.
type CloneResult struct {
	AbsPath string
}

// ResolveHost resolves the configured host for an environment.
func (s *Service) ResolveHost(env string) (string, error) {
	creds, err := auth.LoadCredentials(s.credentialsHome)
	if err != nil {
		return "", fmt.Errorf("load credentials: %w", err)
	}

	envCreds, err := creds.Get(env)
	if err != nil {
		if errors.Is(err, auth.ErrNotLoggedIn) {
			return "", fmt.Errorf("%w: %s", ErrNotLoggedIn, env)
		}
		return "", fmt.Errorf("get credentials for %s: %w", env, err)
	}

	return envCreds.Host, nil
}

// Clone clones an app repository and returns destination metadata.
func (s *Service) Clone(ctx context.Context, req CloneRequest) (CloneResult, error) {
	creds, err := auth.LoadCredentials(s.credentialsHome)
	if err != nil {
		return CloneResult{}, fmt.Errorf("load credentials: %w", err)
	}

	envCreds, err := creds.Get(req.Env)
	if err != nil {
		if errors.Is(err, auth.ErrNotLoggedIn) {
			return CloneResult{}, fmt.Errorf("%w: %s", ErrNotLoggedIn, req.Env)
		}
		return CloneResult{}, fmt.Errorf("get credentials for %s: %w", req.Env, err)
	}

	client := studio.NewClient(envCreds)
	cloneErr := client.CloneRepo(ctx, req.Org, req.Repo, req.Destination)
	if cloneErr != nil {
		return CloneResult{}, fmt.Errorf("clone repo: %w", cloneErr)
	}

	absPath, err := filepath.Abs(req.Destination)
	if err != nil {
		absPath = req.Destination
	}

	return CloneResult{
		AbsPath: absPath,
	}, nil
}
