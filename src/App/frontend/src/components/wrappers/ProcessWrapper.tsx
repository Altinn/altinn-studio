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
function WorkflowProcessing() {
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

/**
 * Synchronizes a URL that was parked on a transition's previous task. Navigation happens only
 * after this session observed a busy workflow settle, preserving the manual recovery path for a
 * stale URL opened after the transition already completed.
 */
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
