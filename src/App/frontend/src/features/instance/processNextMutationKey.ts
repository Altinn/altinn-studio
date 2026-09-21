import type { IActionType } from 'src/types/shared';

/** Prefix shared by every process/next action. */
export function getProcessNextMutationKey(action?: IActionType) {
  return action ? (['processNext', action] as const) : (['processNext'] as const);
}
