package install

import (
	"fmt"
	"os"
	"path/filepath"

	agentskills "altinn.studio/studioctl/internal/cmd/agent/skills"
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
	ResourcesDir string
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

	if mkdirErr := os.MkdirAll(stagingDir, osutil.DirPermDefault); mkdirErr != nil {
		return "", fmt.Errorf("create resources staging dir: %w", mkdirErr)
	}

	archivePath := filepath.Join(opts.OutputDir, archiveName)
	if copyErr := copyDir(opts.ResourcesDir, stagingDir); copyErr != nil {
		return "", fmt.Errorf("stage resources: %w", copyErr)
	}
	if canonicalizeErr := agentskills.CanonicalizeResourceDirs(
		filepath.Join(stagingDir, filepath.FromSlash(resourcesAgentSkillsDir)),
	); canonicalizeErr != nil {
		return "", fmt.Errorf("stage Agent Skills: %w", canonicalizeErr)
	}
	if copyErr := copyDir(opts.ServerDir, filepath.Join(stagingDir, resourcesServerDir)); copyErr != nil {
		return "", fmt.Errorf("stage %s: %w", resourcesServerDir, copyErr)
	}
	if stageErr := stageLocaltestResources(
		opts.LocaltestDir,
		filepath.Join(stagingDir, resourcesLocaltestDir),
	); stageErr != nil {
		return "", stageErr
	}
	entries, err := os.ReadDir(stagingDir)
	if err != nil {
		return "", fmt.Errorf("list staged resources: %w", err)
	}
	archiveEntries := make([]string, 0, len(entries))
	for _, entry := range entries {
		archiveEntries = append(archiveEntries, entry.Name())
	}
	if archiveErr := createTarGz(archivePath, stagingDir, archiveEntries...); archiveErr != nil {
		return "", fmt.Errorf("create resources archive: %w", archiveErr)
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
