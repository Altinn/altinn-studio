package app

import (
	"errors"
	"fmt"
	"path/filepath"

	"altinn.studio/studioctl/internal/appsecrets"
)

// errStudioctlHomeRequired is returned when the app's secrets directory cannot be placed.
var errStudioctlHomeRequired = errors.New("studioctl home directory is not configured")

// MaskinportenClientRequest carries the credentials to store for an app.
type MaskinportenClientRequest struct {
	AppPath string
	// Input is the client as JSON in any shape ParseMaskinportenClient accepts.
	Input []byte
}

// MaskinportenClientResult describes the client stored for an app, without its key material.
type MaskinportenClientResult struct {
	appsecrets.MaskinportenClientSummary

	AppID string `json:"appId"`
}

// MaskinportenClientRemoval reports the outcome of removing an app's stored client.
type MaskinportenClientRemoval struct {
	AppID   string `json:"appId"`
	Removed bool   `json:"removed"`
}

// AppSecretsDir returns the directory studioctl provisions the app's secrets into.
func (s *Service) AppSecretsDir(appPath string) (string, error) {
	if s.cfg == nil || s.cfg.Home == "" {
		return "", errStudioctlHomeRequired
	}
	appID, err := readAppID(appPath)
	if err != nil {
		return "", fmt.Errorf("read app id: %w", err)
	}
	dir, err := s.cfg.AppSecretsDir(appID)
	if err != nil {
		return "", fmt.Errorf("place app secrets: %w", err)
	}
	return dir, nil
}

// appSecretsDirOrEmpty is AppSecretsDir for the run and env specs, which are built for app directories
// that may lack metadata: with nothing to key the directory on, no directory is named.
func (s *Service) appSecretsDirOrEmpty(appPath string) string {
	dir, err := s.AppSecretsDir(appPath)
	if err != nil {
		return ""
	}
	return dir
}

// appKeysDirOrEmpty is the containerized run's data-protection keys directory, on the same terms.
func (s *Service) appKeysDirOrEmpty(appPath string) string {
	if s.cfg == nil || s.cfg.Home == "" {
		return ""
	}
	appID, err := readAppID(appPath)
	if err != nil {
		return ""
	}
	dir, err := s.cfg.AppKeysDir(appID)
	if err != nil {
		return ""
	}
	return dir
}

// StoreMaskinportenClient validates the supplied credentials and stores them as the app's client.
func (s *Service) StoreMaskinportenClient(req MaskinportenClientRequest) (MaskinportenClientResult, error) {
	appID, dir, err := s.resolveAppSecrets(req.AppPath)
	if err != nil {
		return MaskinportenClientResult{}, err
	}

	client, err := appsecrets.ParseMaskinportenClient(req.Input)
	if err != nil {
		return MaskinportenClientResult{}, fmt.Errorf("read Maskinporten client: %w", err)
	}

	if _, err := appsecrets.StoreMaskinportenClient(dir, client); err != nil {
		return MaskinportenClientResult{}, fmt.Errorf("store Maskinporten client for %s: %w", appID, err)
	}
	return MaskinportenClientResult{MaskinportenClientSummary: client.Summary(), AppID: appID}, nil
}

// ShowMaskinportenClient describes the app's stored client, or returns appsecrets.ErrNoMaskinportenClient.
func (s *Service) ShowMaskinportenClient(appPath string) (MaskinportenClientResult, error) {
	appID, dir, err := s.resolveAppSecrets(appPath)
	if err != nil {
		return MaskinportenClientResult{}, err
	}
	client, err := appsecrets.LoadMaskinportenClient(dir)
	if err != nil {
		return MaskinportenClientResult{}, fmt.Errorf("%s: %w", appID, err)
	}
	return MaskinportenClientResult{MaskinportenClientSummary: client.Summary(), AppID: appID}, nil
}

// RemoveMaskinportenClient deletes the app's stored client, if any.
func (s *Service) RemoveMaskinportenClient(appPath string) (MaskinportenClientRemoval, error) {
	appID, dir, err := s.resolveAppSecrets(appPath)
	if err != nil {
		return MaskinportenClientRemoval{}, err
	}
	removed, err := appsecrets.RemoveMaskinportenClient(dir)
	if err != nil {
		return MaskinportenClientRemoval{}, fmt.Errorf("%s: %w", appID, err)
	}
	return MaskinportenClientRemoval{AppID: appID, Removed: removed}, nil
}

func (s *Service) resolveAppSecrets(appPath string) (string, string, error) {
	appID, err := readAppID(filepath.Clean(appPath))
	if err != nil {
		return "", "", fmt.Errorf("read app id: %w", err)
	}
	dir, err := s.AppSecretsDir(appPath)
	if err != nil {
		return "", "", err
	}
	return appID, dir, nil
}
