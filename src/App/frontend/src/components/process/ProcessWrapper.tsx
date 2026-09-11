import React, { useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { Button, Flex } from '@app/form-component';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { PresentationComponent } from 'src/components/presentation/Presentation';
import classes from 'src/components/process/ProcessWrapper.module.css';
import {
  useIsWorkflowFailedOnCurrentServiceTask,
  useIsWorkflowProcessingOnCurrentServiceTask,
  WorkflowFailed,
  WorkflowProcessing,
} from 'src/components/process/WorkflowEngine';
import { Loader } from 'src/core/loading/Loader';
import { useIsNavigating } from 'src/core/routing/useIsNavigating';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { getProcessNextMutationKey, getTargetTaskFromProcess } from 'src/features/instance/useProcessNext';
import { useGetTaskTypeById, useProcessQuery, useProcessWorkflow } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { PdfWrapper, usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import { Confirm } from 'src/features/process/confirm/containers/Confirm';
import { Feedback } from 'src/features/process/feedback/Feedback';
import { ServiceTaskFailed } from 'src/features/process/service/ServiceTaskFailed';
import { ServiceTaskWaiting } from 'src/features/process/service/ServiceTaskWaiting';
import { useFollowProcess } from 'src/features/process/useFollowProcess';
import { useNavigationParam } from 'src/hooks/navigation';
import { useIsValidTaskId, useNavigateToTask } from 'src/hooks/useNavigatePage';
import { useWaitForQueries } from 'src/hooks/useWaitForQueries';
import { TaskKeys } from 'src/routesBuilder';
import { ProcessTaskType } from 'src/types';
import { ELEMENT_TYPE } from 'src/types/shared';
import { getPageTitle } from 'src/utils/getPageTitle';

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
      //
      // Deliberately does NOT consume wasBusyRef: this branch can fire against a stale snapshot
      // (a read that raced a just-settled reject). Leaving the flag set lets the settled branch
      // below converge forward as soon as the workflow reads settled again.
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

export function ProcessWrapper({ children }: PropsWithChildren) {
  const taskId = useNavigationParam('taskId');
  const isWrongTask = useIsWrongTask(taskId);
  const isValidTaskId = useIsValidTaskId()(taskId);
  const taskType = useGetTaskTypeById()(taskId);
  const isRunningProcessNext = useIsRunningProcessNext();
  const workflow = useProcessWorkflow();
  const failedOnCurrentServiceTask = useIsWorkflowFailedOnCurrentServiceTask();
  const processingOnCurrentServiceTask = useIsWorkflowProcessingOnCurrentServiceTask();
  const isPdfMode = usePdfModeActive();
  const { data: process } = useProcessQuery();

  // PDF mode never navigates: the render is a one-shot snapshot taken *during* the transition.
  useNavigateToSettledTask(taskId, !isPdfMode);

  // A process parked on a service task advances out-of-band (the task is waiting for an external
  // outcome), so nothing in this session would otherwise observe the advance: the live workflow
  // annotation is idle (no transition in flight) and InstanceContext only polls while processing.
  // Poll here and carry the user forward when the process moves. Keyed on the committed task's
  // element type - not the classified taskType - so a service task with a custom layout (which
  // classifies and renders as a Data task) is followed the same way as the default waiting view.
  const isParkedOnServiceTask =
    process?.currentTask?.elementType === ELEMENT_TYPE.SERVICE_TASK && (workflow?.status ?? 'idle') === 'idle';
  useFollowProcess(!isPdfMode && isParkedOnServiceTask);

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
  //
  // A deferring service task also bypasses it when the task supplies its own layout and the URL is
  // on it: the process genuinely sits on the committed task, and the app's page owns the waiting
  // presentation - exactly as it does for a parked (idle) task. Park and defer are opposites in
  // the engine but deliberately identical UX on layouted service tasks (see the durable-yield ADR).
  // The replacement stays for transitions toward other tasks, default-view service tasks, and
  // stale URLs until navigation converges.
  const deferringOnLayoutedServiceTask =
    processingOnCurrentServiceTask && taskType === ProcessTaskType.Data && taskId === process?.currentTask?.elementId;

  if (!isPdfMode && workflow?.status === 'processing' && !deferringOnLayoutedServiceTask) {
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

  // A failure owned by the current service task renders the task's recoverable failure view.
  // This takes precedence over a custom layout (which would classify the task as Data below and
  // render its form with no trace of the failure), and sits before the wrong-task guard for the
  // same reason as the guards above: the URL may still point at the transition's previous task
  // while useNavigateToSettledTask converges it onto the committed one.
  if (!isPdfMode && failedOnCurrentServiceTask) {
    return (
      <PresentationComponent>
        <ServiceTaskFailed />
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

  // A service task without a failure and without a custom layout is an implicit waiting step:
  // the process is parked here pending an outcome, and the poll above carries the user forward
  // when it advances. The PdfWrapper stays because PDF mode renders the PDF service task's
  // snapshot through it; outside PDF mode it just passes the waiting view through.
  if (taskType === ProcessTaskType.Service) {
    return (
      <PdfWrapper>
        <PresentationComponent>
          <ServiceTaskWaiting />
        </PresentationComponent>
      </PdfWrapper>
    );
  }

  if (taskType === ProcessTaskType.Data) {
    return children;
  }

  throw new Error(`Unknown task type: ${taskType}`);
}

function isRunningProcessNext(queryClient: QueryClient) {
  return queryClient.isMutating({ mutationKey: getProcessNextMutationKey() }) > 0;
}

function useIsRunningProcessNext() {
  const queryClient = useQueryClient();
  const [isMutating, setIsMutating] = useState<boolean | null>(null);

  // Intentionally wrapped in a useEffect() and saved as a state. If this happens, we'll seemingly be locked out
  // with a <Loader /> forever, but when this happens, we also know we'll be re-rendered soon. This is only meant to
  // block rendering when we're calling process/next.
  //
  // Deliberately sampled once (not subscribed via useIsMutating): the mutation's pre-request phase
  // (beforeProcessNext -> onFormSubmitValidation -> useWaitForValidation) only resolves while the
  // form/validation providers stay mounted. Subscribing here swaps the task tree for the <Loader />
  // as soon as the mutation starts, unmounting those providers and deadlocking the mutation - it
  // never reaches process/next and never settles, so the Loader stays forever. This check only
  // exists to cover mounting mid-mutation; while mounted, blocking is driven by the server-side
  // workflow annotation instead.
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
