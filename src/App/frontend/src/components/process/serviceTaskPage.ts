import { useEffect, useState } from 'react';

import { useIsProcessNextPending } from 'src/features/instance/processNextMutationKey';
import { findProcessTask, useGetTaskTypeById, useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useNavigationParam } from 'src/hooks/navigation';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { useNavigateToTask } from 'src/hooks/useNavigatePage';
import { ProcessTaskType } from 'src/types';
import { ELEMENT_TYPE } from 'src/types/shared';

// A service task's own page is a page its UI folder lists in pages.order. It shows from the moment the process reaches
// the task until the next task is on screen, whether the task runs, waits or retries, and it is always read-only: the
// task owns the instance until the process moves on. See the durable-yield ADR.

/**
 * Whether the URL is on a service task, so what renders there is the task's own page, never a form to fill in. PDF
 * mode renders a PDF instead.
 */
export function useIsServiceTaskPage(): boolean {
  const taskId = useNavigationParam('taskId');
  const process = useProcessQuery().data;
  const isPdf = useIsPdf();
  return !isPdf && findProcessTask(process, taskId)?.elementType === ELEMENT_TYPE.SERVICE_TASK;
}

/**
 * Moves the URL onto a service task with a page as soon as a poll shows the process committed to it, also while this
 * session's process/next call is pending, and returns whether the URL's task shows its page in place of the loading
 * view. The page stays while the process moves on from the task, so the loading view never returns before the next
 * task is on screen. When the next task is a service task without a page, its loading view takes over, as a reload
 * would show. A URL opened on the task after the process left it gets no page.
 */
export function useServiceTaskPage(taskId: string | undefined): boolean {
  const process = useProcessQuery().data;
  const getTaskType = useGetTaskTypeById();
  const isProcessNextPending = useIsProcessNextPending();
  const isPdf = useIsPdf();
  const navigateToTask = useNavigateToTask();
  const [shownTask, setShownTask] = useState<string | undefined>(undefined);

  // getTaskTypeById classifies a service task with a page as a data task
  const currentTask = process?.currentTask;
  const serviceTask = currentTask?.elementType === ELEMENT_TYPE.SERVICE_TASK ? currentTask.elementId : undefined;
  const pageTask = serviceTask && getTaskType(serviceTask) === ProcessTaskType.Data ? serviceTask : undefined;
  const nextHasNoPage = serviceTask !== undefined && pageTask === undefined;
  const isProcessing = process?.workflow?.status === 'processing';
  const committedHere = taskId !== undefined && pageTask === taskId;

  useEffect(() => {
    if (!isPdf && isProcessing && pageTask && pageTask !== taskId) {
      navigateToTask(pageTask);
    }
  }, [isPdf, isProcessing, pageTask, taskId, navigateToTask]);

  useEffect(() => {
    setShownTask((shown) => {
      if (committedHere) {
        return taskId;
      }
      return shown === taskId && !nextHasNoPage ? shown : undefined;
    });
  }, [committedHere, taskId, nextHasNoPage]);

  const movingOn = (isProcessing || isProcessNextPending) && !nextHasNoPage && shownTask === taskId;
  return !isPdf && taskId !== undefined && (committedHere || movingOn);
}
