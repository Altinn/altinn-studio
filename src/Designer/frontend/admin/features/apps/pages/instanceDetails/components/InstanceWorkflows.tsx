import {
  StudioAlert,
  StudioButton,
  StudioCard,
  StudioDetails,
  StudioHeading,
  StudioParagraph,
  StudioSpinner,
  StudioTable,
  StudioTag,
} from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useFetchMoreResults } from 'admin/features/apps/hooks/useFetchMoreResults';
import { useInstanceWorkflowsQuery } from 'admin/features/apps/hooks/queries/useInstanceWorkflowsQuery';
import type { WorkflowOpsContext } from 'admin/features/apps/hooks/mutations/useWorkflowOpsMutations';
import { useNow } from 'admin/features/apps/hooks/useNow';
import type {
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { PARKED_WORKFLOW_STATUSES } from 'admin/features/apps/types/workflows/WorkflowStatus';
import { EngineErrorMessage } from 'admin/features/apps/components/EngineErrorMessage/EngineErrorMessage';
import { WorkflowEngineError } from 'admin/features/apps/components/WorkflowEngineError/WorkflowEngineError';
import { WorkflowStatusTag } from 'admin/features/apps/components/WorkflowStatusTag/WorkflowStatusTag';
import { LabelValue } from 'admin/features/apps/components/LabelValue/LabelValue';
import { parseEngineErrorMessage } from 'admin/features/apps/utils/engineErrorMessage';
import { formatDateAndTime } from 'admin/features/apps/utils/formatDateAndTime';
import { formatDuration } from 'admin/features/apps/utils/formatDuration';
import { extractInstanceGuid } from 'admin/features/apps/utils/workflowHealth';
import {
  isActiveWorkflow,
  isFailedWorkflow,
  latestErrorOf,
  newestFirst,
  orderedSteps,
  toTime,
  workflowDisplayName,
} from 'admin/features/apps/utils/workflowTriage';
import { InstanceWorkflowSummary } from './InstanceWorkflowSummary';
import { WorkflowActions } from './WorkflowActions';
import { WorkflowStepStrip } from './WorkflowStepStrip';

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
  const { data, status, error, fetchNextPage, hasNextPage, isFetchNextPageError } =
    useInstanceWorkflowsQuery(org, environment, app, collectionKey);

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
        isFetchMoreError={isFetchNextPageError}
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
  isFetchMoreError: boolean;
};

const InstanceWorkflowsContent = ({
  context,
  environment,
  status,
  error,
  workflows,
  hasMoreResults,
  fetchMoreResults,
  isFetchMoreError,
}: InstanceWorkflowsContentProps) => {
  const { t } = useTranslation();
  const { isFetchingMoreResults, doFetchMoreResults } = useFetchMoreResults(fetchMoreResults);

  if (context.collectionKey === undefined) {
    return <StudioAlert data-color='info'>{t('admin.workflows.no_results')}</StudioAlert>;
  }
  if (status === 'pending') {
    return <StudioSpinner aria-label={t('general.loading')} />;
  }
  // The query is in error whenever any page failed, a later "load more" included. Rows already
  // loaded stay on screen; only a failure with nothing to show becomes the error state.
  if (workflows === undefined) {
    return <WorkflowEngineError environment={environment} error={error} />;
  }
  if (!workflows.length) {
    return <StudioAlert data-color='info'>{t('admin.workflows.no_results')}</StudioAlert>;
  }

  return (
    <div className={classes.workflows}>
      <InstanceWorkflowSummary context={context} workflows={workflows} />
      {workflows.map((workflow) => (
        <WorkflowItem key={workflow.databaseId} context={context} workflow={workflow} />
      ))}
      {isFetchMoreError && (
        <StudioAlert data-color='danger' data-size='sm'>
          {t('admin.workflows.fetch_more_error')}
        </StudioAlert>
      )}
      {hasMoreResults && (
        <StudioButton
          data-size='sm'
          variant='secondary'
          disabled={isFetchingMoreResults}
          onClick={doFetchMoreResults}
        >
          {isFetchingMoreResults && <StudioSpinner aria-label={t('general.loading')} />}
          {t('admin.workflows.fetch_more')}
        </StudioButton>
      )}
    </div>
  );
};

type WorkflowItemProps = {
  context: WorkflowOpsContext;
  workflow: WorkflowStatus;
};

/**
 * One workflow as a row: what it is, where it is in its steps, how long it ran or has been running,
 * when a parked one tries again, and — on a failure — what went wrong, all readable without opening
 * it. The details behind the row are the full metadata, the step table and the ops verbs.
 */
const WorkflowItem = ({ context, workflow }: WorkflowItemProps) => {
  const { t } = useTranslation();
  const now = useNow(isActiveWorkflow(workflow));
  const duration = settledDurationOf(workflow);
  const liveNote = liveNoteOf(workflow, now, t);
  const rowError = isFailedWorkflow(workflow) ? rowErrorTextOf(workflow) : undefined;

  return (
    <StudioDetails>
      <StudioDetails.Summary>
        <span className={classes.summary}>
          <WorkflowStatusTag status={workflow.overallStatus} />
          <span className={classes.summaryOperation} title={workflow.operationId}>
            {workflowDisplayName(workflow)}
          </span>
          {workflow.isHead === false && (
            <StudioTag data-size='sm' data-color='neutral'>
              {t('admin.workflows.side_effect')}
            </StudioTag>
          )}
          <WorkflowStepStrip workflow={workflow} />
          {liveNote && <span className={classes.summaryTime}>{liveNote}</span>}
          {duration !== undefined && (
            <span className={classes.summaryTime}>
              {t('admin.workflows.row.duration')}: {formatDuration(duration, t)}
            </span>
          )}
          <span className={classes.summaryTime}>{formatDateAndTime(workflow.createdAt)}</span>
          {rowError && <code className={classes.rowError}>{rowError}</code>}
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
        <WorkflowSteps workflow={workflow} />
        <WorkflowActions context={context} workflow={workflow} />
      </StudioDetails.Content>
    </StudioDetails>
  );
};

/** How long a settled workflow ran, from its first attempt to its last change. Nothing while in flight. */
function settledDurationOf(workflow: WorkflowStatus): number | undefined {
  const started = toTime(workflow.executionStartedAt);
  const ended = toTime(workflow.updatedAt);
  if (isActiveWorkflow(workflow) || started === undefined || ended === undefined) {
    return undefined;
  }
  return Math.max(0, ended - started);
}

/**
 * What a workflow in flight is up to right now: how long the current attempt has run, or when a
 * parked one is due again. Ticks with the row's clock. Nothing for a settled workflow.
 */
function liveNoteOf(
  workflow: WorkflowStatus,
  now: number,
  t: ReturnType<typeof useTranslation>['t'],
): string | undefined {
  if (workflow.overallStatus === 'Processing') {
    const since = toTime(workflow.executionStartedAt);
    return since === undefined
      ? undefined
      : t('admin.workflows.row.running_for', { duration: formatDuration(now - since, t) });
  }
  if (PARKED_WORKFLOW_STATUSES.includes(workflow.overallStatus)) {
    const due = toTime(workflow.backoffUntil);
    if (due === undefined) {
      return undefined;
    }
    return due > now
      ? t('admin.workflows.row.next_attempt_in', { duration: formatDuration(due - now, t) })
      : t('admin.workflows.row.next_attempt_now');
  }
  return undefined;
}

/** The latest error in one line: the problem title and detail when the message carries them. */
function rowErrorTextOf(workflow: WorkflowStatus): string | undefined {
  const entry = latestErrorOf(workflow);
  if (!entry) {
    return undefined;
  }
  const details = parseEngineErrorMessage(entry.message);
  if (details.title && details.detail) {
    return `${details.title}: ${details.detail}`;
  }
  return details.title ?? details.detail ?? details.raw;
}

const WorkflowSteps = ({ workflow }: { workflow: WorkflowStatus }) => {
  const { t } = useTranslation();
  const steps = orderedSteps(workflow);

  if (!steps.length) {
    return null;
  }

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
            <StudioTable.Cell>{t('admin.instances.last_changed')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.workflows.step.details')}</StudioTable.Cell>
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {steps.map((step) => (
            <StudioTable.Row key={step.databaseId}>
              <StudioTable.Cell>{step.processingOrder}</StudioTable.Cell>
              <StudioTable.Cell>{step.operationId}</StudioTable.Cell>
              <StudioTable.Cell>
                <WorkflowStatusTag status={step.status} />
              </StudioTable.Cell>
              <StudioTable.Cell>{step.retryCount}</StudioTable.Cell>
              <StudioTable.Cell>{formatDateAndTime(step.updatedAt)}</StudioTable.Cell>
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
  const deferReason = step.lastDeferReason;
  const errorHistory = step.errorHistory ?? [];

  if (!deferReason && !errorHistory.length) {
    return <span>-</span>;
  }

  // The engine leaves the last defer reason on the step after it stops waiting, so only a step that
  // is actually parked may read as currently blocked. On any other step the same text is history,
  // which is worth keeping for triage under a label that says so.
  const deferReasonLabel =
    step.status === 'Waiting'
      ? t('admin.workflows.step.waiting_reason')
      : t('admin.workflows.step.last_waiting_reason');

  return (
    <div className={classes.stepDetails}>
      {/* Engine-provided free text (defer reasons, error messages) is rendered as its own node
          rather than interpolated into a translation, since i18next HTML-escapes interpolations.
          It is also set apart as verbatim technical output: the app runtime writes these in
          English, so they must not read as part of the Norwegian sentence around them. */}
      {deferReason && (
        <span>
          {deferReasonLabel}: <code className={classes.engineText}>{deferReason}</code>
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
          <div className={classes.errorHistory}>
            {newestFirst(errorHistory).map((entry, index) => (
              <EngineErrorMessage key={`${entry.timestamp}-${index}`} entry={entry} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
