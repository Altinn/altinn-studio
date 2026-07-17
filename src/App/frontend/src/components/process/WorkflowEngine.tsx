import React, { useEffect, useState } from 'react';

import { AccordionItem, Flex, Spinner } from '@app/form-component';
import { Alert, Heading } from '@digdir/designsystemet-react';

import classes from 'src/components/process/ProcessWrapper.module.css';
import { useInstancePollFailureCount, useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useProcessQuery, useProcessWorkflow } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { ELEMENT_TYPE } from 'src/types/shared';
import type { IProcessWorkflowFailure, IProcessWorkflowProgress } from 'src/types/shared';

/**
 * Delay before explaining that processing is taking unusually long. The server-reported start
 * time keeps the threshold stable across refreshes and sessions; older backends fall back to the
 * page-mount time. A single escalation avoids a series of near-identical slow-wait messages.
 */
const STILL_WORKING_MS = 30_000;
/**
 * Consecutive failed poll cycles before the waiting view reports connection trouble. A single
 * failed cycle is treated as a transient blip while the poll loop recovers.
 */
const CONNECTION_TROUBLE_AFTER_CYCLES = 2;

/**
 * Renders the live workflow-transition state. Every message is a text resource, so an app can
 * override it. The spinner, title, and body are always present; engine-reported progress is shown
 * when available; the slow-processing alert is shown after 30 seconds; and connection trouble is
 * shown independently when polling has repeatedly failed.
 */
export function WorkflowProcessing() {
  const workflow = useProcessWorkflow();
  const pollFailureCount = useInstancePollFailureCount();
  const { langAsString } = useLanguage();
  const [stillWorking, setStillWorking] = useState(false);
  const startedAt = workflow?.status === 'processing' ? workflow.startedAt : undefined;

  useEffect(() => {
    // Clamping elapsed at 0 guards against client-clock skew: a reconnect must never wait longer
    // than a fresh mount would.
    const startedMs = startedAt ? Date.parse(startedAt) : Number.NaN;
    const elapsedMs = Number.isFinite(startedMs) ? Math.max(0, Date.now() - startedMs) : 0;
    const stillWorkingTimer = setTimeout(() => setStillWorking(true), Math.max(0, STILL_WORKING_MS - elapsedMs));
    return () => {
      clearTimeout(stillWorkingTimer);
    };
  }, [startedAt]);

  return (
    <Flex
      item
      size={{ xs: 12 }}
      aria-live='polite'
    >
      <div className={classes.processingContainer}>
        <Spinner
          aria-hidden='true'
          aria-label={langAsString('general.loading')}
          data-size='xl'
        />
        <Heading
          level={2}
          data-size='sm'
        >
          <Lang id='process_workflow.advancing_title' />
        </Heading>
        <div className={classes.processingNote}>
          <Lang id='process_workflow.advancing_body' />
        </div>
        {workflow?.status === 'processing' && workflow.progress ? (
          <WorkflowProcessingStep progress={workflow.progress} />
        ) : null}
        {pollFailureCount >= CONNECTION_TROUBLE_AFTER_CYCLES && (
          <div className={classes.processingNote}>
            <Lang id='process_workflow.connection_trouble' />
          </div>
        )}
        {stillWorking && (
          <Alert
            data-color='info'
            className={classes.stillWorkingAlert}
          >
            <Lang id='process_workflow.still_working' />
          </Alert>
        )}
      </div>
    </Flex>
  );
}

/**
 * Renders engine-reported progress through an in-flight transition. Step identities remain
 * internal; only the completed and total counts are shown to demonstrate movement during the wait.
 */
function WorkflowProcessingStep({ progress }: { progress: IProcessWorkflowProgress }) {
  if (progress.total <= 0) {
    return null;
  }

  const currentStep = Math.min(progress.completed + 1, progress.total);
  return (
    <div className={classes.processingStep}>
      <Lang
        id='process_workflow.advancing_step'
        params={[currentStep, progress.total]}
      />
    </div>
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
