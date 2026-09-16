import { useId, useState } from 'react';
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
};

/** The verdicts that put the block on screen on their own: something an operator may have to act on. */
const ATTENTION_HEALTHS: ReadonlySet<WorkflowHealth> = new Set([
  WorkflowHealth.Failed,
  WorkflowHealth.Retrying,
  WorkflowHealth.SideEffectsFailed,
]);

/** The verdicts a recovery lands on: the work is moving again, or done. */
const RECOVERED_HEALTHS: ReadonlySet<WorkflowHealth> = new Set([
  WorkflowHealth.Active,
  WorkflowHealth.Healthy,
]);

/** How long the recovery note stays before the block goes quiet again. */
const RECOVERY_NOTE_MS = 12_000;

export type InstanceWorkflowSummaryProps = {
  context: WorkflowOpsContext;
  /** Newest first, as the drill-down query delivers them. */
  workflows: WorkflowStatus[];
};

/**
 * Where the instance is stuck, in one block above the workflow list: the verdict, the transition
 * and step it rests on, how many attempts have been made, when the next one is due, the latest
 * error, and the verbs that apply. Everything an operator needs before opening a single workflow.
 *
 * The block is on screen only when something needs attention — a failure, a workflow that keeps
 * retrying, lost side effects, or work in flight that has not changed for a long time. An instance
 * that is in order, or simply in progress, shows nothing here: the rows already say so, and the
 * block's presence is meant to be the signal.
 *
 * The clock ticks while anything is in flight, so a countdown to the next attempt and the running
 * time of the current one stay live without a request — and so does the verdict itself.
 */
export const InstanceWorkflowSummary = ({
  context,
  workflows,
}: InstanceWorkflowSummaryProps): ReactElement | null => {
  const { t } = useTranslation();
  const headingId = useId();
  const [recoveredAt, setRecoveredAt] = useState<number | undefined>(undefined);
  // The clock also decides whether the block shows at all: a retry threshold or a stale span
  // can be crossed while the page is open, and a recovery note times out — all read from the
  // ticking time.
  const now = useNow(workflows.some(isActiveWorkflow) || recoveredAt !== undefined);
  const health = deriveInstanceHealth(workflows, now);
  const focus = pickFocusWorkflow(workflows, health, now);

  // An instance that was stuck and got going again — someone fixed the app, or a transient error
  // passed — is worth a moment's notice rather than a block that silently vanishes. The change is
  // caught by comparing with the previous render's verdict (the React pattern for remembering
  // the last props).
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
  const lastChanged = toTime(focus?.updatedAt);
  const isStale =
    focus !== undefined &&
    isActiveWorkflow(focus) &&
    lastChanged !== undefined &&
    now - lastChanged > STALE_ACTIVE_THRESHOLD_MS;
  const needsAttention = focus !== undefined && (ATTENTION_HEALTHS.has(health) || isStale);
  const headlineKey = HEADLINE_KEYS[health];

  if (isRecoveryShown && !needsAttention) {
    return (
      <section
        className={`${classes.summary} ${classes.recovered}`}
        aria-labelledby={headingId}
        aria-live='polite'
      >
        <StudioHeading level={3} id={headingId} data-size='2xs'>
          {t('admin.workflows.summary.title')}
        </StudioHeading>
        <div className={classes.headline}>
          <WorkflowHealthTag health={health} />
          <span>{t('admin.workflows.summary.recovered')}</span>
        </div>
        <span>{t('admin.workflows.summary.recovered_description')}</span>
      </section>
    );
  }

  if (!needsAttention || !focus || !headlineKey) {
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
      {isStale && lastChanged !== undefined && (
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
