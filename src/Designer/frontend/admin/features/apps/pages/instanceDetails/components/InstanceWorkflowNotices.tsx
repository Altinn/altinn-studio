import type { ReactElement } from 'react';
import { StudioAlert } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useNow } from 'admin/features/apps/hooks/useNow';
import type { WorkflowStatus } from 'admin/features/apps/types/workflows/WorkflowStatus';
import { formatDuration } from 'admin/features/apps/utils/formatDuration';
import {
  deriveInstanceHealth,
  isActiveWorkflow,
  pickFocusWorkflow,
  staleSpanOf,
} from 'admin/features/apps/utils/workflowTriage';

export type InstanceWorkflowNoticesProps = {
  /** In the order the process ran them, as the drill-down query delivers them. */
  workflows: WorkflowStatus[];
};

/**
 * The one-line notice above the workflow list, there only while it has something to say: work in
 * flight that has not changed for a long time, which usually means the app is not answering. The
 * rows themselves carry every other fact, so nothing here repeats them. It reads the ticking
 * clock, so it appears while the page is open.
 */
export const InstanceWorkflowNotices = ({
  workflows,
}: InstanceWorkflowNoticesProps): ReactElement | null => {
  const { t } = useTranslation();
  const now = useNow(workflows.some(isActiveWorkflow));
  const health = deriveInstanceHealth(workflows, now);
  const staleSpan = staleSpanOf(pickFocusWorkflow(workflows, health, now), now);

  if (staleSpan === undefined) {
    return null;
  }

  return (
    <StudioAlert data-color='warning' data-size='sm'>
      {t('admin.workflows.notice.stale', { duration: formatDuration(staleSpan, t) })}
    </StudioAlert>
  );
};
