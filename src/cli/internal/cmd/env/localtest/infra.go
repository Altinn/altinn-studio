package localtest

import (
	"fmt"
	"os"
	"path/filepath"

	"altinn.studio/studioctl/internal/cmd/env/localtest/embedded"
	"altinn.studio/studioctl/internal/osutil"
)

const infraDir = "infra"

// EnsureInfraFiles writes embedded infrastructure config files to the data directory.
// Files are overwritten on each call to ensure they stay in sync with the binary.
func EnsureInfraFiles(dataDir string) error {
	dir := filepath.Join(dataDir, infraDir)
	if err := os.MkdirAll(dir, osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create infra directory: %w", err)
	}

	files := []string{
		"postgres-init.sql",
		"pgadmin-servers.json",
	}

	for _, name := range files {
		data, err := embedded.Files.ReadFile(name)
		if err != nil {
			return fmt.Errorf("read embedded file %s: %w", name, err)
		}

		path := filepath.Join(dir, name)
		if err := os.WriteFile(path, data, osutil.FilePermDefault); err != nil {
			return fmt.Errorf("write infra file %s: %w", name, err)
		}
	}

	return nil
}

// InfraFilePath returns the path to an infrastructure config file in the data directory.
func InfraFilePath(dataDir, name string) string {
	return filepath.Join(dataDir, infraDir, name)
}
