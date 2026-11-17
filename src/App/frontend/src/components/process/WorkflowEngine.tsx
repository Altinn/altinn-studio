import React, { useEffect, useState } from 'react';

import { AccordionItem, Flex } from '@app/form-component';
import { Alert, Heading } from '@digdir/designsystemet-react';

import classes from 'src/components/process/ProcessWrapper.module.css';
import { useIsServiceTaskPage } from 'src/components/process/serviceTaskPage';
import { Loader } from 'src/core/loading/Loader';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useProcessQuery, useProcessWorkflow } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import utilClasses from 'src/styles/utils.module.css';
import { ELEMENT_TYPE } from 'src/types/shared';
import type { IProcessWorkflowFailure } from 'src/types/shared';

/** Delay before explaining that processing is taking unusually long. */
const STILL_WORKING_MS = 8_000;

/** Failed attempts after which the user is told processing is having trouble, however recent. */
const TROUBLE_FAILED_ATTEMPTS = 2;

/** How long the current step must keep failing, from its first failed attempt, before the user is told. */
const TROUBLE_AFTER_ONE_FAILURE_MS = 20_000;

/**
 * How long a new status region stays empty, so screen readers have registered it before its text
 * arrives. Browsers update the accessibility tree asynchronously.
 */
const STATUS_REGION_SETTLE_MS = 100;

/**
 * Uses the ordinary form loader while a workflow transition is running. After eight seconds
 * of processing, the user also sees the safe-to-leave message. While the workflow is having
 * trouble (see useIsWorkflowHavingTrouble), that message is replaced by a warning.
 */
export function WorkflowProcessing() {
  const { isProcessing, runStartedAt, elapsedMs } = useWorkflowRun();
  const stillWorking = useHasProcessedFor(STILL_WORKING_MS, isProcessing, runStartedAt, elapsedMs);
  const havingTrouble = useIsWorkflowHavingTrouble();

  return (
    <Loader
      reason='workflow-processing'
      overlay={
        isProcessing && (stillWorking || havingTrouble) ? (
          <div
            role='status'
            aria-atomic='true'
            className={classes.stillWorkingOverlay}
          >
            <Alert
              data-color={havingTrouble ? 'warning' : 'info'}
              className={classes.stillWorkingAlert}
            >
              <Lang id={havingTrouble ? 'process_workflow.having_trouble' : 'process_workflow.still_working'} />
            </Alert>
          </div>
        ) : undefined
      }
    />
  );
}

/**
 * A warning at the top of a service task's own page while the workflow is having trouble (see
 * useIsWorkflowHavingTrouble). It stays in view while the page scrolls, cannot be dismissed, and
 * clears itself once a step succeeds again. Any other page renders nothing here.
 */
export function WorkflowTroubleBanner() {
  return useIsServiceTaskPage() ? <TroubleBanner /> : null;
}

/**
 * Screen readers hear the warning through a visually hidden status region that mounts empty and takes the text only
 * once it has settled, also when the trouble is already active on mount, since a live region inserted with its text
 * already in it is not reliably announced. The visible warning is hidden from them, so the text is announced once.
 */
function TroubleBanner() {
  const havingTrouble = useIsWorkflowHavingTrouble();
  const [regionSettled, setRegionSettled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRegionSettled(true), STATUS_REGION_SETTLE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <div
        role='status'
        className={utilClasses.visuallyHidden}
      >
        {havingTrouble && regionSettled && <Lang id='process_workflow.having_trouble' />}
      </div>
      {havingTrouble && (
        <Alert
          aria-hidden='true'
          data-color='warning'
          className={classes.troubleBanner}
        >
          <Lang id='process_workflow.having_trouble' />
        </Alert>
      )}
    </>
  );
}

/**
 * Whether the processing workflow is having trouble: its current step has failed twice in a row, or has kept failing
 * for twenty seconds since its first failed attempt, so a single quick blip passes unnoticed. How long the run has
 * lasted does not count, so one failed re-check after hours of deferring is a blip too. Both come from the engine's
 * latest status, without a timer, so every session gives the same answer, also after a reload, and it never reports a
 * step that recovered before the next poll could say so. It clears when the step succeeds or defers (the engine
 * resets failedAttempts). Without firstFailedAt, as from an older engine, only the second failure counts.
 */
export function useIsWorkflowHavingTrouble() {
  const { sampledAt, failedAttempts, firstFailedAt } = useWorkflowRun();
  const failingForMs = sampledAt - Date.parse(firstFailedAt ?? '');
  return (
    failedAttempts >= TROUBLE_FAILED_ATTEMPTS || (failedAttempts > 0 && failingForMs >= TROUBLE_AFTER_ONE_FAILURE_MS)
  );
}

/**
 * The processing workflow's current run: when it started, when the engine sampled its status,
 * how long it has run on the engine clock, and how many attempts in a row of its current step have
 * failed, from when. Zero or unknown (NaN, undefined) when no transition is processing.
 */
function useWorkflowRun() {
  const workflow = useProcessWorkflow();
  const isProcessing = workflow?.status === 'processing';
  // A resume reruns the transition and keeps startedAt, so the current run is timed from the resume.
  const runStartedAt = isProcessing ? (workflow.resumedAt ?? workflow.startedAt) : undefined;
  const sampledAt = Date.parse((isProcessing ? workflow.currentTime : undefined) ?? '');
  const failedAttempts = isProcessing ? (workflow.failedAttempts ?? 0) : 0;
  const firstFailedAt = isProcessing ? workflow.firstFailedAt : undefined;
  const engineElapsed = sampledAt - Date.parse(runStartedAt ?? '');
  // Older engines and invalid timestamps fall back to measuring from when this screen appeared.
  const elapsedMs = Number.isFinite(engineElapsed) ? Math.max(0, engineElapsed) : 0;
  return { isProcessing, runStartedAt, sampledAt, elapsedMs, failedAttempts, firstFailedAt };
}

/**
 * Reports whether processing has run for at least `thresholdMs` while `active`. Starts from the
 * engine-measured `elapsedMs` and lets a browser timer cover the rest, restarting when a different
 * run (`runStartedAt`) begins: a new transition, or a resume of this one.
 */
function useHasProcessedFor(thresholdMs: number, active: boolean, runStartedAt: string | undefined, elapsedMs: number) {
  const [reached, setReached] = useState(false);

  useEffect(() => {
    const remainingMs = Math.max(0, thresholdMs - elapsedMs);
    setReached(active && remainingMs === 0);
    if (!active || remainingMs === 0) {
      return;
    }
    const timer = setTimeout(() => setReached(true), remainingMs);
    return () => {
      clearTimeout(timer);
    };
  }, [thresholdMs, active, runStartedAt, elapsedMs]);

  return reached;
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
