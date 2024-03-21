import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

export const getLayoutSetNameForCustomReceipt = (layoutSets: LayoutSets): string | undefined => {
  return layoutSets?.sets?.find((set) => set.tasks.includes(PROTECTED_TASK_NAME_CUSTOM_RECEIPT))
    ?.id;
};
