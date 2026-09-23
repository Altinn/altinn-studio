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
	appID, err := ReadAppID(appPath)
	if err != nil {
		return "", fmt.Errorf("read app id: %w", err)
	}
	dir, err := s.cfg.AppSecretsDir(appID)
	if err != nil {
		return "", fmt.Errorf("place app secrets: %w", err)
	}
	return dir, nil
}

// ensureAppSecretsDir places the app's secrets directory and creates it, owner-only, before anything is
// written into it or an app is told to read from it. Every local run has one - the app libraries require the
// platform to name the directory whether or not anything is stored in it yet - so this is the single place
// it comes into existence, and a run that cannot have one says so instead of starting without it.
func (s *Service) ensureAppSecretsDir(appPath string) (string, error) {
	dir, err := s.AppSecretsDir(appPath)
	if err != nil {
		return "", err
	}
	if err := appsecrets.EnsureDir(dir); err != nil {
		return "", fmt.Errorf("prepare the app's secrets directory: %w", err)
	}
	return dir, nil
}

// provisionAppSecrets fills the app's secrets directory with what studioctl provisions for every local run,
// the way the operator provisions a deployed app's secrets mount before the app starts. Today that is the
// development app codes, which a v9 app reads at startup and refuses to start without; the Maskinporten
// client is the developer's to store. The directory is the one ensureAppSecretsDir has just created, so
// there is nothing to skip: a failure here is a failure to start the app.
func (s *Service) provisionAppSecrets(dir string) error {
	if err := appsecrets.WriteDevelopmentAppCodes(dir); err != nil {
		return fmt.Errorf("provision app secrets: %w", err)
	}
	return nil
}

// appKeysDirOrEmpty is the containerized run's data-protection keys directory, which is optional: a native
// run deliberately leaves the app libraries' own default in place, and a container run mounts one only when
// there is somewhere to put it.
func (s *Service) appKeysDirOrEmpty(appPath string) string {
	if s.cfg == nil || s.cfg.Home == "" {
		return ""
	}
	appID, err := ReadAppID(appPath)
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
	appID, err := ReadAppID(filepath.Clean(appPath))
	if err != nil {
		return "", "", fmt.Errorf("read app id: %w", err)
	}
	dir, err := s.AppSecretsDir(appPath)
	if err != nil {
		return "", "", err
	}
	return appID, dir, nil
}
