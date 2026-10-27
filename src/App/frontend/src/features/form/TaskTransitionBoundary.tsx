import React from 'react';
import type { PropsWithChildren } from 'react';

import { Loader } from 'src/core/loading/Loader';
import { useIsProcessNextPending } from 'src/features/instance/processNextMutationKey';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useNavigationParam } from 'src/hooks/navigation';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { TaskKeys } from 'src/routesBuilder';
import { ELEMENT_TYPE } from 'src/types/shared';

export function TaskTransitionBoundary({ children }: PropsWithChildren) {
  const isInTaskTransition = useIsInTaskTransition();

  if (isInTaskTransition) {
    return <Loader reason='task-transition' />;
  }

  return children;
}

/**
 * When navigating to process/next, the taskId transitions to a new one. Layouts will be updated as well, but that
 * takes time. This hook returns true when in such a transition.
 */
function useIsInTaskTransition() {
  const process = useProcessQuery().data;
  const currentTask = process?.currentTask?.elementId;
  const taskIdFromUrl = useNavigationParam('taskId');
  const isPdf = useIsPdf();
  const isProcessNextPending = useIsProcessNextPending();

  // A PDF can render a task other than the current one, such as a preview of a later PDF service task
  if (isPdf) {
    return false;
  }

  // A service task's page stays on screen while the process moves on from it, until the next task
  // is on screen. ProcessWrapper decides what shows while a transition is in flight.
  const urlTaskIsServiceTask =
    process?.processTasks?.find((task) => task.elementId === taskIdFromUrl)?.elementType === ELEMENT_TYPE.SERVICE_TASK;
  if (urlTaskIsServiceTask && (process?.workflow?.status === 'processing' || isProcessNextPending)) {
    return false;
  }

  if ([TaskKeys.ProcessEnd, TaskKeys.CustomReceipt].includes(taskIdFromUrl as TaskKeys) && !currentTask) {
    return false;
  }

  return currentTask !== taskIdFromUrl;
}
