import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import type { LayoutSet } from 'app-shared/types/api/LayoutSetsResponse';

type UseGetLayoutSetByName = {
  name: string;
  org: string;
  app: string;
};

export const useGetLayoutSetByName = ({
  name,
  org,
  app,
}: UseGetLayoutSetByName): LayoutSet | null => {
  const { data: layoutSetsResponse } = useLayoutSetsQuery(org, app);
  return layoutSetsResponse?.sets.find((set) => set.id === name);
};
