import { useState } from 'react';
import type { ReactElement } from 'react';
import { StudioAlert } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useNow } from 'admin/features/apps/hooks/useNow';
import type { WorkflowStatus } from 'admin/features/apps/types/workflows/WorkflowStatus';
import { formatDuration } from 'admin/features/apps/utils/formatDuration';
import {
  ATTENTION_HEALTHS,
  RECOVERED_HEALTHS,
  deriveInstanceHealth,
  isActiveWorkflow,
  pickFocusWorkflow,
  staleSpanOf,
} from 'admin/features/apps/utils/workflowTriage';

import classes from './InstanceWorkflowNotices.module.css';

/** How long the recovery note stays before the list is on its own again. */
const RECOVERY_NOTE_MS = 12_000;

export type InstanceWorkflowNoticesProps = {
  /** Newest first, as the drill-down query delivers them. */
  workflows: WorkflowStatus[];
};

/**
 * The one-line notices above the workflow list, each there only while it has something to say:
 * a stuck instance that got going again — someone fixed the app, or a transient error passed —
 * and work in flight that has not changed for a long time. The rows themselves carry every
 * other fact, so nothing here repeats them.
 *
 * The recovery is caught by comparing with the previous render's verdict (the React pattern for
 * remembering the last props), and both notices read the ticking clock so they appear and time
 * out while the page is open.
 */
export const InstanceWorkflowNotices = ({
  workflows,
}: InstanceWorkflowNoticesProps): ReactElement | null => {
  const { t } = useTranslation();
  const [recoveredAt, setRecoveredAt] = useState<number | undefined>(undefined);
  const now = useNow(workflows.some(isActiveWorkflow) || recoveredAt !== undefined);
  const health = deriveInstanceHealth(workflows, now);

  const [previousHealth, setPreviousHealth] = useState(health);
  if (health !== previousHealth) {
    setPreviousHealth(health);
    if (ATTENTION_HEALTHS.has(previousHealth) && RECOVERED_HEALTHS.has(health)) {
      setRecoveredAt(now);
    }
  }
  const isRecoveryShown =
    recoveredAt !== undefined &&
    RECOVERED_HEALTHS.has(health) &&
    now - recoveredAt < RECOVERY_NOTE_MS;
  const staleSpan = staleSpanOf(pickFocusWorkflow(workflows, health, now), now);

  if (!isRecoveryShown && staleSpan === undefined) {
    return null;
  }

  return (
    <div className={classes.notices}>
      {isRecoveryShown && (
        <StudioAlert
          data-color='success'
          data-size='sm'
          className={classes.recovered}
          aria-live='polite'
        >
          {t('admin.workflows.notice.recovered')}
        </StudioAlert>
      )}
      {staleSpan !== undefined && (
        <StudioAlert data-color='warning' data-size='sm'>
          {t('admin.workflows.notice.stale', { duration: formatDuration(staleSpan, t) })}
        </StudioAlert>
      )}
    </div>
  );
};
