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
import { useInstancePollFailureCount } from 'src/features/instance/InstanceContext';
import { getProcessNextMutationKey, getTargetTaskFromProcess } from 'src/features/instance/useProcessNext';
import {
  useGetAltinnTaskType,
  useGetTaskTypeById,
  useProcessQuery,
  useProcessWorkflow,
} from 'src/features/instance/useProcessQuery';
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
import { getPageTitle } from 'src/utils/getPageTitle';
import type { IProcessWorkflowFailure } from 'src/types/shared';

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

// After this long in the processing state we reassure the user it's still working, rather than
// leaving them staring at a spinner indefinitely (workflows can retry for a long time server-side).
const TAKING_LONGER_MS = 20_000;

// From this long we level with the user: the wait is unusual, their data is durably stored and the
// processing continues server-side whether the page stays open or not - so they can safely leave
// and come back. A transition can legitimately be stuck retrying for hours (network trouble, a
// struggling downstream service), and a bare spinner is infuriating at that scale.
const STILL_WORKING_MS = 60_000;

// From this many consecutive failed poll cycles we tell the user we're having trouble reaching the
// server (one failed cycle is a swallowed blip; InstanceProvider escalates to the full error page
// at INSTANCE_POLL_FAILURE_ESCALATION_CYCLES). Staying honest while the poll loop self-recovers.
const CONNECTION_TROUBLE_AFTER_CYCLES = 2;

// Spinner + predefined text (see #18935 for the design discussion), with escalation tiers as the
// wait grows. Every string is a text resource, so apps override any of them per app. The layers:
//   always      - spinner, title, body ("you don't need to do anything, we continue automatically")
//   resolvable  - "Steg x av y" when the target task is one of the process' tasks
//   retrying    - the engine reported the transition parked between automatic retry attempts; this
//                 explains the wait more specifically than (and therefore replaces) taking_longer
//   >=20s       - taking_longer reassurance
//   >=60s       - an info alert: data is safely stored, processing continues on its own, the page
//                 can be closed - the honest answer to a transition stuck retrying for hours
//   poll issues - connection_trouble (the page itself is having trouble asking for updates)
function WorkflowProcessing() {
  const workflow = useProcessWorkflow();
  const pollFailureCount = useInstancePollFailureCount();
  const { langAsString } = useLanguage();
  const [takingLonger, setTakingLonger] = useState(false);
  const [stillWorking, setStillWorking] = useState(false);
  useEffect(() => {
    const takingLongerTimer = setTimeout(() => setTakingLonger(true), TAKING_LONGER_MS);
    const stillWorkingTimer = setTimeout(() => setStillWorking(true), STILL_WORKING_MS);
    return () => {
      clearTimeout(takingLongerTimer);
      clearTimeout(stillWorkingTimer);
    };
  }, []);

  const retrying = workflow?.retrying === true;

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
        <WorkflowProcessingStep targetTask={workflow?.targetTask} />
        {retrying && (
          <div className={classes.processingNote}>
            <Lang id='process_workflow.retrying' />
          </div>
        )}
        {takingLonger && !retrying && (
          <div className={classes.processingNote}>
            <Lang id='process_workflow.taking_longer' />
          </div>
        )}
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

// "Steg x av y", resolved from the target task's position among the process' tasks. processTasks
// comes in BPMN document order, which matches flow order for the linear processes that dominate
// real apps; when the target isn't one of the tasks (a task -> end transition, an unresolved
// target, a branching process where the label would lie anyway) the line is simply omitted.
function WorkflowProcessingStep({ targetTask }: { targetTask: string | undefined }) {
  const { data: process } = useProcessQuery();
  const tasks = process?.processTasks;
  const stepIndex = targetTask && tasks ? tasks.findIndex((task) => task.elementId === targetTask) : -1;
  if (!tasks || stepIndex < 0) {
    return null;
  }

  return (
    <div className={classes.processingStep}>
      <Lang
        id='process_workflow.advancing_step'
        params={[stepIndex + 1, tasks.length]}
      />
    </div>
  );
}

// Failure kinds the backend can emit (camelCase on the wire); anything else falls back to the
// generic label so an unknown/new kind never renders as a raw key.
const KNOWN_FAILURE_KINDS = new Set(['stepFailed', 'dependencyFailed', 'engineFault', 'timeout']);

// Altinn task types with a localized `taskTypes.*` display name.
const NAMED_TASK_TYPES = new Set(['data', 'signing', 'confirmation', 'payment', 'receipt']);

// The engine deemed this failure terminal - it already exhausted its automatic retry budget, so
// offering the citizen a Retry would be wrong. This is an error page: a generic localized message,
// a contact-support pointer, and an expandable details section with only SAFE structured facts
// (failure kind, step, time, support reference). The backend deliberately never ships raw failure
// detail here (it originates from the engine / a service task and may contain internal text).
// Recovery is ops-driven: the failed-state slow poll in InstanceProvider picks up an ops resume
// and this page converges on its own. A future improvement is a first-class, app-authored
// user-safe failure message.
function WorkflowFailed() {
  const workflow = useProcessWorkflow();

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
          id='instantiate.unknown_error_customer_support'
          params={[
            <Lang
              key={0}
              id='general.customer_service_phone_number'
            />,
          ]}
        />
      </div>
      <WorkflowFailedDetails
        failure={workflow?.failure}
        targetTask={workflow?.targetTask}
      />
    </Flex>
  );
}

interface WorkflowFailedDetailsProps {
  failure: IProcessWorkflowFailure | undefined;
  targetTask: string | undefined;
}

// Reuses the unknown-error details expander pattern (see UnknownErrorDetails): an AccordionItem
// with name/value rows. Contains only safe structured facts - never raw error text.
function WorkflowFailedDetails({ failure, targetTask }: WorkflowFailedDetailsProps) {
  const currentLanguage = useCurrentLanguage();
  const getAltinnTaskType = useGetAltinnTaskType();

  const kindKey =
    failure?.kind && KNOWN_FAILURE_KINDS.has(failure.kind)
      ? `process_workflow.failure_kind.${failure.kind}`
      : 'process_workflow.failure_kind.unknown';

  const taskType = targetTask ? getAltinnTaskType(targetTask) : undefined;
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
        {targetTask && (
          <WorkflowFailedDetailItem
            label='process_workflow.failed_details_step'
            value={taskType && NAMED_TASK_TYPES.has(taskType) ? <Lang id={`taskTypes.${taskType}`} /> : targetTask}
          />
        )}
        {occurredAt && (
          <WorkflowFailedDetailItem
            label='process_workflow.failed_details_time'
            value={occurredAt.toLocaleString(currentLanguage)}
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

// A transition can settle while this session's URL is still parked on the pre-transition task: a
// reload during the transition, or an ops resume converging the failed page. The same-session flow
// navigates from useProcessNext's onSuccess/onError, but here the poll only converges the *data*
// (currentTask advances, workflow settles) - nothing converges the URL, stranding the user on the
// old task's "not available" error. So when the live status goes from busy (processing/failed) to
// settled, navigate to the committed task exactly like the sync flow would. A URL that is stale on
// arrival (no observed busy status - e.g. an old deep link) keeps the navigation error + button.
function useNavigateToSettledTask(taskId: string | undefined, enabled: boolean) {
  const { data: process } = useProcessQuery();
  const status = process?.workflow?.status;
  const navigateToTask = useNavigateToTask();
  const wasBusyRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (status === 'processing' || status === 'failed') {
      wasBusyRef.current = true;
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
  }, [enabled, status, process, taskId, navigateToTask]);
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

  if (isWrongTask) {
    return (
      <PresentationComponent showNavigation={false}>
        <NavigationError label='general.part_of_form_completed' />
      </PresentationComponent>
    );
  }

  // Live workflow-engine state machine, layered on top of the committed-currentTask routing above.
  // Sourced from the fetched process state so it survives reloads and concurrent sessions. While a
  // transition is in flight or has failed, we replace the current task's UI entirely (which also
  // suppresses its Submit/next affordances, since those live inside the task components below).
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

  if (!isPdfMode && workflow?.status === 'failed') {
    return (
      <PresentationComponent showNavigation={false}>
        <WorkflowFailed />
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
