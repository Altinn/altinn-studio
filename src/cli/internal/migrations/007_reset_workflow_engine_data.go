package migrations

import (
	"context"
	"fmt"

	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/config"
)

// resetWorkflowEngineData schedules a reset before Localtest next starts. The app runtime changed
// the workflow callback contract (signed callback state now carries Storage versions, command
// payloads were renamed, and the instance-lock token was removed), so workflows persisted by
// earlier versions fail on their next step. Localtest instance data stays: instances left
// mid-transition continue from the process state Storage last committed.
func (r *Runner) resetWorkflowEngineData(_ context.Context, cfg *config.Config) error {
	if err := envlocaltest.ScheduleWorkflowEngineDataReset(cfg.DataDir); err != nil {
		return fmt.Errorf("schedule localtest workflow-engine data reset: %w", err)
	}
	return nil
}
