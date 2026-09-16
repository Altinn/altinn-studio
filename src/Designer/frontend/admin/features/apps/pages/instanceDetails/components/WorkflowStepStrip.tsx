import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  PersistentItemStatus,
  WorkflowStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { focusStepOf, orderedSteps } from 'admin/features/apps/utils/workflowTriage';

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
 * A workflow's steps as one row of dots, in processing order, with the step it is at named next
 * to them. The dots are decoration for a sighted reader scanning the list; the text carries the
 * same fact for everyone else, so the dots are hidden from assistive technology.
 */
export const WorkflowStepStrip = ({ workflow }: WorkflowStepStripProps): ReactElement | null => {
  const { t } = useTranslation();
  const steps = orderedSteps(workflow);
  const focus = focusStepOf(workflow);

  if (!steps.length || !focus) {
    return null;
  }

  const allCompleted = steps.every((step) => step.status === 'Completed');

  return (
    <span className={classes.strip}>
      <span className={classes.dots} aria-hidden='true'>
        {steps.map((step) => (
          <span
            key={step.databaseId}
            className={classes.dot}
            data-tone={DOT_TONE[step.status] ?? 'neutral'}
            title={`${step.operationId} · ${step.status}`}
          />
        ))}
      </span>
      <span className={classes.label}>
        {allCompleted ? (
          t('admin.workflows.row.steps_completed', { count: steps.length })
        ) : (
          <>
            {t('admin.workflows.row.at_step', {
              step: steps.indexOf(focus) + 1,
              total: steps.length,
            })}{' '}
            <code className={classes.engineText}>{focus.operationId}</code>
          </>
        )}
      </span>
    </span>
  );
};
