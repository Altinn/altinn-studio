package localtest

import (
	"fmt"
	"os"
	"path/filepath"

	"altinn.studio/studioctl/internal/osutil"
)

const (
	infraDir               = "infra"
	workflowEngineInfraDir = "workflow-engine"
)

// EnsureInfraFiles writes generated infrastructure config files to the data directory.
func EnsureInfraFiles(dataDir string) error {
	dir := filepath.Join(dataDir, infraDir, workflowEngineInfraDir)
	if err := os.MkdirAll(dir, osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create infra directory: %w", err)
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

// WorkflowEngineInfraFilePath returns the path to a workflow-engine infrastructure config file.
func WorkflowEngineInfraFilePath(dataDir, name string) string {
	return filepath.Join(dataDir, infraDir, workflowEngineInfraDir, name)
}
