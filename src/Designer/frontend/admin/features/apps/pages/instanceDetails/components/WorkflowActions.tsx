import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { StudioAlert } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { ConfirmActionDialog } from 'admin/features/apps/components/ConfirmActionDialog/ConfirmActionDialog';
import type { WorkflowOpsContext } from 'admin/features/apps/hooks/mutations/useWorkflowOpsMutations';
import {
  useAbandonWorkflowMutation,
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

export type WorkflowActionsProps = {
  context: WorkflowOpsContext;
  workflow: WorkflowStatus;
};

/**
 * The ops verbs on a workflow, and the outcome of the last one used.
 *
 * On a failure: retry it, or write the failure off. Retry is offered for an already written-off
 * workflow too — the engine allows resuming an `Abandoned` workflow — while writing off only makes
 * sense for a failure that still stands. On a workflow parked on a timer: run it now instead of
 * waiting the backoff out, or give up on it instead of waiting the retries out.
 *
 * The outcome is rendered whether or not the verbs are still on offer: a verb that succeeded moves
 * the workflow out of the state it was offered on, so gating the feedback on the buttons would hide
 * every success behind the refresh that proves it worked. It lives until the workflow fails or
 * parks again: the list keys items by workflow id and every verb keeps the id, so without that
 * reset a stale "queued again" would sit next to the verbs for the new failure.
 */
export const WorkflowActions = ({
  context,
  workflow,
}: WorkflowActionsProps): ReactElement | null => {
  const { t } = useTranslation();
  const resume = useResumeWorkflowMutation(context);
  const abandon = useAbandonWorkflowMutation(context);
  const nudge = useNudgeWorkflowMutation(context);
  const fail = useFailWorkflowMutation(context);
  const verbs = [resume, abandon, nudge, fail];

  const canRetry = RESUMABLE_WORKFLOW_STATUSES.includes(workflow.overallStatus);
  const canAbandon = FAILED_WORKFLOW_STATUSES.includes(workflow.overallStatus);
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
  const { reset: resetAbandon } = abandon;
  const { reset: resetNudge } = nudge;
  const { reset: resetFail } = fail;
  useEffect(() => {
    if (
      FAILED_WORKFLOW_STATUSES.includes(workflow.overallStatus) ||
      PARKED_WORKFLOW_STATUSES.includes(workflow.overallStatus)
    ) {
      resetResume();
      resetAbandon();
      resetNudge();
      resetFail();
    }
  }, [workflow.overallStatus, resetResume, resetAbandon, resetNudge, resetFail]);

  if (!canRetry && !canAbandon && !isParked && !hasOutcome) {
    return null;
  }

  /** One verb at a time: the outcome shown is always the last verb used. */
  const run = (verb: (typeof verbs)[number]) => {
    verbs.filter((other) => other !== verb).forEach((other) => other.reset());
    verb.mutate(workflow.databaseId);
  };

  return (
    <div className={classes.actions}>
      {(canRetry || canAbandon || isParked) && (
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
          {canAbandon && (
            <ConfirmActionDialog
              triggerLabel={t('admin.workflows.actions.abandon')}
              heading={t('admin.workflows.actions.abandon.heading')}
              description={t('admin.workflows.actions.abandon.description')}
              confirmLabel={t('admin.workflows.actions.abandon.confirm')}
              color='danger'
              isPending={abandon.isPending}
              onConfirm={() => run(abandon)}
            />
          )}
        </div>
      )}
      {resume.isSuccess && (
        <StudioAlert data-color='success' data-size='sm'>
          {cascadeCount > 0
            ? t('admin.workflows.actions.retry.success_with_dependents', { count: cascadeCount })
            : t('admin.workflows.actions.retry.success')}
        </StudioAlert>
      )}
      {abandon.isSuccess && (
        <StudioAlert data-color='success' data-size='sm'>
          {t('admin.workflows.actions.abandon.success')}
        </StudioAlert>
      )}
      {nudge.isSuccess && (
        <StudioAlert data-color='success' data-size='sm'>
          {t('admin.workflows.actions.nudge.success')}
        </StudioAlert>
      )}
      {fail.isSuccess && (
        <StudioAlert data-color='success' data-size='sm'>
          {t('admin.workflows.actions.fail.success')}
        </StudioAlert>
      )}
      {verbs.some((verb) => verb.isError) && (
        <StudioAlert data-color='danger' data-size='sm'>
          {t('admin.workflows.actions.error')}
        </StudioAlert>
      )}
    </div>
  );
};
