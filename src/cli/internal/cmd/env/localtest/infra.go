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

	// Generate pgpass from constants so credentials have a single source of truth.
	// libpq requires 0600 permissions on pgpass files.
	pgpassPath := filepath.Join(dir, "pgpass")
	pgpassContent := fmt.Sprintf("%s:%s:*:%s:%s\n", ContainerPostgres, postgresPort, postgresUser, postgresPassword)
	if err := os.WriteFile(pgpassPath, []byte(pgpassContent), osutil.FilePermOwnerOnly); err != nil {
		return fmt.Errorf("write infra file pgpass: %w", err)
	}
	if err := os.Chmod(pgpassPath, osutil.FilePermOwnerOnly); err != nil {
		return fmt.Errorf("chmod infra file pgpass: %w", err)
	}

	return nil
}

// InfraFilePath returns the path to an infrastructure config file in the data directory.
func InfraFilePath(dataDir, name string) string {
	return filepath.Join(dataDir, infraDir, name)
}
