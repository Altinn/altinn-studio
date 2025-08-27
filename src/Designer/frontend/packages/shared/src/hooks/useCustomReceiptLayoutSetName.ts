import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { getLayoutSetNameForCustomReceipt } from 'app-shared/utils/layoutSetsUtils';

export const useCustomReceiptLayoutSetName = (org: string, app: string): string | undefined => {
  const { data: layoutSets, isSuccess: layoutSetsAreFetched } = useLayoutSetsQuery(org, app);
  if (!layoutSetsAreFetched) return undefined;
  return getLayoutSetNameForCustomReceipt(layoutSets);
};
