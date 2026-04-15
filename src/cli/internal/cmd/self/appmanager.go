package self

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"altinn.studio/studioctl/internal/config"
	installpkg "altinn.studio/studioctl/internal/install"
)

const appManagerAssetBaseName = "app-manager"

const (
	// Self-contained app-manager payloads are large enough that the resource installer limits are too small.
	appManagerMaxArchiveSize = 512 * 1024 * 1024
	appManagerMaxFileSize    = 256 * 1024 * 1024
)

var errAppManagerVersionRequired = errors.New("version required for app-manager install")
var errAppManagerPayloadRequired = errors.New("app-manager local source must be a payload directory or .tar.gz archive")
var errAppManagerExecutablePathDirectory = errors.New("validate app-manager payload: executable path is a directory")

var errAppManagerExecutableNotExecutable = errors.New(
	"validate app-manager payload: executable is not marked executable",
)

// InstallAppManagerResult describes the installed app-manager binary path.
type InstallAppManagerResult struct {
	InstalledPath string
}

// InstallAppManager installs the matching app-manager payload into the configured runtime directory.
func (s *Service) InstallAppManager(ctx context.Context) (result InstallAppManagerResult, err error) {
	return s.InstallAppManagerVersion(ctx, s.cfg.Version)
}

// InstallAppManagerVersion installs the app-manager payload for a specific studioctl release version.
func (s *Service) InstallAppManagerVersion(
	ctx context.Context,
	version string,
) (result InstallAppManagerResult, err error) {
	installedPath, err := s.installAppManagerPayload(ctx, version)
	if err != nil {
		return InstallAppManagerResult{}, err
	}

	return InstallAppManagerResult{InstalledPath: installedPath}, nil
}

func (s *Service) installAppManagerPayload(
	ctx context.Context,
	releaseVersion string,
) (installedPath string, err error) {
	if localSourcePath := os.Getenv(config.EnvAppManagerBinary); localSourcePath != "" {
		return s.installAppManagerFromLocalSource(localSourcePath)
	}

	if releaseVersion == "" || releaseVersion == "dev" {
		return "", errAppManagerVersionRequired
	}
	version, err := NormalizeReleaseVersion(releaseVersion)
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

	_, err = InstallTarGz(tmpPath, s.cfg.AppManagerInstallDir(), appManagerExtractOptions(), s.validatePayloadDir)
	if err != nil {
		return "", fmt.Errorf("install app-manager: %w", err)
	}
	return s.cfg.AppManagerBinaryPath(), nil
}

func (s *Service) installAppManagerFromLocalSource(localSourcePath string) (string, error) {
	//nolint:gosec // G304/G703: this is an explicit developer-supplied local path.
	info, err := os.Stat(localSourcePath)
	if err != nil {
		return "", fmt.Errorf("stat app-manager local source: %w", err)
	}

	switch {
	case info.IsDir():
		if _, err := InstallDir(localSourcePath, s.cfg.AppManagerInstallDir(), s.validatePayloadDir); err != nil {
			return "", fmt.Errorf("install app-manager from local directory: %w", err)
		}
	case strings.HasSuffix(strings.ToLower(localSourcePath), ".tar.gz"):
		if _, err := InstallTarGz(
			localSourcePath,
			s.cfg.AppManagerInstallDir(),
			appManagerExtractOptions(),
			s.validatePayloadDir,
		); err != nil {
			return "", fmt.Errorf("install app-manager from local archive: %w", err)
		}
	default:
		return "", fmt.Errorf("%w: %s", errAppManagerPayloadRequired, localSourcePath)
	}

	return s.cfg.AppManagerBinaryPath(), nil
}

func (s *Service) validatePayloadDir(payloadDir string) error {
	binaryPath := filepath.Join(payloadDir, filepath.Base(s.cfg.AppManagerBinaryPath()))
	info, err := os.Stat(binaryPath)
	if err != nil {
		return fmt.Errorf("validate app-manager payload: missing executable %q: %w", binaryPath, err)
	}
	if info.IsDir() {
		return fmt.Errorf("%w: %s", errAppManagerExecutablePathDirectory, binaryPath)
	}
	if runtime.GOOS != "windows" && info.Mode()&0o111 == 0 {
		return fmt.Errorf("%w: %s", errAppManagerExecutableNotExecutable, binaryPath)
	}
	return nil
}

func appManagerExtractOptions() installpkg.ExtractTarGzOptions {
	return installpkg.ExtractTarGzOptions{
		MaxArchiveSize:   appManagerMaxArchiveSize,
		MaxFileSize:      appManagerMaxFileSize,
		PreserveFileMode: true,
	}
}

// AppManagerAssetName returns the release asset name for app-manager on the given platform.
func AppManagerAssetName(goos, goarch string) (string, error) {
	assetName, err := baseAssetName(appManagerAssetBaseName, goos, goarch)
	if err != nil {
		return "", err
	}
	return assetName + ".tar.gz", nil
}
