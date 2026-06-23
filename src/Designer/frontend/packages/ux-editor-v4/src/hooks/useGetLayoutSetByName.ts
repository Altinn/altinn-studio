import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import type { LayoutSetResponse } from 'app-shared/utils/layoutSetsUtils';

type UseGetLayoutSetByName = {
  name: string;
  org: string;
  app: string;
};

export const useGetLayoutSetByName = ({
  name,
  org,
  app,
}: UseGetLayoutSetByName): LayoutSetResponse | null => {
  const { data: layoutSetsResponse } = useLayoutSetsQuery(org, app);
  return layoutSetsResponse?.find((set) => set.id === name);
};
