import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { ProcessTaskType } from 'src/types';

/**
 * Returns true if the app has payment configured
 */
export function useHasPayment(): boolean {
  const process = useLaxProcessData();
  return !!process?.processTasks?.some((task) => task.altinnTaskType === ProcessTaskType.Payment);
}

/**
 * Returns true if the current task is a payment task
 */
export function useIsPayment(): boolean {
  const process = useLaxProcessData();
  return process?.currentTask?.altinnTaskType === ProcessTaskType.Payment;
}
