import type { LayoutSetResponse } from 'app-shared/utils/layoutSetsUtils';
import { getTaskId } from 'app-shared/utils/layoutSetsUtils';

export const getLayoutSetIdFromTaskId = (elementId: string, layoutSets: LayoutSetResponse[]) => {
  const layoutSet = layoutSets.find((set) => getTaskId(set) === elementId);
  return layoutSet?.id;
};
