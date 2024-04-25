import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

export const useTaskIds = (layoutSets: LayoutSets): string[] => {
  const taskIds: string[] = layoutSets?.sets.flatMap((layoutSet) => layoutSet.tasks) ?? [];
  return taskIds;
};
