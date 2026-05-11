package install

import (
	"fmt"
	"os"
	"path/filepath"

	"altinn.studio/studioctl/internal/osutil"
)

const releaseNotesFileName = "release-notes.md"

// ResourcesArchiveOptions describes the inputs needed to create a resources archive.
type ResourcesArchiveOptions struct {
	GOOS         string
	GOARCH       string
	OutputDir    string
	ServerDir    string
	LocaltestDir string
}

// CreateResourcesArchive creates a studioctl resources archive for a target platform.
func CreateResourcesArchive(opts ResourcesArchiveOptions) (path string, err error) {
	archiveName, err := resourcesArchiveAssetName(opts.GOOS, opts.GOARCH)
	if err != nil {
		return "", err
	}

	stagingDir := filepath.Join(opts.OutputDir, ".resources-"+opts.GOOS+"-"+opts.GOARCH)
	if removeErr := os.RemoveAll(stagingDir); removeErr != nil {
		return "", fmt.Errorf("clean resources staging dir: %w", removeErr)
	}
	defer func() {
		if removeErr := os.RemoveAll(stagingDir); removeErr != nil && err == nil {
			err = fmt.Errorf("remove resources staging dir: %w", removeErr)
		}
	}()

	if err := os.MkdirAll(stagingDir, osutil.DirPermDefault); err != nil {
		return "", fmt.Errorf("create resources staging dir: %w", err)
	}

	archivePath := filepath.Join(opts.OutputDir, archiveName)
	if err := copyDir(opts.ServerDir, filepath.Join(stagingDir, resourcesServerDir)); err != nil {
		return "", fmt.Errorf("stage %s: %w", resourcesServerDir, err)
	}
	if err := stageLocaltestResources(
		opts.LocaltestDir,
		filepath.Join(stagingDir, resourcesLocaltestDir),
	); err != nil {
		return "", err
	}
	if err := createTarGz(archivePath, stagingDir, resourcesServerDir, resourcesLocaltestDir); err != nil {
		return "", fmt.Errorf("create resources archive: %w", err)
	}
	return archivePath, nil
}

// CreateReleaseArtifacts writes install scripts and checksums for a studioctl release.
func CreateReleaseArtifacts(outputDir, buildVersion string) ([]string, error) {
	releaseTag, err := studioctlReleaseTag(buildVersion)
	if err != nil {
		return nil, err
	}
	releaseInstallScripts := []string{
		filepath.Join("cmd", "studioctl", "install.sh"),
		filepath.Join("cmd", "studioctl", "install.ps1"),
	}
	artifacts := make([]string, 0, len(releaseInstallScripts)+1)
	for _, script := range releaseInstallScripts {
		scriptPath, err := copyInstallScript(script, outputDir, releaseTag)
		if err != nil {
			return nil, err
		}
		artifacts = append(artifacts, scriptPath)
	}

	if err := writeSHA256SUMS(outputDir, checksumAssetName, map[string]bool{
		checksumAssetName:    true,
		releaseNotesFileName: true,
	}); err != nil {
		return nil, fmt.Errorf("generate checksums: %w", err)
	}
	artifacts = append(artifacts, filepath.Join(outputDir, checksumAssetName))
	return artifacts, nil
}
