import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { getTaskIdForLayoutSet } from 'app-shared/utils/layoutSetsUtils';

export const getLayoutSetIdFromTaskId = (elementId: string, layoutSets: LayoutSets) => {
  const layoutSet = layoutSets.find((layoutSet) => getTaskIdForLayoutSet(layoutSet) === elementId);
  return layoutSet?.id;
};
