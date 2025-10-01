import type { ILayoutSet } from 'src/layout/common.generated';

/**
 * Some tasks other than data (for instance confirm, or other in the future) can be configured to behave like data steps
 * @param taskId the task element id
 * @param layoutSets the layout sets
 */
export function behavesLikeDataTask(taskId: string | null | undefined, layoutSets: ILayoutSet[] | null): boolean {
  if (!taskId) {
    return false;
  }

  return !!layoutSets?.some((set) => set.tasks?.includes(taskId));
}
