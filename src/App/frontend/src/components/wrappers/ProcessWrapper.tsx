import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { Button } from 'src/app-components/Button/Button';
import { Flex } from 'src/app-components/Flex/Flex';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import classes from 'src/components/wrappers/ProcessWrapper.module.css';
import { Loader } from 'src/core/loading/Loader';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { getProcessNextMutationKey, getTargetTaskFromProcess } from 'src/features/instance/useProcessNext';
import { useGetTaskTypeById, useProcessQuery } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { Confirm } from 'src/features/processEnd/confirm/containers/Confirm';
import { Feedback } from 'src/features/processEnd/feedback/Feedback';
import { useNavigationParam } from 'src/hooks/navigation';
import { TaskKeys, useIsValidTaskId, useNavigateToTask, useStartUrl } from 'src/hooks/useNavigatePage';
import { getComponentDef, implementsSubRouting } from 'src/layout';
import { RedirectBackToMainForm } from 'src/layout/Subform/SubformWrapper';
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

export function NavigateToStartUrl({ forceCurrentTask = true }: { forceCurrentTask?: boolean }) {
  const navigate = useNavigate();
  const currentTaskId = getTargetTaskFromProcess(useProcessQuery().data);
  const startUrl = useStartUrl(forceCurrentTask ? currentTaskId : undefined);
  const location = useLocation();

  const processNextKey = getProcessNextMutationKey();
  const queryClient = useQueryClient();
  const isRunningProcessNext = queryClient.isMutating({ mutationKey: processNextKey });

  const currentLocation = location.pathname + location.search;

  useEffect(() => {
    if (currentLocation !== startUrl && !isRunningProcessNext) {
      //navigate(startUrl, { replace: true });
    }
  }, [currentLocation, isRunningProcessNext, navigate, startUrl]);

  if (isRunningProcessNext) {
    return <Loader reason='navigate-to-start-process-next' />;
  }

  return <Loader reason='navigate-to-start' />;
}

export function ProcessWrapper({ children }: PropsWithChildren) {
  const { data: process } = useProcessQuery();
  console.log('process', process);

  const currentTaskId = process?.currentTask?.elementId;
  const { taskId } = useParams();
  const isCurrentTask =
    currentTaskId === undefined && taskId === TaskKeys.CustomReceipt ? true : currentTaskId === taskId;

  const isValidTaskId = useIsValidTaskId()(taskId);

  // console.log('isValidTaskId', isValidTaskId);

  const taskType = useGetTaskTypeById()(taskId);
  const queryClient = useQueryClient();

  const [isRunningProcessNext, setIsRunningProcessNext] = useState<boolean | null>(null);

  useEffect(() => {
    setIsRunningProcessNext(queryClient.isMutating({ mutationKey: getProcessNextMutationKey() }) > 0);
  }, [queryClient]);

  if (isRunningProcessNext) {
    return <Loader reason='process-wrapper' />;
  }

  if (process?.ended) {
    return <NavigateToStartUrl />;
  }

  if (!isValidTaskId) {
    return (
      <PresentationComponent
        type={ProcessTaskType.Unknown}
        showNavigation={false}
      >
        <NavigationError label='general.invalid_task_id' />
      </PresentationComponent>
    );
  }

  if (!isCurrentTask) {
    return (
      <PresentationComponent
        type={ProcessTaskType.Unknown}
        showNavigation={false}
      >
        <NavigationError label='general.part_of_form_completed' />
      </PresentationComponent>
    );
  }

  if (taskType === ProcessTaskType.Confirm) {
    return (
      <PresentationComponent type={ProcessTaskType.Confirm}>
        <Confirm />
      </PresentationComponent>
    );
  }

  if (taskType === ProcessTaskType.Feedback) {
    return (
      <PresentationComponent type={ProcessTaskType.Feedback}>
        <Feedback />
      </PresentationComponent>
    );
  }

  if (taskType === ProcessTaskType.Data) {
    return children;
  }

  throw new Error(`Unknown task type: ${taskType}`);
}

export const ComponentRouting = () => {
  const componentId = useNavigationParam('componentId');
  const layoutLookups = useLayoutLookups();

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
