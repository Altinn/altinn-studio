import type { UiFolders } from 'src/features/form/layoutSets/types';

/**
 * Some tasks other than data (for instance confirm, or other in the future) can be configured to behave like data steps
 * @param taskId the task element id
 * @param uiFolders bootstrapped UI folders
 */
export function behavesLikeDataTask(taskId: string | null | undefined, uiFolders: UiFolders | null): boolean {
  if (!taskId) {
    return false;
  }

  return !!uiFolders?.[taskId];
}
