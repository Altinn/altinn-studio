import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useNavigationParam } from 'src/hooks/navigation';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { ProcessTaskType } from 'src/types';

/**
 * Returns true if the app has payment configured
 */
export function useHasPayment(): boolean {
  const { data: process } = useProcessQuery();
  return !!process?.processTasks?.some((task) => task.altinnTaskType === ProcessTaskType.Payment);
}

/**
 * Returns true if the task being presented is a payment task.
 */
export function useIsPayment(): boolean {
  const { data: process } = useProcessQuery();
  const isPdf = useIsPdf();
  const taskIdFromUrl = useNavigationParam('taskId');
  const taskId = useTaskOverrides().taskId ?? taskIdFromUrl;
  const currentTask = process?.currentTask;
  const renderedTask = process?.processTasks?.find((task) => task.elementId === taskId);

  const taskType = isPdf
    ? (renderedTask?.altinnTaskType ?? (taskId === currentTask?.elementId ? currentTask?.altinnTaskType : undefined))
    : currentTask?.altinnTaskType;
  return taskType === ProcessTaskType.Payment;
}
