package self

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"altinn.studio/studioctl/internal/config"
)

const appManagerAssetBaseName = "app-manager"

var errAppManagerVersionRequired = errors.New("version required for app-manager install")

// InstallAppManagerResult describes the installed app-manager binary path.
type InstallAppManagerResult struct {
	InstalledPath string
}

// InstallAppManager installs the matching app-manager binary into the configured bin directory.
func (s *Service) InstallAppManager(ctx context.Context) (result InstallAppManagerResult, err error) {
	installedPath, err := s.installAppManagerBinary(ctx)
	if err != nil {
		return InstallAppManagerResult{}, err
	}

	return InstallAppManagerResult{InstalledPath: installedPath}, nil
}

func (s *Service) installAppManagerBinary(ctx context.Context) (installedPath string, err error) {
	if localBinaryPath := os.Getenv(config.EnvAppManagerBinary); localBinaryPath != "" {
		return s.installAppManagerFromLocalBinary(localBinaryPath)
	}

	if s.cfg.Version == "" || s.cfg.Version == "dev" {
		return "", errAppManagerVersionRequired
	}
	version, err := NormalizeReleaseVersion(s.cfg.Version)
	if err != nil {
		return "", fmt.Errorf("normalize app-manager version: %w", err)
	}

	assetName, err := AppManagerAssetName(runtime.GOOS, runtime.GOARCH)
	if err != nil {
		return "", err
	}

	binaryBaseURL, checksumsURL := ReleaseURLs(defaultUpdateRepo, version)
	tempDir, err := os.MkdirTemp("", "studioctl-app-manager-*")
	if err != nil {
		return "", fmt.Errorf("create app-manager temp dir: %w", err)
	}
	defer func() {
		removeErr := os.RemoveAll(tempDir)
		if removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
			err = errors.Join(err, fmt.Errorf("remove app-manager temp dir: %w", removeErr))
		}
	}()

	tmpPath := filepath.Join(tempDir, assetName)
	if downloadErr := downloadToFile(ctx, binaryBaseURL+"/"+assetName, tmpPath); downloadErr != nil {
		return "", fmt.Errorf("download app-manager: %w", downloadErr)
	}

	if verifyErr := verifyAssetChecksum(ctx, checksumsURL, assetName, tmpPath); verifyErr != nil {
		return "", fmt.Errorf("verify app-manager checksum: %w", verifyErr)
	}

	installedPath, err = InstallFile(tmpPath, s.cfg.AppManagerBinaryPath())
	if err != nil {
		return "", fmt.Errorf("install app-manager: %w", err)
	}
	return installedPath, nil
}

func (s *Service) installAppManagerFromLocalBinary(localBinaryPath string) (string, error) {
	installedPath, err := InstallFile(localBinaryPath, s.cfg.AppManagerBinaryPath())
	if err != nil {
		return "", fmt.Errorf("install app-manager from local binary: %w", err)
	}
	return installedPath, nil
}

// AppManagerAssetName returns the release asset name for app-manager on the given platform.
func AppManagerAssetName(goos, goarch string) (string, error) {
	return defaultAssetName(appManagerAssetBaseName, goos, goarch)
}
