import type { ReactElement } from 'react';
import { StudioAlert } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { ConfirmActionDialog } from 'admin/features/apps/components/ConfirmActionDialog/ConfirmActionDialog';
import type { WorkflowOpsContext } from 'admin/features/apps/hooks/mutations/useWorkflowOpsMutations';
import {
  useAbandonWorkflowMutation,
  useResumeWorkflowMutation,
} from 'admin/features/apps/hooks/mutations/useWorkflowOpsMutations';
import type { WorkflowStatus } from 'admin/features/apps/types/workflows/WorkflowStatus';
import {
  FAILED_WORKFLOW_STATUSES,
  RESUMABLE_WORKFLOW_STATUSES,
} from 'admin/features/apps/types/workflows/WorkflowStatus';

import classes from './WorkflowActions.module.css';

export type WorkflowActionsProps = {
  context: WorkflowOpsContext;
  workflow: WorkflowStatus;
};

/**
 * The two ops verbs on a failed workflow — retry it, or write the failure off — and the outcome of
 * the last one used.
 *
 * Retry is offered for an already written-off workflow too — the engine allows resuming an
 * `Abandoned` workflow — while writing off only makes sense for a failure that still stands.
 *
 * The outcome is rendered whether or not the verbs are still on offer: a verb that succeeded moves
 * the workflow out of the failed state it was offered on, so gating the feedback on the buttons
 * would hide every success behind the refresh that proves it worked.
 */
export const WorkflowActions = ({
  context,
  workflow,
}: WorkflowActionsProps): ReactElement | null => {
  const { t } = useTranslation();
  const resume = useResumeWorkflowMutation(context);
  const abandon = useAbandonWorkflowMutation(context);

  const canRetry = RESUMABLE_WORKFLOW_STATUSES.includes(workflow.overallStatus);
  const canAbandon = FAILED_WORKFLOW_STATUSES.includes(workflow.overallStatus);
  const hasOutcome = resume.isSuccess || abandon.isSuccess || resume.isError || abandon.isError;

  if (!canRetry && !canAbandon && !hasOutcome) {
    return null;
  }

  return (
    <div className={classes.actions}>
      {(canRetry || canAbandon) && (
        <div className={classes.buttons}>
          {canRetry && (
            <ConfirmActionDialog
              triggerLabel={t('admin.workflows.actions.retry')}
              heading={t('admin.workflows.actions.retry.heading')}
              description={t('admin.workflows.actions.retry.description')}
              confirmLabel={t('admin.workflows.actions.retry.confirm')}
              isPending={resume.isPending}
              onConfirm={() => resume.mutate(workflow.databaseId)}
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
              onConfirm={() => abandon.mutate(workflow.databaseId)}
            />
          )}
        </div>
      )}
      {resume.isSuccess && (
        <StudioAlert data-color='success' data-size='sm'>
          {t('admin.workflows.actions.retry.success')}
        </StudioAlert>
      )}
      {abandon.isSuccess && (
        <StudioAlert data-color='success' data-size='sm'>
          {t('admin.workflows.actions.abandon.success')}
        </StudioAlert>
      )}
      {(resume.isError || abandon.isError) && (
        <StudioAlert data-color='danger' data-size='sm'>
          {t('admin.workflows.actions.error')}
        </StudioAlert>
      )}
    </div>
  );
};
