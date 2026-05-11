package auth

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"strings"

	authstore "altinn.studio/studioctl/internal/auth"
)

// GitCredentialResult contains credentials returned to Git.
type GitCredentialResult struct {
	Username string
	Password string
	Found    bool
}

type gitCredentialRequest struct {
	Protocol string
	Host     string
	Path     string
}

// GitCredential resolves a Git credential-helper request against stored studioctl credentials.
func (s *Service) GitCredential(input io.Reader, env string) (GitCredentialResult, error) {
	request, err := readGitCredentialRequest(input)
	if err != nil {
		return GitCredentialResult{}, err
	}

	creds, err := authstore.LoadCredentials(s.cfg.Home)
	if err != nil {
		return GitCredentialResult{}, fmt.Errorf("load credentials: %w", err)
	}
	envCreds, err := creds.Get(env)
	if err != nil {
		if errors.Is(err, authstore.ErrNotLoggedIn) {
			return GitCredentialResult{Username: "", Password: "", Found: false}, nil
		}
		return GitCredentialResult{}, fmt.Errorf("get credentials for %s: %w", env, err)
	}
	if !matchesGitCredentialRequest(request, envCreds.SchemeOrDefault(), envCreds.Host) {
		return GitCredentialResult{Username: "", Password: "", Found: false}, nil
	}

	return GitCredentialResult{
		Found:    true,
		Username: envCreds.Username,
		Password: envCreds.ApiKey,
	}, nil
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
	parts := strings.Split(path, "/")
	if len(parts) != 3 || parts[0] != "repos" || parts[1] == "" || parts[2] == "" {
		return false
	}
	return parts[2] != ".git"
}
