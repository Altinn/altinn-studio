import type { IActionType } from 'src/types/shared';

/** Prefix shared by every process/next action. */
export function getProcessNextMutationKey(action?: IActionType) {
  return action ? (['processNext', action] as const) : (['processNext'] as const);
}

/** Key of the process/resume mutation, which retries a failed workflow owned by a service task. */
export const PROCESS_RESUME_MUTATION_KEY = ['processResume'] as const;
