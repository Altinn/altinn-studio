import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  PersistentItemStatus,
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { groupStepsOfWorkflows } from 'admin/features/apps/utils/workflowPhases';
import { stepDisplayName } from 'admin/features/apps/utils/stepNames';
import { useTaskNameOf } from 'admin/features/apps/hooks/useTaskNames';

import classes from './WorkflowStepStrip.module.css';

type DotTone = 'pending' | 'info' | 'warning' | 'success' | 'danger' | 'neutral';

/**
 * The color a step's dot takes. The same families as the status tags, with two distinctions the
 * tags do not need: a step that has not started yet is hollow, and a step the engine is retrying
 * is amber, so the one that keeps failing stands out from the ones merely waiting their turn. A
 * step that got through after failing is amber too: the failure is over, and still worth a
 * glance, since it is the app misbehaving even if it recovered.
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

const recoveredFromErrors = (step: WorkflowStepStatus): boolean =>
  step.status === 'Completed' && (step.errorHistory?.length ?? 0) > 0;

export type WorkflowStepStripProps = {
  /** The workflows one row shows, in the order they ran. */
  workflows: WorkflowStatus[];
};

/**
 * A row's steps as one even row of dots, in the order they ran. Each dot's tooltip names the step
 * and the task it belongs to. The dots are for a sighted reader scanning the list; the strip as a
 * whole reads as one sentence to assistive technology.
 */
export const WorkflowStepStrip = ({ workflows }: WorkflowStepStripProps): ReactElement | null => {
  const { t } = useTranslation();
  const taskNameOf = useTaskNameOf();
  const dots = groupStepsOfWorkflows(workflows).flatMap((group) =>
    group.steps.map(({ step, workflow }) => ({ step, workflow, element: group.elementId })),
  );
  const steps = dots.map(({ step }) => step);

  if (!steps.length) {
    return null;
  }

  const completed = steps.filter((step) => step.status === 'Completed').length;
  const withErrors = steps.filter(recoveredFromErrors).length;
  const hadErrorsText = t('admin.workflows.row.had_errors');
  const label = withErrors
    ? t('admin.workflows.row.steps_with_errors', { completed, total: steps.length, withErrors })
    : t('admin.workflows.row.steps', { completed, total: steps.length });

  return (
    <span className={classes.dots} role='img' aria-label={label}>
      {dots.map(({ step, workflow, element }) => (
        <span
          key={step.databaseId}
          className={classes.dot}
          data-tone={recoveredFromErrors(step) ? 'warning' : (DOT_TONE[step.status] ?? 'neutral')}
          data-live={step.status === 'Processing' || undefined}
          title={[
            stepDisplayName(step, workflow, t, taskNameOf),
            step.status,
            recoveredFromErrors(step) && hadErrorsText,
            element && taskNameOf(element),
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      ))}
    </span>
  );
};
