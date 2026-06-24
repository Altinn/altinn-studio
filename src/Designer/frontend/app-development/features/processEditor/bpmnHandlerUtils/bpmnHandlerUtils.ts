import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { getTaskIdForLayoutSet } from 'app-shared/utils/layoutSetsUtils';

export const getLayoutSetIdFromTaskId = (elementId: string, layoutSets: LayoutSets) => {
  const layoutSet = layoutSets.sets.find((set) => getTaskIdForLayoutSet(set) === elementId);
  return layoutSet?.id;
};
