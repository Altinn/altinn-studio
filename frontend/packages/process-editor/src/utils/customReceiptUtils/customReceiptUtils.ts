import { type LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

export const getExistingDatamodelIdFromLayoutsets = (
  layoutSets: LayoutSets,
  existingCustomReceiptLayoutSetId: string,
): string => {
  return layoutSets.sets.find((layoutSet) => layoutSet.id === existingCustomReceiptLayoutSetId)
    ?.dataType;
};
