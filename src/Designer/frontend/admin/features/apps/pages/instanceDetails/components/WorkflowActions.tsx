import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { StudioAlert } from '@studio/components';
import { CheckmarkCircleFillIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { ConfirmActionDialog } from 'admin/features/apps/components/ConfirmActionDialog/ConfirmActionDialog';
import type { WorkflowOpsContext } from 'admin/features/apps/hooks/mutations/useWorkflowOpsMutations';
import {
  useFailWorkflowMutation,
  useNudgeWorkflowMutation,
  useResumeWorkflowMutation,
} from 'admin/features/apps/hooks/mutations/useWorkflowOpsMutations';
import type { WorkflowStatus } from 'admin/features/apps/types/workflows/WorkflowStatus';
import {
  FAILED_WORKFLOW_STATUSES,
  PARKED_WORKFLOW_STATUSES,
  RESUMABLE_WORKFLOW_STATUSES,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { latestErrorOf } from 'admin/features/apps/utils/workflowTriage';

import classes from './WorkflowActions.module.css';

/** How long a verb's confirmation stays. The row itself shows the result within the next read. */
const OUTCOME_NOTE_MS = 5_000;

export type WorkflowActionsProps = {
  context: WorkflowOpsContext;
  workflow: WorkflowStatus;
};

/**
 * The ops verbs on a workflow, and the outcome of the last one used.
 *
 * On a failure: retry it. Retry is offered for an already written-off workflow too — the engine
 * allows resuming an `Abandoned` workflow. Writing a failure off is deliberately not offered here
 * for now. On a workflow parked on a timer: run it now instead of waiting the backoff out, or give
 * up on it instead of waiting the retries out.
 *
 * A verb that succeeded takes the buttons with it and leaves a one-line confirmation in their
 * place for a few seconds: the row's own status shows the result within the next read, so the
 * confirmation only has to bridge that second. It is dropped early if the workflow fails or parks
 * again — the list keys items by workflow id and every verb keeps the id, so without that reset a
 * stale "queued again" would sit next to the verbs for the new failure.
 */
export const WorkflowActions = ({
  context,
  workflow,
}: WorkflowActionsProps): ReactElement | null => {
  const { t } = useTranslation();
  const resume = useResumeWorkflowMutation(context);
  const nudge = useNudgeWorkflowMutation(context);
  const fail = useFailWorkflowMutation(context);
  const verbs = [resume, nudge, fail];

  const canRetry = RESUMABLE_WORKFLOW_STATUSES.includes(workflow.overallStatus);
  const isParked = PARKED_WORKFLOW_STATUSES.includes(workflow.overallStatus);
  const hasOutcome = verbs.some((verb) => verb.isSuccess || verb.isError);
  const cascadeCount = resume.data?.cascadeResumed?.length ?? 0;

  // An error the engine classed as permanent was not retried by the engine either, so a retry
  // without a fix in the app is going to fail the same way. The dialog says so.
  const lastError = latestErrorOf(workflow);
  const retryDescription =
    lastError && !lastError.wasRetryable
      ? `${t('admin.workflows.actions.retry.description')} ${t('admin.workflows.actions.retry.non_retryable_hint')}`
      : t('admin.workflows.actions.retry.description');

  const { reset: resetResume } = resume;
  const { reset: resetNudge } = nudge;
  const { reset: resetFail } = fail;
  useEffect(() => {
    if (
      FAILED_WORKFLOW_STATUSES.includes(workflow.overallStatus) ||
      PARKED_WORKFLOW_STATUSES.includes(workflow.overallStatus)
    ) {
      resetResume();
      resetNudge();
      resetFail();
    }
  }, [workflow.overallStatus, resetResume, resetNudge, resetFail]);

  const succeeded = resume.isSuccess
    ? 'resume'
    : nudge.isSuccess
      ? 'nudge'
      : fail.isSuccess
        ? 'fail'
        : undefined;
  useEffect(() => {
    if (!succeeded) {
      return undefined;
    }
    const resets = { resume: resetResume, nudge: resetNudge, fail: resetFail };
    const timer = window.setTimeout(resets[succeeded], OUTCOME_NOTE_MS);
    return () => window.clearTimeout(timer);
  }, [succeeded, resetResume, resetNudge, resetFail]);

  if (!canRetry && !isParked && !hasOutcome) {
    return null;
  }

  const outcomeText = {
    resume:
      cascadeCount > 0
        ? t('admin.workflows.actions.retry.success_with_dependents', { count: cascadeCount })
        : t('admin.workflows.actions.retry.success'),
    nudge: t('admin.workflows.actions.nudge.success'),
    fail: t('admin.workflows.actions.fail.success'),
  };

  /** One verb at a time: the outcome shown is always the last verb used. */
  const run = (verb: (typeof verbs)[number]) => {
    verbs.filter((other) => other !== verb).forEach((other) => other.reset());
    verb.mutate(workflow.databaseId);
  };

  return (
    <div className={classes.actions}>
      {(canRetry || isParked) && !succeeded && (
        <div className={classes.buttons}>
          {isParked && (
            <ConfirmActionDialog
              triggerLabel={t('admin.workflows.actions.nudge')}
              heading={t('admin.workflows.actions.nudge.heading')}
              description={t('admin.workflows.actions.nudge.description')}
              confirmLabel={t('admin.workflows.actions.nudge.confirm')}
              isPending={nudge.isPending}
              onConfirm={() => run(nudge)}
            />
          )}
          {isParked && (
            <ConfirmActionDialog
              triggerLabel={t('admin.workflows.actions.fail')}
              heading={t('admin.workflows.actions.fail.heading')}
              description={t('admin.workflows.actions.fail.description')}
              confirmLabel={t('admin.workflows.actions.fail.confirm')}
              color='danger'
              isPending={fail.isPending}
              onConfirm={() => run(fail)}
            />
          )}
          {canRetry && (
            <ConfirmActionDialog
              triggerLabel={t('admin.workflows.actions.retry')}
              heading={t('admin.workflows.actions.retry.heading')}
              description={retryDescription}
              confirmLabel={t('admin.workflows.actions.retry.confirm')}
              isPending={resume.isPending}
              onConfirm={() => run(resume)}
            />
          )}
        </div>
      )}
      {succeeded && (
        <span className={classes.outcome} role='status'>
          <CheckmarkCircleFillIcon aria-hidden='true' />
          {outcomeText[succeeded]}
        </span>
      )}
      {verbs.some((verb) => verb.isError) && (
        <StudioAlert data-color='danger' data-size='sm'>
          {t('admin.workflows.actions.error')}
        </StudioAlert>
      )}
    </div>
  );
};
