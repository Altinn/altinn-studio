import { useIsMutating } from 'src/core/queries/reactQuery';
import type { IActionType } from 'src/types/shared';

/** Prefix shared by every process/next action. */
export function getProcessNextMutationKey(action?: IActionType) {
  return action ? (['processNext', action] as const) : (['processNext'] as const);
}

/** Key of the process/resume mutation, which retries a failed workflow owned by a service task. */
export const PROCESS_RESUME_MUTATION_KEY = ['processResume'] as const;

/** Whether a process/next call from this session is waiting for its response. */
export function useIsProcessNextPending() {
  return useIsMutating({ mutationKey: getProcessNextMutationKey(), status: 'pending' }) > 0;
}
