import React, { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { Button, Flex } from '@app/form-component';
import { Heading } from '@digdir/designsystemet-react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { PresentationComponent } from 'src/components/presentation/Presentation';
import {
  getLastHistoryNavigationAt,
  getLastProcessNextSuccessAt,
  getProcessNextRecoveryTarget,
} from 'src/components/wrappers/processNextRecovery';
import classes from 'src/components/wrappers/ProcessWrapper.module.css';
import { Loader } from 'src/core/loading/Loader';
import { useIsNavigating } from 'src/core/routing/useIsNavigating';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { FormStore } from 'src/features/form/FormContext';
import {
  getProcessNextMutationKey,
  getTargetTaskFromProcess,
  useProcessResume,
} from 'src/features/instance/useProcessNext';
import { useGetTaskTypeById, useProcessQuery, useProcessWorkflow } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { PdfWrapper } from 'src/features/pdf/PdfWrapper';
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
import type { IInstance } from 'src/types/shared';

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

function WorkflowProcessing({ targetTask }: { targetTask?: string }) {
  const [takingLonger, setTakingLonger] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setTakingLonger(true), TAKING_LONGER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Flex
      item
      size={{ xs: 12 }}
      aria-live='polite'
    >
      <div>
        <Lang
          id='process_workflow.advancing_to_task'
          params={[targetTask ?? '']}
        />
      </div>
      <Loader reason='workflow-processing' />
      {takingLonger && (
        <div>
          <Lang id='process_workflow.taking_longer' />
        </div>
      )}
    </Flex>
  );
}

// We deliberately do NOT render the backend's raw failure detail here: it originates from the
// workflow engine / a service task and may contain internal, non-user-facing text. Citizens see a
// localized, generic message; the detail stays in the API payload for diagnostics and service-owner
// tooling. A future improvement is a first-class, app-authored user-safe message.
function WorkflowFailed() {
  const resume = useProcessResume();

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
      <div>
        <Lang id='process_workflow.failed_description' />
      </div>
      <div className={classes.navigationError}>
        <Button
          variant='primary'
          size='md'
          disabled={resume.isPending}
          onClick={() => resume.mutate()}
        >
          <Lang id='process_workflow.retry' />
        </Button>
      </div>
    </Flex>
  );
}

export function ProcessWrapper({ children }: PropsWithChildren) {
  const taskId = useNavigationParam('taskId');
  const isWrongTask = useIsWrongTask(taskId);
  const isValidTaskId = useIsValidTaskId()(taskId);
  const taskType = useGetTaskTypeById()(taskId);
  const isRunningProcessNext = useIsRunningProcessNext();
  const workflow = useProcessWorkflow();

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
  if (workflow?.status === 'processing') {
    return (
      <PresentationComponent showNavigation={false}>
        <WorkflowProcessing targetTask={workflow.targetTask} />
      </PresentationComponent>
    );
  }

  if (workflow?.status === 'failed') {
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
  const queryClient = useQueryClient();
  const navigateToTask = useNavigateToTask();

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
        if (cancelled) {
          return;
        }

        // Self-heal after a lost navigation: a fast process/next response can race the navigation
        // dispatched in useProcessNext's onSuccess (observed with back-to-back data tasks, where no
        // <ServiceTask /> polling covers the gap), leaving the URL on the previous task while the
        // process has moved on. If the user just successfully advanced the process (and hasn't
        // deliberately moved through browser history since), finish that navigation instead of
        // showing the "wrong task" dead-end. Other visits to previous tasks still get the message.
        const lastProcessNext = queryClient
          .getMutationCache()
          .findAll({ mutationKey: getProcessNextMutationKey() })
          .at(-1);
        const [instanceFromMutation] = (lastProcessNext?.state.data as
          | readonly [IInstance | null, unknown]
          | undefined) ?? [null];
        const recoveryTarget = getProcessNextRecoveryTarget({
          lastMutationStatus: lastProcessNext?.state.status,
          // Prefer the process query (at least as fresh as the mutation result, since onSuccess
          // writes that result into it), but fall back to the mutation's own target so a
          // process-ending transition recovers to the receipt (currentTask is null then).
          targetTask: instanceFromMutation
            ? (currentTaskId ?? getTargetTaskFromProcess(instanceFromMutation.process))
            : undefined,
          successAt: getLastProcessNextSuccessAt(),
          lastUserNavigationAt: getLastHistoryNavigationAt(),
          now: Date.now(),
        });
        if (recoveryTarget !== undefined) {
          navigateToTask(recoveryTarget, { replace: true });
          return;
        }

        setIsWrongTask(true);
      };
      delayedCheck().then();

      return () => {
        cancelled = true;
      };
    }
  }, [isCurrentTask, waitForQueries, queryClient, currentTaskId, navigateToTask]);

  return isWrongTask && !isCurrentTask && !isNavigating;
}
