package localtest

import (
	"fmt"
	"os"
	"path/filepath"

	"altinn.studio/studioctl/internal/cmd/env/localtest/embedded"
	"altinn.studio/studioctl/internal/osutil"
)

const infraDir = "infra"

type infraFile struct {
	name string
	perm os.FileMode
}

// EnsureInfraFiles writes embedded infrastructure config files to the data directory.
// Files are overwritten on each call to ensure they stay in sync with the binary.
func EnsureInfraFiles(dataDir string) error {
	dir := filepath.Join(dataDir, infraDir)
	if err := os.MkdirAll(dir, osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create infra directory: %w", err)
	}

	files := []infraFile{
		{"postgres-init.sql", osutil.FilePermDefault},
		{"pgadmin-servers.json", osutil.FilePermDefault},
		{"pgpass", 0o600}, // libpq requires 0600 on pgpass files
	}

	for _, f := range files {
		data, err := embedded.Files.ReadFile(f.name)
		if err != nil {
			return fmt.Errorf("read embedded file %s: %w", f.name, err)
		}

		path := filepath.Join(dir, f.name)
		if err := os.WriteFile(path, data, f.perm); err != nil {
			return fmt.Errorf("write infra file %s: %w", f.name, err)
		}
		// WriteFile does not update permissions on existing files, so ensure correct mode.
		if err := os.Chmod(path, f.perm); err != nil {
			return fmt.Errorf("chmod infra file %s: %w", f.name, err)
		}
	}

	return nil
}

// InfraFilePath returns the path to an infrastructure config file in the data directory.
func InfraFilePath(dataDir, name string) string {
	return filepath.Join(dataDir, infraDir, name)
}
