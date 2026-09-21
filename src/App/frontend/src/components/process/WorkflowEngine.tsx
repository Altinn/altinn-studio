import React, { useEffect, useState } from 'react';

import { AccordionItem, Flex } from '@app/form-component';
import { Alert, Heading } from '@digdir/designsystemet-react';

import classes from 'src/components/process/ProcessWrapper.module.css';
import { Loader } from 'src/core/loading/Loader';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useProcessQuery, useProcessWorkflow } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { ELEMENT_TYPE } from 'src/types/shared';
import type { IProcessWorkflowFailure } from 'src/types/shared';

/** Delay before explaining that processing is taking unusually long. */
const STILL_WORKING_MS = 8_000;

/**
 * Uses the ordinary form loader while a workflow transition is running. After eight seconds
 * of processing, the user also sees the safe-to-leave message. Both timestamps come from the
 * engine clock; a browser timer covers the remaining wait between status responses.
 */
export function WorkflowProcessing() {
  const workflow = useProcessWorkflow();
  const isProcessing = workflow?.status === 'processing';
  const startedAt = isProcessing ? workflow.startedAt : undefined;
  const currentTime = isProcessing ? workflow.currentTime : undefined;
  const engineElapsed = Date.parse(currentTime ?? '') - Date.parse(startedAt ?? '');
  // Older engines and invalid timestamps fall back to an eight-second wait on this screen.
  const elapsedMs = Number.isFinite(engineElapsed) ? Math.max(0, engineElapsed) : 0;
  const [stillWorking, setStillWorking] = useState(false);

  useEffect(() => {
    const remainingMs = Math.max(0, STILL_WORKING_MS - elapsedMs);
    setStillWorking(isProcessing && remainingMs === 0);
    if (!isProcessing || remainingMs === 0) {
      return;
    }
    const stillWorkingTimer = setTimeout(() => setStillWorking(true), remainingMs);
    return () => {
      clearTimeout(stillWorkingTimer);
    };
  }, [isProcessing, startedAt, elapsedMs]);

  return (
    <Loader
      reason='workflow-processing'
      overlay={
        isProcessing && stillWorking ? (
          <div
            role='status'
            aria-live='polite'
            aria-atomic='true'
            className={classes.stillWorkingOverlay}
          >
            <Alert
              data-color='info'
              className={classes.stillWorkingAlert}
            >
              <Lang id='process_workflow.still_working' />
            </Alert>
          </div>
        ) : undefined
      }
    />
  );
}

/**
 * Failure kinds emitted by the backend. Unknown values use the generic label rather than exposing
 * a raw translation key.
 */
const KNOWN_FAILURE_KINDS = new Set(['stepFailed', 'dependencyFailed', 'engineFault', 'timeout']);

/**
 * Renders the terminal workflow-failure page. Recovery requires an ops-driven resume, so the page
 * offers no user-facing retry and directs the user to support instead. Its optional details contain
 * only safe structured facts and never raw engine or service-task error text. Polling stops while
 * this page is shown; after an ops resume, the user refreshes to load the recovered state.
 */
export function WorkflowFailed() {
  const workflow = useProcessWorkflow();
  const instanceId = useLaxInstanceId();

  return (
    <Flex
      item
      size={{ xs: 12 }}
      aria-live='polite'
    >
      <Heading
        level={2}
        data-size='sm'
      >
        <Lang id='process_workflow.failed_heading' />
      </Heading>
      <div className={classes.failedDescription}>
        <Lang id='process_workflow.failed_description' />
      </div>
      <div className={classes.failedDescription}>
        <Lang
          id='process_workflow.failed_contact'
          params={[
            <Lang
              key={0}
              id='general.customer_service_phone_number'
            />,
            <Lang
              key={1}
              id='general.customer_service_email'
            />,
            <Lang
              key={2}
              id='instantiate.unknown_error_show_details'
            />,
          ]}
        />
      </div>
      {workflow?.status === 'failed' && workflow.failure ? (
        <WorkflowFailedDetails
          failure={workflow.failure}
          instanceId={instanceId}
        />
      ) : null}
    </Flex>
  );
}

interface WorkflowFailedDetailsProps {
  failure: IProcessWorkflowFailure;
  instanceId: string | undefined;
}

/**
 * Renders an unknown-error-style accordion with safe structured failure facts. It deliberately
 * excludes raw error text, internal engine step identities, and the target task. The instance and
 * workflow identifiers give support enough information to find the submission and transition.
 */
function WorkflowFailedDetails({ failure, instanceId }: WorkflowFailedDetailsProps) {
  const currentLanguage = useCurrentLanguage();

  const kindKey = KNOWN_FAILURE_KINDS.has(failure.kind)
    ? `process_workflow.failure_kind.${failure.kind}`
    : 'process_workflow.failure_kind.unknown';

  const occurredAt = failure.occurredAt ? new Date(failure.occurredAt) : undefined;

  return (
    <AccordionItem
      title={<Lang id='instantiate.unknown_error_show_details' />}
      className={classes.failedDetails}
    >
      <div className={classes.failedDetailsContainer}>
        <WorkflowFailedDetailItem
          label='process_workflow.failed_details_kind'
          value={<Lang id={kindKey} />}
        />
        {occurredAt && (
          <WorkflowFailedDetailItem
            label='process_workflow.failed_details_time'
            value={occurredAt.toLocaleString(currentLanguage)}
          />
        )}
        {instanceId && (
          <WorkflowFailedDetailItem
            label='process_workflow.failed_details_instance'
            value={instanceId}
          />
        )}
        {failure.workflowId && (
          <WorkflowFailedDetailItem
            label='process_workflow.failed_details_reference'
            value={failure.workflowId}
          />
        )}
      </div>
    </AccordionItem>
  );
}

/**
 * Determines whether the current service task owns its workflow failure. Those failures retain
 * the task view and its recovery actions; failures without a task UI owner use the terminal page.
 */
export function useIsWorkflowFailedOnCurrentServiceTask() {
  const { data: process } = useProcessQuery();
  const workflow = process?.workflow;
  const currentTask = process?.currentTask;
  return (
    workflow?.status === 'failed' &&
    currentTask?.elementType === ELEMENT_TYPE.SERVICE_TASK &&
    workflow.targetTask === currentTask.elementId
  );
}

/**
 * Determines whether the processing workflow is parked ON the current committed service task (a
 * deferring step polling for its outcome) rather than a transition heading somewhere else. Lets a
 * layouted service task render its own page for this state, exactly as it does when parked.
 */
export function useIsWorkflowProcessingOnCurrentServiceTask() {
  const { data: process } = useProcessQuery();
  const workflow = process?.workflow;
  const currentTask = process?.currentTask;
  return (
    workflow?.status === 'processing' &&
    currentTask?.elementType === ELEMENT_TYPE.SERVICE_TASK &&
    workflow.targetTask === currentTask.elementId
  );
}

function WorkflowFailedDetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div>
        <strong>
          <Lang id={label} />:
        </strong>
      </div>
      <div>{value}</div>
    </div>
  );
}
