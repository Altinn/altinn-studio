import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { ProcessTaskType } from 'src/types';

/**
 * Returns true if the app has payment configured
 */
export function useHasPayment(): boolean {
  const { data: process } = useProcessQuery();
  return !!process?.processTasks?.some((task) => task.altinnTaskType === ProcessTaskType.Payment);
}

/**
 * Returns true if the current task is a payment task
 */
export function useIsPayment(): boolean {
  const { data: process } = useProcessQuery();
  return process?.currentTask?.altinnTaskType === ProcessTaskType.Payment;
}
