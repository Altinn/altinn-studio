import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  PersistentItemStatus,
  WorkflowStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { orderedSteps } from 'admin/features/apps/utils/workflowTriage';

import classes from './WorkflowStepStrip.module.css';

type DotTone = 'pending' | 'info' | 'warning' | 'success' | 'danger' | 'neutral';

/**
 * The color a step's dot takes. The same families as the status tags, with two distinctions the
 * tags do not need: a step that has not started yet is hollow, and a step the engine is retrying
 * is amber, so the one that keeps failing stands out from the ones merely waiting their turn.
 */
const DOT_TONE: Record<PersistentItemStatus, DotTone> = {
  Enqueued: 'pending',
  Processing: 'info',
  Requeued: 'warning',
  Waiting: 'info',
  Held: 'info',
  Completed: 'success',
  Failed: 'danger',
  Canceled: 'danger',
  DependencyFailed: 'danger',
  Abandoned: 'neutral',
};

export type WorkflowStepStripProps = {
  workflow: WorkflowStatus;
};

/**
 * A workflow's steps as one row of dots, in processing order. The dots are for a sighted reader
 * scanning the list; the strip as a whole reads as one sentence to assistive technology.
 */
export const WorkflowStepStrip = ({ workflow }: WorkflowStepStripProps): ReactElement | null => {
  const { t } = useTranslation();
  const steps = orderedSteps(workflow);

  if (!steps.length) {
    return null;
  }

  const completed = steps.filter((step) => step.status === 'Completed').length;

  return (
    <span
      className={classes.dots}
      role='img'
      aria-label={t('admin.workflows.row.steps', { completed, total: steps.length })}
    >
      {steps.map((step) => (
        <span
          key={step.databaseId}
          className={classes.dot}
          data-tone={DOT_TONE[step.status] ?? 'neutral'}
          data-live={step.status === 'Processing' || undefined}
          title={`${step.operationId} · ${step.status}`}
        />
      ))}
    </span>
  );
};
