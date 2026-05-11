// Package auth contains command-specific auth application logic.
package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"time"

	authstore "altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/studio"
)

var (
	// ErrUnknownEnvironment indicates that no host mapping exists for the provided environment.
	ErrUnknownEnvironment = errors.New("unknown environment")
	// ErrLoginCodeRequired indicates missing login code input.
	ErrLoginCodeRequired = errors.New("login code is required")
	// ErrInvalidToken indicates that the login code or API key validation failed.
	ErrInvalidToken = errors.New("invalid token")
	// ErrRevokeUnauthorized indicates that stored credentials can no longer authorize revocation.
	ErrRevokeUnauthorized = errors.New("revoke unauthorized")
)

const (
	studioctlTokenPath   = "/designer/api/v1/studioctl/auth/token"
	studioctlRevokePath  = "/designer/api/v1/studioctl/auth/api-key/"
	tokenExchangeTimeout = 30 * time.Second
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
	cfg *config.Config
}

// NewService creates a new auth command service.
func NewService(cfg *config.Config) *Service {
	return &Service{cfg: cfg}
}

func resolveHost(env string) (string, error) {
	host := authstore.HostForEnv(env)
	if host == "" {
		return "", fmt.Errorf("%w: %q", ErrUnknownEnvironment, env)
	}
	return host, nil
}

// ResolveLoginTarget resolves the browser login target for an environment.
func (s *Service) ResolveLoginTarget(env string) (LoginTarget, error) {
	host, err := resolveHost(env)
	if err != nil {
		return LoginTarget{}, err
	}
	return LoginTarget{Scheme: authstore.SchemeForEnv(env), Host: host}, nil
}

// ExistingLogin contains stored login details for an environment.
type ExistingLogin struct {
	Username string
	Exists   bool
}

// ExistingLogin returns stored login details for an environment, if present.
func (s *Service) ExistingLogin(env string) (ExistingLogin, error) {
	creds, err := authstore.LoadCredentials(s.cfg.Home)
	if err != nil {
		return ExistingLogin{}, fmt.Errorf("load credentials: %w", err)
	}

	envCreds, err := creds.Get(env)
	if err != nil {
		if errors.Is(err, authstore.ErrNotLoggedIn) {
			return ExistingLogin{Exists: false, Username: ""}, nil
		}
		return ExistingLogin{}, fmt.Errorf("get credentials for %s: %w", env, err)
	}

	return ExistingLogin{Exists: true, Username: envCreds.Username}, nil
}

// LoginResult contains login output details.
type LoginResult struct {
	Username            string
	RevokePreviousError string
}

// CodeExchangeRequest contains the one-time browser login code.
type CodeExchangeRequest struct {
	Env            string
	Scheme         string
	Host           string
	Code           string
	CodeVerifier   string
	AllowOverwrite bool
}

// studioctlTokenRequest is the Designer token exchange payload.
type studioctlTokenRequest struct {
	Code         string `json:"code"`
	CodeVerifier string `json:"codeVerifier"`
}

// studioctlTokenResponse is returned by Designer after a successful browser login.
type studioctlTokenResponse struct {
	Username  string `json:"username"`
	Key       string `json:"key"`
	ExpiresAt string `json:"expiresAt"`
	KeyID     int64  `json:"keyId"`
}

// ExchangeCode validates/stores credentials created by the Designer browser login flow.
func (s *Service) ExchangeCode(ctx context.Context, req CodeExchangeRequest) (LoginResult, error) {
	if req.Code == "" {
		return LoginResult{}, ErrLoginCodeRequired
	}

	creds, err := authstore.LoadCredentials(s.cfg.Home)
	if err != nil {
		return LoginResult{}, fmt.Errorf("load credentials: %w", err)
	}

	var existing *authstore.EnvCredentials
	if existingCreds, existingErr := creds.Get(req.Env); existingErr == nil {
		if !req.AllowOverwrite {
			return LoginResult{}, AlreadyLoggedInError{
				Env:      req.Env,
				Username: existingCreds.Username,
			}
		}
		existing = existingCreds
	}

	response, err := exchangeCode(ctx, authstore.SchemeOrDefault(req.Scheme), req.Host, req.Code, req.CodeVerifier)
	if err != nil {
		return LoginResult{}, err
	}

	newCreds := authstore.EnvCredentials{
		ApiKeyID:  response.KeyID,
		Scheme:    authstore.SchemeOrDefault(req.Scheme),
		Host:      req.Host,
		ApiKey:    response.Key,
		ExpiresAt: response.ExpiresAt,
		Username:  response.Username,
	}

	creds.Set(req.Env, newCreds)
	if err := authstore.SaveCredentials(s.cfg.Home, creds); err != nil {
		saveErr := fmt.Errorf("save credentials: %w", err)
		if revokeErr := revokeAPIKey(ctx, &newCreds); revokeErr != nil {
			return LoginResult{}, errors.Join(saveErr, fmt.Errorf("revoke new api key: %w", revokeErr))
		}
		return LoginResult{}, saveErr
	}

	result := LoginResult{Username: response.Username, RevokePreviousError: ""}
	if err := revokeExistingAPIKey(ctx, existing); err != nil {
		result.RevokePreviousError = err.Error()
	}

	return result, nil
}

func revokeExistingAPIKey(ctx context.Context, existing *authstore.EnvCredentials) error {
	if existing == nil {
		return nil
	}

	err := revokeAPIKey(ctx, existing)
	if err == nil || errors.Is(err, ErrRevokeUnauthorized) {
		return nil
	}
	return fmt.Errorf("revoke previous api key: %w", err)
}

func exchangeCode(
	ctx context.Context,
	scheme,
	host,
	code,
	codeVerifier string,
) (studioctlTokenResponse, error) {
	body, err := json.Marshal(studioctlTokenRequest{Code: code, CodeVerifier: codeVerifier})
	if err != nil {
		return studioctlTokenResponse{}, fmt.Errorf("marshal token request: %w", err)
	}

	httpClient := &http.Client{Timeout: tokenExchangeTimeout}
	endpoint := scheme + "://" + host + studioctlTokenPath
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return studioctlTokenResponse{}, fmt.Errorf("create token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return studioctlTokenResponse{}, fmt.Errorf("exchange login code: %w", err)
	}
	defer closeResponseBody(resp.Body)

	if resp.StatusCode == http.StatusUnauthorized {
		return studioctlTokenResponse{}, ErrInvalidToken
	}

	if resp.StatusCode != http.StatusOK {
		return studioctlTokenResponse{}, fmt.Errorf("%w %d", studio.ErrUnexpectedStatus, resp.StatusCode)
	}

	var response studioctlTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return studioctlTokenResponse{}, fmt.Errorf("decode token response: %w", err)
	}
	if response.Key == "" || response.Username == "" || response.KeyID == 0 {
		return studioctlTokenResponse{}, ErrInvalidToken
	}
	return response, nil
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
	creds, err := authstore.LoadCredentials(s.cfg.Home)
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
					Status:   validateToken(ctx, envCreds, s.cfg.Version),
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
			Status:   validateToken(ctx, envCreds, s.cfg.Version),
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
	RevokeError string
	Removed     bool
}

// Logout clears credentials for one/all environments.
func (s *Service) Logout(ctx context.Context, req LogoutRequest) (LogoutResult, error) {
	creds, err := authstore.LoadCredentials(s.cfg.Home)
	if err != nil {
		return LogoutResult{}, fmt.Errorf("load credentials: %w", err)
	}

	if req.All {
		removed, revokeErr := revokeAllAPIKeys(ctx, creds)
		if saveErr := authstore.SaveCredentials(s.cfg.Home, creds); saveErr != nil {
			return LogoutResult{}, fmt.Errorf("save credentials: %w", saveErr)
		}
		return LogoutResult{Removed: removed, RevokeError: errorString(revokeErr)}, nil
	}

	envCreds, err := creds.Get(req.Env)
	if err != nil {
		if errors.Is(err, authstore.ErrNotLoggedIn) {
			return LogoutResult{Removed: false, RevokeError: ""}, nil
		}
		return LogoutResult{}, fmt.Errorf("get credentials for %s: %w", req.Env, err)
	}

	revokeErr := revokeAPIKey(ctx, envCreds)
	if revokeErr != nil && !errors.Is(revokeErr, ErrRevokeUnauthorized) {
		return LogoutResult{Removed: false, RevokeError: errorString(revokeErr)}, nil
	}

	creds.Delete(req.Env)
	if saveErr := authstore.SaveCredentials(s.cfg.Home, creds); saveErr != nil {
		return LogoutResult{}, fmt.Errorf("save credentials: %w", saveErr)
	}

	return LogoutResult{Removed: true, RevokeError: errorString(revokeErr)}, nil
}

func revokeAllAPIKeys(ctx context.Context, creds *authstore.Credentials) (bool, error) {
	var revokeErr error
	removed := false
	for _, envName := range creds.EnvNames() {
		envCreds, err := creds.Get(envName)
		if err != nil {
			continue
		}
		if err := revokeAPIKey(ctx, envCreds); err != nil {
			if !errors.Is(err, ErrRevokeUnauthorized) {
				revokeErr = errors.Join(revokeErr, fmt.Errorf("%s: %w", envName, err))
				continue
			}
		}
		creds.Delete(envName)
		removed = true
	}
	return removed, revokeErr
}

func revokeAPIKey(ctx context.Context, creds *authstore.EnvCredentials) error {
	if creds.ApiKey == "" || creds.ApiKeyID == 0 {
		return nil
	}

	httpClient := &http.Client{Timeout: tokenExchangeTimeout}
	endpoint :=
		creds.SchemeOrDefault() + "://" + creds.Host + studioctlRevokePath + strconv.FormatInt(creds.ApiKeyID, 10)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, endpoint, nil)
	if err != nil {
		return fmt.Errorf("create revoke request: %w", err)
	}
	req.Header.Set("X-Api-Key", creds.ApiKey)

	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("revoke api key: %w", err)
	}
	defer closeResponseBody(resp.Body)

	switch resp.StatusCode {
	case http.StatusNoContent, http.StatusNotFound:
		return nil
	case http.StatusUnauthorized, http.StatusForbidden:
		return fmt.Errorf("%w %d", ErrRevokeUnauthorized, resp.StatusCode)
	default:
		return fmt.Errorf("%w %d", studio.ErrUnexpectedStatus, resp.StatusCode)
	}
}

func errorString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

func closeResponseBody(body io.Closer) {
	if err := body.Close(); err != nil {
		return
	}
}

func validateToken(ctx context.Context, creds *authstore.EnvCredentials, version config.Version) string {
	client := studio.NewClient(creds, version)
	_, err := client.GetUser(ctx)
	if err != nil {
		if errors.Is(err, studio.ErrUnauthorized) {
			return "invalid"
		}
		return "error"
	}
	return "valid"
}
