import {
  StudioAlert,
  StudioButton,
  StudioCard,
  StudioDetails,
  StudioError,
  StudioHeading,
  StudioList,
  StudioParagraph,
  StudioSpinner,
  StudioTable,
  StudioTag,
} from '@studio/components';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { useCurrentOrg } from 'admin/contexts/OrgContext';
import { useEnvironmentTitle } from 'admin/features/apps/hooks/useEnvironmentTitle';
import { useInstanceWorkflowsQuery } from 'admin/features/apps/hooks/queries/useInstanceWorkflowsQuery';
import type { WorkflowOpsContext } from 'admin/features/apps/hooks/mutations/useWorkflowOpsMutations';
import type {
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { WorkflowStatusTag } from 'admin/features/apps/components/WorkflowStatusTag/WorkflowStatusTag';
import { LabelValue } from 'admin/features/apps/components/LabelValue/LabelValue';
import { formatDateAndTime } from 'admin/features/apps/utils/formatDateAndTime';
import {
  extractInstanceGuid,
  isEngineUnavailableError,
} from 'admin/features/apps/utils/workflowHealth';
import { WorkflowActions } from './WorkflowActions';

import classes from './InstanceWorkflows.module.css';

export type InstanceWorkflowsProps = {
  org: string;
  environment: string;
  app: string;
  instanceId: string;
};

/**
 * The workflow-engine view of one instance: every workflow enqueued under its collection key, with
 * per-step status, error history and waiting reasons, plus the ops verbs on failures.
 */
export const InstanceWorkflows = ({
  org,
  environment,
  app,
  instanceId,
}: InstanceWorkflowsProps) => {
  const { t } = useTranslation();
  const collectionKey = extractInstanceGuid(instanceId);
  const { data, status, error, fetchNextPage, hasNextPage } = useInstanceWorkflowsQuery(
    org,
    environment,
    app,
    collectionKey,
  );

  return (
    <StudioCard>
      <StudioHeading data-size='sm'>{t('admin.workflows.title')}</StudioHeading>
      <StudioParagraph data-size='sm' className={classes.description}>
        {t('admin.workflows.description')}
      </StudioParagraph>
      <InstanceWorkflowsContent
        context={{ org, env: environment, app, collectionKey }}
        environment={environment}
        status={status}
        error={error}
        workflows={data}
        hasMoreResults={hasNextPage}
        fetchMoreResults={fetchNextPage}
      />
    </StudioCard>
  );
};

type InstanceWorkflowsContentProps = {
  context: WorkflowOpsContext;
  environment: string;
  status: 'pending' | 'error' | 'success';
  error: unknown;
  workflows?: WorkflowStatus[];
  hasMoreResults: boolean;
  fetchMoreResults: () => Promise<unknown>;
};

const InstanceWorkflowsContent = ({
  context,
  environment,
  status,
  error,
  workflows,
  hasMoreResults,
  fetchMoreResults,
}: InstanceWorkflowsContentProps) => {
  const { t } = useTranslation();
  const currentOrg = useCurrentOrg();
  const orgName = currentOrg.full_name || currentOrg.username;
  const envTitle = useEnvironmentTitle(environment);
  const { isPending: isFetchingMoreResults, mutate: doFetchMoreResults } = useMutation({
    mutationFn: fetchMoreResults,
  });

  if (context.collectionKey === undefined) {
    return <StudioAlert data-color='info'>{t('admin.workflows.no_results')}</StudioAlert>;
  }

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      if (isEngineUnavailableError(error)) {
        return (
          <StudioAlert data-color='info'>
            {t('admin.workflows.unavailable', { envTitle })}
          </StudioAlert>
        );
      }
      if (isAxiosError(error) && error.response?.status === 403) {
        return (
          <StudioAlert data-color='info'>
            {t('admin.instances.missing_rights', { envTitle, orgName })}
          </StudioAlert>
        );
      }
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success':
      if (!workflows?.length) {
        return <StudioAlert data-color='info'>{t('admin.workflows.no_results')}</StudioAlert>;
      }
      return (
        <div className={classes.workflows}>
          {workflows.map((workflow) => (
            <WorkflowItem key={workflow.databaseId} context={context} workflow={workflow} />
          ))}
          {hasMoreResults && (
            <StudioButton
              data-size='sm'
              variant='secondary'
              disabled={isFetchingMoreResults}
              onClick={() => doFetchMoreResults()}
            >
              {isFetchingMoreResults && <StudioSpinner aria-label={t('general.loading')} />}
              {t('admin.workflows.fetch_more')}
            </StudioButton>
          )}
        </div>
      );
  }
};

type WorkflowItemProps = {
  context: WorkflowOpsContext;
  workflow: WorkflowStatus;
};

const WorkflowItem = ({ context, workflow }: WorkflowItemProps) => {
  const { t } = useTranslation();

  return (
    <StudioDetails>
      <StudioDetails.Summary>
        <span className={classes.summary}>
          <WorkflowStatusTag status={workflow.overallStatus} />
          <span className={classes.summaryOperation}>{workflow.operationId}</span>
          {workflow.isHead === false && (
            <StudioTag data-size='sm' data-color='neutral'>
              {t('admin.workflows.side_effect')}
            </StudioTag>
          )}
          <span className={classes.summaryTime}>{formatDateAndTime(workflow.createdAt)}</span>
        </span>
      </StudioDetails.Summary>
      <StudioDetails.Content>
        <div className={classes.metadata}>
          <LabelValue label={t('admin.workflows.status')}>
            <WorkflowStatusTag status={workflow.overallStatus} />
          </LabelValue>
          <LabelValue label={t('admin.workflows.operation')}>{workflow.operationId}</LabelValue>
          <LabelValue label={t('admin.workflows.visibility')}>
            {workflow.isHead === false
              ? t('admin.workflows.visibility.side_effect')
              : t('admin.workflows.visibility.head')}
          </LabelValue>
          <LabelValue label={t('admin.instances.created')}>
            {formatDateAndTime(workflow.createdAt)}
          </LabelValue>
          <LabelValue label={t('admin.instances.last_changed')}>
            {formatDateAndTime(workflow.updatedAt)}
          </LabelValue>
          <LabelValue label={t('admin.workflows.id')}>{workflow.databaseId}</LabelValue>
        </div>
        <WorkflowSteps steps={workflow.steps} />
        <WorkflowActions context={context} workflow={workflow} />
      </StudioDetails.Content>
    </StudioDetails>
  );
};

const WorkflowSteps = ({ steps }: { steps: WorkflowStepStatus[] }) => {
  const { t } = useTranslation();

  if (!steps?.length) {
    return null;
  }

  const orderedSteps = steps.toSorted(
    (first, second) => first.processingOrder - second.processingOrder,
  );

  return (
    <div className={classes.steps}>
      <StudioHeading level={3} data-size='2xs'>
        {t('admin.workflows.steps')}
      </StudioHeading>
      <StudioTable data-size='sm'>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.Cell>{t('admin.workflows.step.order')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.workflows.operation')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.workflows.status')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.workflows.step.retries')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.workflows.step.details')}</StudioTable.Cell>
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {orderedSteps.map((step) => (
            <StudioTable.Row key={step.databaseId}>
              <StudioTable.Cell>{step.processingOrder}</StudioTable.Cell>
              <StudioTable.Cell>{step.operationId}</StudioTable.Cell>
              <StudioTable.Cell>
                <WorkflowStatusTag status={step.status} />
              </StudioTable.Cell>
              <StudioTable.Cell>{step.retryCount}</StudioTable.Cell>
              <StudioTable.Cell>
                <StepDetails step={step} />
              </StudioTable.Cell>
            </StudioTable.Row>
          ))}
        </StudioTable.Body>
      </StudioTable>
    </div>
  );
};

/** A step's own account of what happened: what it is waiting for, and every error it recorded. */
const StepDetails = ({ step }: { step: WorkflowStepStatus }) => {
  const { t } = useTranslation();
  const hasWaitingReason = !!step.lastDeferReason;
  const errorHistory = step.errorHistory ?? [];

  if (!hasWaitingReason && !errorHistory.length) {
    return <span>-</span>;
  }

  return (
    <div className={classes.stepDetails}>
      {/* Engine-provided free text (defer reasons, error messages) is rendered as its own node
          rather than interpolated into a translation, since i18next HTML-escapes interpolations. */}
      {hasWaitingReason && (
        <span>
          {t('admin.workflows.step.waiting_reason')}: {step.lastDeferReason}
        </span>
      )}
      {(step.deferCount ?? 0) > 1 && (
        <span>{t('admin.workflows.step.defer_count', { times: step.deferCount })}</span>
      )}
      {!!errorHistory.length && (
        <>
          <StudioHeading level={4} data-size='2xs'>
            {t('admin.workflows.step.errors')}
          </StudioHeading>
          <StudioList.Unordered className={classes.errorHistory}>
            {errorHistory.map((entry, index) => (
              <StudioList.Item key={`${entry.timestamp}-${index}`}>
                {formatDateAndTime(entry.timestamp)}: {entry.message}
              </StudioList.Item>
            ))}
          </StudioList.Unordered>
        </>
      )}
    </div>
  );
};
