import { StudioDetails } from '@studio/components';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  PersistentItemStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { EngineErrorMessage } from 'admin/features/apps/components/EngineErrorMessage/EngineErrorMessage';
import { newestFirst } from 'admin/features/apps/utils/workflowTriage';

import classes from './StepDetails.module.css';

/** Statuses in which a step's latest error is the current problem, not history. */
const STEP_FAILING_STATUSES: readonly PersistentItemStatus[] = [
  'Failed',
  'Canceled',
  'DependencyFailed',
  'Requeued',
];

export type StepDetailsProps = {
  step: WorkflowStepStatus;
  /** The actions, on the step its workflow stopped at. */
  verbs?: ReactNode;
};

/**
 * A step's waiting reason, its current error and the actions. Earlier errors fold away under a
 * count: they happened, but they are not the current problem.
 */
export const StepDetails = ({ step, verbs }: StepDetailsProps) => {
  const { t } = useTranslation();
  const deferReason = step.lastDeferReason;
  const errors = newestFirst(step.errorHistory ?? []);
  const isFailing = STEP_FAILING_STATUSES.includes(step.status);
  const currentError = isFailing ? errors[0] : undefined;
  const earlierErrors = isFailing ? errors.slice(1) : errors;
  const historyLabel =
    step.status === 'Completed'
      ? t('admin.workflows.step.resolved_errors', { count: earlierErrors.length })
      : t('admin.workflows.step.earlier_errors', { count: earlierErrors.length });

  // The engine leaves the last defer reason on the step after it stops waiting, so only a step that
  // is actually parked may read as currently blocked. On any other step the same text is history,
  // which is worth keeping for triage under a label that says so.
  const deferReasonLabel =
    step.status === 'Waiting'
      ? t('admin.workflows.step.waiting_reason')
      : t('admin.workflows.step.last_waiting_reason');

  return (
    <div className={classes.stepDetails}>
      {/* Its own node, not a translation interpolation: i18next HTML-escapes those, and the
          engine's English text must not read as part of the Norwegian sentence. */}
      {deferReason && (
        <span>
          {deferReasonLabel}: <code className={classes.engineText}>{deferReason}</code>
        </span>
      )}
      {(step.deferCount ?? 0) > 1 && (
        <span>{t('admin.workflows.step.defer_count', { times: step.deferCount })}</span>
      )}
      {currentError && <EngineErrorMessage entry={currentError} />}
      {verbs}
      {earlierErrors.length > 0 && (
        <StudioDetails data-size='sm' className={classes.earlierErrors}>
          <StudioDetails.Summary>{historyLabel}</StudioDetails.Summary>
          <StudioDetails.Content className={classes.earlierErrorsList}>
            {earlierErrors.map((entry, index) => (
              <EngineErrorMessage key={`${entry.timestamp}-${index}`} entry={entry} />
            ))}
          </StudioDetails.Content>
        </StudioDetails>
      )}
    </div>
  );
};
