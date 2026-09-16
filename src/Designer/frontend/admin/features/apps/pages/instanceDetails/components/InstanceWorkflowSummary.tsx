import { useId } from 'react';
import type { ReactElement } from 'react';
import { StudioAlert, StudioHeading } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { EngineErrorMessage } from 'admin/features/apps/components/EngineErrorMessage/EngineErrorMessage';
import { LabelValue } from 'admin/features/apps/components/LabelValue/LabelValue';
import { WorkflowHealthTag } from 'admin/features/apps/components/WorkflowHealthTag/WorkflowHealthTag';
import type { WorkflowOpsContext } from 'admin/features/apps/hooks/mutations/useWorkflowOpsMutations';
import { useNow } from 'admin/features/apps/hooks/useNow';
import type { WorkflowStatus } from 'admin/features/apps/types/workflows/WorkflowStatus';
import { formatDateAndTime } from 'admin/features/apps/utils/formatDateAndTime';
import { formatDuration } from 'admin/features/apps/utils/formatDuration';
import { WorkflowHealth } from 'admin/features/apps/utils/workflowHealth';
import {
  STALE_ACTIVE_THRESHOLD_MS,
  deriveInstanceHealth,
  focusStepOf,
  isActiveWorkflow,
  latestErrorOf,
  maxRetryCount,
  orderedSteps,
  pickFocusWorkflow,
  toTime,
  workflowDisplayName,
} from 'admin/features/apps/utils/workflowTriage';
import { WorkflowActions } from './WorkflowActions';

import classes from './InstanceWorkflowSummary.module.css';

/** The verdicts a loaded workflow list can produce, and how each one opens the headline. */
const HEADLINE_KEYS: Partial<Record<WorkflowHealth, string>> = {
  [WorkflowHealth.Failed]: 'admin.workflows.summary.failed',
  [WorkflowHealth.Retrying]: 'admin.workflows.summary.retrying',
  [WorkflowHealth.SideEffectsFailed]: 'admin.workflows.summary.side_effects_failed',
  [WorkflowHealth.Active]: 'admin.workflows.summary.active',
  [WorkflowHealth.Healthy]: 'admin.workflows.summary.healthy',
};

export type InstanceWorkflowSummaryProps = {
  context: WorkflowOpsContext;
  /** Newest first, as the drill-down query delivers them. */
  workflows: WorkflowStatus[];
};

/**
 * Where the instance stands, in one block above the workflow list: the verdict, the transition and
 * step it rests on, how many attempts have been made, when the next one is due, the latest error,
 * and the verbs that apply. Everything an operator needs before opening a single workflow.
 *
 * The clock ticks only while something is in flight, so a countdown to the next attempt and the
 * running time of the current one stay live without a request.
 */
export const InstanceWorkflowSummary = ({
  context,
  workflows,
}: InstanceWorkflowSummaryProps): ReactElement | null => {
  const { t } = useTranslation();
  const headingId = useId();
  const now = useNow(workflows.some(isActiveWorkflow));
  const health = deriveInstanceHealth(workflows, now);
  const focus = pickFocusWorkflow(workflows, health, now);
  const headlineKey = HEADLINE_KEYS[health];

  if (!focus || !headlineKey) {
    return null;
  }

  const steps = orderedSteps(focus);
  const step = focusStepOf(focus);
  const attempts = maxRetryCount(focus);
  const lastError = latestErrorOf(focus);
  const isParked = focus.overallStatus === 'Requeued' || focus.overallStatus === 'Waiting';
  const nextAttemptAt = isParked ? toTime(focus.backoffUntil) : undefined;
  const runningSince =
    focus.overallStatus === 'Processing' ? toTime(focus.executionStartedAt) : undefined;
  const lastChanged = toTime(focus.updatedAt);
  const isStale =
    isActiveWorkflow(focus) &&
    lastChanged !== undefined &&
    now - lastChanged > STALE_ACTIVE_THRESHOLD_MS;

  return (
    <section className={classes.summary} aria-labelledby={headingId}>
      <StudioHeading level={3} id={headingId} data-size='2xs'>
        {t('admin.workflows.summary.title')}
      </StudioHeading>
      <div className={classes.headline}>
        <WorkflowHealthTag health={health} />
        <span>
          {t(headlineKey)} <span className={classes.engineText}>{workflowDisplayName(focus)}</span>
        </span>
      </div>
      <div className={classes.facts}>
        {step && (
          <LabelValue label={t('admin.workflows.summary.step')}>
            {t('admin.workflows.summary.step_of', {
              step: steps.indexOf(step) + 1,
              total: steps.length,
            })}
            : <code className={classes.engineText}>{step.operationId}</code>
          </LabelValue>
        )}
        {attempts > 0 && (
          <LabelValue label={t('admin.workflows.summary.attempts')}>{attempts}</LabelValue>
        )}
        {nextAttemptAt !== undefined && (
          <LabelValue label={t('admin.workflows.summary.next_attempt')}>
            {nextAttemptAt > now
              ? t('admin.workflows.summary.next_attempt_in', {
                  duration: formatDuration(nextAttemptAt - now, t),
                })
              : t('admin.workflows.summary.next_attempt_now')}
          </LabelValue>
        )}
        {runningSince !== undefined && (
          <LabelValue label={t('admin.workflows.summary.running_for')}>
            {formatDuration(now - runningSince, t)}
          </LabelValue>
        )}
        <LabelValue label={t('admin.instances.last_changed')}>
          {formatDateAndTime(focus.updatedAt)}
        </LabelValue>
      </div>
      {isStale && (
        <StudioAlert data-color='warning' data-size='sm'>
          {t('admin.workflows.summary.stale', {
            duration: formatDuration(now - lastChanged, t),
          })}
        </StudioAlert>
      )}
      {lastError && (
        <div className={classes.lastError}>
          <StudioHeading level={4} data-size='2xs'>
            {t('admin.workflows.summary.last_error')}
          </StudioHeading>
          <EngineErrorMessage entry={lastError} />
        </div>
      )}
      <WorkflowActions context={context} workflow={focus} />
    </section>
  );
};
