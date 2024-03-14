import { useLayoutSetsQuery } from '../../../../ux-editor/src/hooks/queries/useLayoutSetsQuery';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';

export const useCustomReceiptLayoutSetName = (org: string, app: string): string | undefined => {
  const { data: layoutSets, isSuccess: layoutSetsAreFetched } = useLayoutSetsQuery(org, app);
  if (!layoutSetsAreFetched) return undefined;
  return layoutSets?.sets?.find((set) => set.tasks.includes(PROTECTED_TASK_NAME_CUSTOM_RECEIPT))
    ?.id;
};
