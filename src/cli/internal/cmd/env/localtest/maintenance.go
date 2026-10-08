package localtest

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"altinn.studio/studioctl/internal/osutil"
)

const workflowEngineResetMarker = ".workflow-engine-reset-pending"

// ScheduleWorkflowEngineDataReset records that Localtest must reset its workflow-engine data
// before it next starts.
func ScheduleWorkflowEngineDataReset(dataDir string) error {
	if err := os.MkdirAll(dataDir, osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create localtest data directory: %w", err)
	}
	if err := os.WriteFile(workflowEngineResetMarkerPath(dataDir), nil, osutil.FilePermDefault); err != nil {
		return fmt.Errorf("schedule workflow-engine data reset: %w", err)
	}
	return nil
}

func (e *Env) applyScheduledWorkflowEngineDataReset(ctx context.Context) error {
	marker := workflowEngineResetMarkerPath(e.cfg.DataDir)
	if _, err := os.Stat(marker); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return fmt.Errorf("inspect workflow-engine reset marker: %w", err)
	}

	if err := e.ResetWorkflowEngineData(ctx); err != nil {
		return fmt.Errorf("apply scheduled workflow-engine data reset: %w", err)
	}
	if err := os.Remove(marker); err != nil {
		return fmt.Errorf("remove workflow-engine reset marker: %w", err)
	}
	return nil
}

func workflowEngineResetMarkerPath(dataDir string) string {
	return filepath.Join(dataDir, workflowEngineResetMarker)
}
