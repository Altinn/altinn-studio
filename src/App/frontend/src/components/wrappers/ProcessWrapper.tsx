import React, { useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { AccordionItem, Button, Flex, Spinner } from '@app/form-component';
import { Alert, Heading } from '@digdir/designsystemet-react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { PresentationComponent } from 'src/components/presentation/Presentation';
import classes from 'src/components/wrappers/ProcessWrapper.module.css';
import { Loader } from 'src/core/loading/Loader';
import { useIsNavigating } from 'src/core/routing/useIsNavigating';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { FormStore } from 'src/features/form/FormContext';
import { useInstancePollFailureCount, useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { getProcessNextMutationKey, getTargetTaskFromProcess } from 'src/features/instance/useProcessNext';
import { useGetTaskTypeById, useProcessQuery, useProcessWorkflow } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { PdfWrapper, usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import { Confirm } from 'src/features/process/confirm/containers/Confirm';
import { Feedback } from 'src/features/process/feedback/Feedback';
import { ServiceTask } from 'src/features/process/service/ServiceTask';
import { useNavigationParam } from 'src/hooks/navigation';
import { useIsValidTaskId, useNavigateToTask } from 'src/hooks/useNavigatePage';
import { useWaitForQueries } from 'src/hooks/useWaitForQueries';
import { getComponentDef, implementsSubRouting } from 'src/layout';
import { RedirectBackToMainForm } from 'src/layout/Subform/SubformWrapper';
import { TaskKeys } from 'src/routesBuilder';
import { ProcessTaskType } from 'src/types';
import { ELEMENT_TYPE } from 'src/types/shared';
import { getPageTitle } from 'src/utils/getPageTitle';
import type { IProcessWorkflowFailure, IProcessWorkflowProgress } from 'src/types/shared';

interface NavigationErrorProps {
  label: string;
}

function NavigationError({ label }: NavigationErrorProps) {
  const currentTaskId = useProcessQuery().data?.currentTask?.elementId;
  const navigateToTask = useNavigateToTask();

  const appName = useAppName();
  const appOwner = useAppOwner();
  const { langAsString } = useLanguage();

  return (
    <>
      <title>{`${getPageTitle(appName, langAsString(label), appOwner)}`}</title>
      <Flex
        item
        size={{ xs: 12 }}
        aria-live='polite'
      >
        <div>
          <Lang id={label} />
        </div>

        {currentTaskId && (
          <div className={classes.navigationError}>
            <Button
              variant='secondary'
              size='md'
              onClick={() => {
                navigateToTask(currentTaskId);
              }}
            >
              <Lang id='general.navigate_to_current_process' />
            </Button>
          </div>
        )}
      </Flex>
    </>
  );
}

// After this long in the processing state we stop leaving the user staring at a bare spinner and
// level with them: the wait is unusual, their data is durably stored and the processing continues
// server-side whether the page stays open or not - so they can safely leave and come back. A
// transition can legitimately be stuck retrying for hours (network trouble, a struggling downstream
// service), and a bare spinner is infuriating at that scale. One escalation, not a graduated series
// of near-identical "this is slow" notes - a single honest message once the wait is clearly abnormal.
// The wait is measured from the transition's server-reported start (workflow.startedAt) when
// present, so a page refresh or a second session doesn't restart the clock: reconnecting to a
// transition that has already been running this long shows the message immediately. Without the
// timestamp (older backend) we fall back to measuring from mount.
const STILL_WORKING_MS = 30_000;

// From this many consecutive failed poll cycles we tell the user we're having trouble reaching the
// server (one failed cycle is a swallowed blip; InstanceProvider escalates to the full error page
// at INSTANCE_POLL_FAILURE_ESCALATION_CYCLES). Staying honest while the poll loop self-recovers.
const CONNECTION_TROUBLE_AFTER_CYCLES = 2;

// Spinner + predefined text (see #18935 for the design discussion). Every string is a text resource,
// so apps override any of them per app. The layers:
//   always      - spinner, title, body ("you don't need to do anything, we continue automatically")
//   resolvable  - "Steg x av y" progress through the transition's workflow steps (engine-reported)
//   >=30s       - an info alert: data is safely stored, processing continues on its own, the page can
//                 be closed - the honest answer to a transition stuck for a long time. Single tier:
//                 no graduated series of near-identical "this is slow" notes, just one message once
//                 the wait is clearly abnormal. Measured from the transition's start, not the page's.
//   poll issues - connection_trouble (orthogonal: the page itself is having trouble asking for
//                 updates, not the transition being slow, so it may co-exist with the alert above)
function WorkflowProcessing() {
  const workflow = useProcessWorkflow();
  const pollFailureCount = useInstancePollFailureCount();
  const { langAsString } = useLanguage();
  const [stillWorking, setStillWorking] = useState(false);
  const startedAt = workflow?.startedAt;
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
        <WorkflowProcessingStep progress={workflow?.progress} />
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

// "Steg x av y" - progress through the in-flight transition's workflow steps, reported live by the
// engine on the workflow annotation (completed of total; execution is on step completed + 1). The
// step identities stay internal - only the numbers surface, showing *movement* during the wait.
// Omitted when the engine didn't report counts (e.g. an older engine).
function WorkflowProcessingStep({ progress }: { progress: IProcessWorkflowProgress | undefined }) {
  if (!progress || progress.total <= 0) {
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

// Failure kinds the backend can emit (camelCase on the wire); anything else falls back to the
// generic label so an unknown/new kind never renders as a raw key.
const KNOWN_FAILURE_KINDS = new Set(['stepFailed', 'dependencyFailed', 'engineFault', 'timeout']);

// The engine deemed this failure terminal - it already exhausted its automatic retry budget, so
// offering the citizen a Retry would be wrong. This is an error page and it does NOT sugar-coat: the
// processing failed, it will not resolve on its own, and there is no user-facing recovery. Recovery
// is ops-driven (a manual resume by the service owner) and this page is STATIC - so we tell the user
// plainly to get in touch rather than implying a safety net (no "we've recorded it" / "no need to
// resubmit", which over-promise a monitoring/auto-retry that may not exist for a given app). The
// contact points at Altinn customer service (the service owner - who could actually resume it - is
// not reachable from here yet) and asks the user to relay the reference so support can find the
// instance/workflow. Details expander carries only SAFE structured facts (kind, time, the two
// references) - never raw error text (it originates from the engine / a service task and may contain
// internal detail). InstanceProvider deliberately stops polling in the failed state (an open tab must
// not pay the expensive failed-path read forever); after an ops resume, a manual refresh picks up the
// recovered state.
function WorkflowFailed() {
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
      <WorkflowFailedDetails
        failure={workflow?.failure}
        instanceId={instanceId}
      />
    </Flex>
  );
}

interface WorkflowFailedDetailsProps {
  failure: IProcessWorkflowFailure | undefined;
  instanceId: string | undefined;
}

// Reuses the unknown-error details expander pattern (see UnknownErrorDetails): an AccordionItem
// with name/value rows. Contains only safe structured facts - never raw error text. Deliberately
// nothing about *which* step failed: the engine step identities are internal (raw operation ids,
// not localizable), and the transition's target task is just misleading here (it names where the
// process was headed, as a generic task-type label). Two references are surfaced so the user can
// relay them to support: the instance id (the form submission, searchable in Storage) and the
// workflow id (the specific transition, searchable in the engine).
function WorkflowFailedDetails({ failure, instanceId }: WorkflowFailedDetailsProps) {
  const currentLanguage = useCurrentLanguage();

  const kindKey =
    failure?.kind && KNOWN_FAILURE_KINDS.has(failure.kind)
      ? `process_workflow.failure_kind.${failure.kind}`
      : 'process_workflow.failure_kind.unknown';

  const occurredAt = failure?.occurredAt ? new Date(failure.occurredAt) : undefined;

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
        {failure?.workflowId && (
          <WorkflowFailedDetailItem
            label='process_workflow.failed_details_reference'
            value={failure.workflowId}
          />
        )}
      </div>
    </AccordionItem>
  );
}

// A failed workflow that targeted the CURRENT task, when that task is a service task, is the
// service task's own failure: its view (the app's custom layout for the task, or the default
// ServiceTask screen) owns the recovery affordances - retry, and the bpmn-allowed reject the
// backend explicitly permits from that screen (it abandons the failed workflow so the reject can
// run). Replacing that view with the terminal error page would leave the user with no way out.
// Only failures no task UI can own - a transition failing before it committed the target task, an
// engine fault, a failure targeting some other task - show the terminal error page.
function useIsWorkflowFailedOnCurrentServiceTask() {
  const { data: process } = useProcessQuery();
  const workflow = process?.workflow;
  const currentTask = process?.currentTask;
  return (
    workflow?.status === 'failed' &&
    currentTask?.elementType === ELEMENT_TYPE.SERVICE_TASK &&
    workflow.targetTask === currentTask.elementId
  );
}

// A transition can settle while this session's URL is still parked on the pre-transition task
// (e.g. a reload during the transition). The same-session flow navigates from useProcessNext's
// onSuccess/onError, but here the poll only converges the *data* (currentTask advances, workflow
// settles) - nothing converges the URL, stranding the user on the old task's "not available"
// error. So when the live status goes from busy (processing/failed) to settled, navigate to the
// committed task exactly like the sync flow would. A URL that is stale on arrival (no observed
// busy status - e.g. an old deep link, or a manual refresh after an ops resume recovered a failed
// transition) keeps the navigation error + its manual button.
function useNavigateToSettledTask(taskId: string | undefined, enabled: boolean) {
  const { data: process } = useProcessQuery();
  const status = process?.workflow?.status;
  const navigateToTask = useNavigateToTask();
  const failedOnCurrentServiceTask = useIsWorkflowFailedOnCurrentServiceTask();
  const wasBusyRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (status === 'processing' || (status === 'failed' && !failedOnCurrentServiceTask)) {
      wasBusyRef.current = true;
      return;
    }
    if (failedOnCurrentServiceTask) {
      // A failure owned by the current service task renders as that task's view, so the URL must
      // converge onto the committed task unconditionally - the submitting session never navigated
      // (useProcessNext swallows the failure), and a reconnecting session should land on the same
      // screen a successful transition would have shown.
      wasBusyRef.current = false;
      const settledTask = getTargetTaskFromProcess(process);
      if (settledTask && settledTask !== taskId) {
        navigateToTask(settledTask);
      }
      return;
    }
    if (!wasBusyRef.current) {
      return;
    }
    wasBusyRef.current = false;

    const settledTask = getTargetTaskFromProcess(process);
    if (settledTask && settledTask !== taskId) {
      navigateToTask(settledTask);
    }
  }, [enabled, status, failedOnCurrentServiceTask, process, taskId, navigateToTask]);
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

export function ProcessWrapper({ children }: PropsWithChildren) {
  const taskId = useNavigationParam('taskId');
  const isWrongTask = useIsWrongTask(taskId);
  const isValidTaskId = useIsValidTaskId()(taskId);
  const taskType = useGetTaskTypeById()(taskId);
  const isRunningProcessNext = useIsRunningProcessNext();
  const workflow = useProcessWorkflow();
  const failedOnCurrentServiceTask = useIsWorkflowFailedOnCurrentServiceTask();
  const isPdfMode = usePdfModeActive();

  // PDF mode never navigates: the render is a one-shot snapshot taken *during* the transition.
  useNavigateToSettledTask(taskId, !isPdfMode);

  if (isRunningProcessNext === null || isRunningProcessNext || isWrongTask === null) {
    return <Loader reason='process-wrapper' />;
  }

  if (taskType === ProcessTaskType.Archived && taskId !== TaskKeys.CustomReceipt) {
    // Someone else will redirect us to the receipt shortly. If a CustomReceipt is set up, we'll end back here.
    return <Loader reason='redirect-to-receipt' />;
  }

  if (!isValidTaskId) {
    return (
      <PresentationComponent showNavigation={false}>
        <NavigationError label='general.invalid_task_id' />
      </PresentationComponent>
    );
  }

  // Live workflow-engine state machine. Sourced from the fetched process state so it survives reloads
  // and concurrent sessions. This MUST be checked BEFORE the wrong-task guard below: a transition that
  // is in flight or has failed post-commit has already committed currentTask forward (e.g. to Task_2)
  // while the URL still points at the task the user submitted from (Task_1). That lag would otherwise
  // trip isWrongTask and bury the transition state behind a "part of form completed" page - and since
  // the failed state is terminal (it never settles), the URL would never be corrected and the user
  // would be stuck there. While a transition is in flight or has failed we replace the current task's
  // UI entirely (which also suppresses its Submit/next affordances, since those live inside the task
  // components below).
  // PDF mode must bypass this replacement: the PDF service task renders the page *during* the
  // transition (workflow.status === 'processing' by definition), so gating on it would replace the
  // form - and #readyForPrint - with a spinner and deadlock the PDF generation it is part of.
  if (!isPdfMode && workflow?.status === 'processing') {
    return (
      <PresentationComponent showNavigation={false}>
        <WorkflowProcessing />
      </PresentationComponent>
    );
  }

  // A failure owned by the current service task falls through to the task's own view (see
  // useIsWorkflowFailedOnCurrentServiceTask) - the terminal error page is only for failures no
  // task UI can recover from.
  if (!isPdfMode && workflow?.status === 'failed' && !failedOnCurrentServiceTask) {
    return (
      <PresentationComponent showNavigation={false}>
        <WorkflowFailed />
      </PresentationComponent>
    );
  }

  if (isWrongTask) {
    return (
      <PresentationComponent showNavigation={false}>
        <NavigationError label='general.part_of_form_completed' />
      </PresentationComponent>
    );
  }

  if (taskType === ProcessTaskType.Confirm) {
    return (
      <PresentationComponent>
        <Confirm />
      </PresentationComponent>
    );
  }

  if (taskType === ProcessTaskType.Feedback) {
    return (
      <PresentationComponent>
        <Feedback />
      </PresentationComponent>
    );
  }

  if (taskType === ProcessTaskType.Service) {
    return (
      <PdfWrapper>
        <PresentationComponent>
          <ServiceTask />
        </PresentationComponent>
      </PdfWrapper>
    );
  }

  if (taskType === ProcessTaskType.Data) {
    return children;
  }

  throw new Error(`Unknown task type: ${taskType}`);
}

export const ComponentRouting = () => {
  const componentId = useNavigationParam('componentId');
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();

  // Wait for props to sync, needed for now
  if (!componentId) {
    return <Loader reason='component-routing' />;
  }

  const component = layoutLookups.allComponents[componentId];
  if (!component) {
    // Consider adding a 404 page?
    return <RedirectBackToMainForm />;
  }

  const def = getComponentDef(component.type);
  if (implementsSubRouting(def)) {
    const SubRouting = def.subRouting;

    return <SubRouting baseComponentId={componentId} />;
  }

  // If node exists but does not implement sub routing
  throw new Error(`Component ${componentId} does not have subRouting`);
};

function isRunningProcessNext(queryClient: QueryClient) {
  return queryClient.isMutating({ mutationKey: getProcessNextMutationKey() }) > 0;
}

function useIsRunningProcessNext() {
  const queryClient = useQueryClient();
  const [isMutating, setIsMutating] = useState<boolean | null>(null);

  // Intentionally wrapped in a useEffect() and saved as a state. If this happens, we'll seemingly be locked out
  // with a <Loader /> forever, but when this happens, we also know we'll be re-rendered soon. This is only meant to
  // block rendering when we're calling process/next.
  useEffect(() => {
    setIsMutating(isRunningProcessNext(queryClient));
  }, [queryClient]);

  return isMutating;
}

function useIsWrongTask(taskId: string | undefined) {
  const isNavigating = useIsNavigating();
  const { data: process } = useProcessQuery();
  const currentTaskId = process?.currentTask?.elementId;
  const waitForQueries = useWaitForQueries();

  const [isWrongTask, setIsWrongTask] = useState<boolean | null>(null);
  const isCurrentTask =
    currentTaskId === undefined && taskId === TaskKeys.CustomReceipt ? true : currentTaskId === taskId;

  // We intentionally delay this state from being set until after queries/mutations finish, so the navigation error
  // does not show up while we're navigating. Without this, the message will flash over the screen shortly
  // in-between all the <Loader /> components.
  useEffect(() => {
    if (isCurrentTask) {
      setIsWrongTask(false);
    } else {
      let cancelled = false;
      const delayedCheck = async () => {
        await waitForQueries();
        await new Promise((resolve) => setTimeout(resolve, 100)); // Wait a bit longer, for navigation to maybe occur
        if (!cancelled) {
          setIsWrongTask(true);
        }
      };
      delayedCheck().then();

      return () => {
        cancelled = true;
      };
    }
  }, [isCurrentTask, waitForQueries]);

  return isWrongTask && !isCurrentTask && !isNavigating;
}
