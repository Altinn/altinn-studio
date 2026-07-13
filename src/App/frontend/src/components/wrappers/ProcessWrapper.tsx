import React, { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { Button, Flex } from '@app/form-component';
import { Heading } from '@digdir/designsystemet-react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { PresentationComponent } from 'src/components/presentation/Presentation';
import classes from 'src/components/wrappers/ProcessWrapper.module.css';
import { Loader } from 'src/core/loading/Loader';
import { useIsNavigating } from 'src/core/routing/useIsNavigating';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { FormStore } from 'src/features/form/FormContext';
import { getProcessNextMutationKey, useProcessResume } from 'src/features/instance/useProcessNext';
import { useGetTaskTypeById, useProcessQuery, useProcessWorkflow } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
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

function WorkflowProcessing() {
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
        <Lang id='process_workflow.advancing' />
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

// The backend deliberately never ships raw failure detail to the client (it originates from the
// workflow engine / a service task and may contain internal, non-user-facing text) - only the
// coarse failure `kind`. Citizens see a localized, generic message; diagnostics live server-side.
// A future improvement is a first-class, app-authored user-safe message.
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
  const isPdfMode = usePdfModeActive();

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
