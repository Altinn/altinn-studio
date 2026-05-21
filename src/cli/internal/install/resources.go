package install

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	resourcesArchiveAssetBaseName = "studioctl-resources"
	resourcesServerDir            = config.StudioctlServerResourcesDirName
	resourcesLocaltestDir         = "localtest"
	resourcesTestdataDir          = "testdata"
	resourcesInfraDir             = "infra"
)

const (
	resourcesArchiveMaxSize = 512 * 1024 * 1024
	resourcesMaxFileSize    = 256 * 1024 * 1024
)

var errResourcesVersionRequired = errors.New("version required for resources install")
var errStudioctlServerExecutablePathDirectory = errors.New(
	"validate " + config.StudioctlServerName + " payload: executable path is a directory",
)

var errStudioctlServerExecutableNotExecutable = errors.New(
	"validate " + config.StudioctlServerName + " payload: executable is not marked executable",
)

// InstallBundleResources installs the bundle resources.
func (s *Service) InstallBundleResources(ctx context.Context, bundle Bundle) (err error) {
	resourcesArchivePath := bundle.ResourcesArchivePath
	cleanup := func() error { return nil }
	defer func() {
		if cleanupErr := cleanup(); cleanupErr != nil {
			err = errors.Join(err, cleanupErr)
		}
	}()
	if resourcesArchivePath == "" {
		var downloadCleanup func() error
		resourcesArchivePath, downloadCleanup, err = bundle.downloadResourcesArchive(ctx)
		if downloadCleanup != nil {
			cleanup = downloadCleanup
		}
		if err != nil {
			return err
		}
	}

	stagingDir, err := os.MkdirTemp("", "studioctl-resources-*")
	if err != nil {
		return fmt.Errorf("create resources staging dir: %w", err)
	}
	defer func() {
		if removeErr := os.RemoveAll(stagingDir); removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
			err = errors.Join(err, fmt.Errorf("remove resources staging dir: %w", removeErr))
		}
	}()

	if err := extractTarGzFile(resourcesArchivePath, stagingDir, resourcesArchiveExtractOptions()); err != nil {
		return fmt.Errorf("extract resources archive: %w", err)
	}

	serverDir := filepath.Join(stagingDir, resourcesServerDir)
	if _, err := installDir(serverDir, s.cfg.StudioctlServerInstallDir(), s.validatePayloadDir); err != nil {
		return fmt.Errorf("install %s: %w", resourcesServerDir, err)
	}

	if err := copyDir(filepath.Join(stagingDir, resourcesLocaltestDir), s.cfg.DataDir); err != nil {
		return fmt.Errorf("install resources: %w", err)
	}
	if s.installHooks != nil {
		if err := s.installHooks(ctx); err != nil {
			return fmt.Errorf("prepare resources: %w", err)
		}
	}
	return nil
}

func (b Bundle) downloadResourcesArchive(ctx context.Context) (path string, cleanup func() error, err error) {
	if b.Version == "" || b.Version == "dev" {
		return "", nil, errResourcesVersionRequired
	}
	version, err := normalizeReleaseVersion(b.Version)
	if err != nil {
		return "", nil, fmt.Errorf("normalize resources version: %w", err)
	}

	assetName, err := resourcesArchiveAssetName(runtime.GOOS, runtime.GOARCH)
	if err != nil {
		return "", nil, err
	}

	assetBaseURL, checksumsURL := releaseURLs(defaultUpdateRepo, version)
	downloads := newHTTPDownloader(config.NewVersion(b.Version))
	tempDir, err := os.MkdirTemp("", "studioctl-resources-*")
	if err != nil {
		return "", nil, fmt.Errorf("create resources temp dir: %w", err)
	}
	cleanup = func() error {
		if removeErr := os.RemoveAll(tempDir); removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
			return fmt.Errorf("remove resources temp dir: %w", removeErr)
		}
		return nil
	}

	tmpPath := filepath.Join(tempDir, assetName)
	if err := downloads.downloadToFile(ctx, assetBaseURL+"/"+assetName, tmpPath); err != nil {
		return "", cleanup, fmt.Errorf("download resources archive: %w", err)
	}
	if err := downloads.verifyAssetChecksum(ctx, checksumsURL, assetName, tmpPath); err != nil {
		return "", cleanup, fmt.Errorf("verify resources archive checksum: %w", err)
	}

	return tmpPath, cleanup, nil
}

func (s *Service) validatePayloadDir(payloadDir string) error {
	binaryPath := filepath.Join(payloadDir, filepath.Base(s.cfg.StudioctlServerBinaryPath()))
	info, err := os.Stat(binaryPath)
	if err != nil {
		return fmt.Errorf("validate %s payload: missing executable %q: %w", config.StudioctlServerName, binaryPath, err)
	}
	if info.IsDir() {
		return fmt.Errorf("%w: %s", errStudioctlServerExecutablePathDirectory, binaryPath)
	}
	if runtime.GOOS != osutil.OSWindows && info.Mode()&0o111 == 0 {
		return fmt.Errorf("%w: %s", errStudioctlServerExecutableNotExecutable, binaryPath)
	}
	return nil
}

func resourcesArchiveExtractOptions() extractTarGzOptions {
	return extractTarGzOptions{
		MaxArchiveSize:   resourcesArchiveMaxSize,
		MaxFileSize:      resourcesMaxFileSize,
		PreserveFileMode: true,
	}
}

func stageLocaltestResources(srcLocaltestDir, dstLocaltestDir string) error {
	testdataSrc := filepath.Join(srcLocaltestDir, resourcesTestdataDir)
	testdataDst := filepath.Join(dstLocaltestDir, resourcesTestdataDir)
	if err := copyDir(testdataSrc, testdataDst); err != nil {
		return fmt.Errorf("stage localtest testdata: %w", err)
	}
	infraSrc := filepath.Join(srcLocaltestDir, resourcesInfraDir)
	infraDst := filepath.Join(dstLocaltestDir, resourcesInfraDir)
	if err := copyDir(infraSrc, infraDst); err != nil {
		return fmt.Errorf("stage localtest infra: %w", err)
	}
	return nil
}

func resourcesArchiveAssetName(goos, goarch string) (string, error) {
	assetName, err := baseAssetName(resourcesArchiveAssetBaseName, goos, goarch)
	if err != nil {
		return "", err
	}
	return assetName + ".tar.gz", nil
}
