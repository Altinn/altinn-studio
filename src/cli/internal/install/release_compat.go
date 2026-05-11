package install

import (
	"fmt"
	"os"
	"path/filepath"
)

const legacyAppManagerAssetBaseName = "app-manager"

// PreviewCompatibilityOptions describes inputs for temporary preview compatibility assets.
type PreviewCompatibilityOptions struct {
	GOOS          string
	GOARCH        string
	OutputDir     string
	AppManagerDir string
}

// CreatePreviewCompatibilityAssets creates assets required by previous preview updaters.
func CreatePreviewCompatibilityAssets(opts PreviewCompatibilityOptions) ([]string, error) {
	legacyAppManagerArchive, err := createLegacyAppManagerArchive(opts)
	if err != nil {
		return nil, err
	}
	return []string{legacyAppManagerArchive}, nil
}

func createLegacyAppManagerArchive(opts PreviewCompatibilityOptions) (string, error) {
	archiveName, err := legacyAppManagerAssetName(opts.GOOS, opts.GOARCH)
	if err != nil {
		return "", err
	}
	entries, err := archiveDirEntries(opts.AppManagerDir)
	if err != nil {
		return "", err
	}

	archivePath := filepath.Join(opts.OutputDir, archiveName)
	if err := createTarGz(archivePath, opts.AppManagerDir, entries...); err != nil {
		return "", fmt.Errorf("create legacy app-manager archive: %w", err)
	}
	return archivePath, nil
}

func legacyAppManagerAssetName(goos, goarch string) (string, error) {
	assetName, err := baseAssetName(legacyAppManagerAssetBaseName, goos, goarch)
	if err != nil {
		return "", err
	}
	return assetName + ".tar.gz", nil
}

func archiveDirEntries(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read archive source dir: %w", err)
	}
	paths := make([]string, 0, len(entries))
	for _, entry := range entries {
		paths = append(paths, entry.Name())
	}
	return paths, nil
}
