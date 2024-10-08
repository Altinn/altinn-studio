import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

export const getLayoutSetIdFromTaskId = (elementId: string, layoutSets: LayoutSets) => {
  const layoutSet = layoutSets.sets.find((set) => set.tasks && set.tasks[0] === elementId);
  return layoutSet?.id;
};
