package auth

import (
	"errors"
	"fmt"

	authstore "altinn.studio/studioctl/internal/auth"
)

// ErrNotLoggedIn indicates that no API key is stored for the environment.
var ErrNotLoggedIn = errors.New("not logged in")

// Token returns the API key stored for an environment. It reads only the credentials file, so it works offline
// and leaves checking whether the key is still valid to Studio, as the commands that use the key do.
func (s *Service) Token(env string) (string, error) {
	creds, err := authstore.LoadCredentials(s.cfg.Home)
	if err != nil {
		return "", fmt.Errorf("load credentials: %w", err)
	}
	envCreds, err := creds.Get(env)
	if err != nil {
		if errors.Is(err, authstore.ErrNotLoggedIn) {
			return "", ErrNotLoggedIn
		}
		return "", fmt.Errorf("get credentials for %s: %w", env, err)
	}
	if envCreds.ApiKey == "" {
		return "", ErrNotLoggedIn
	}
	return envCreds.ApiKey, nil
}
