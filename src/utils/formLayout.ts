import type { ILayoutSet } from 'src/layout/common.generated';

/**
 * Some tasks other than data (for instance confirm, or other in the future) can be configured to behave like data steps
 * @param task the task
 * @param layoutSets the layout sets
 */
export function behavesLikeDataTask(task: string | null | undefined, layoutSets: ILayoutSet[] | null): boolean {
  if (!task) {
    return false;
  }

  return !!layoutSets?.some((set) => set.tasks?.includes(task));
}
