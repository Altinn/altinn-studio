import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useLayoutSetsExtendedQuery = (
  org: string,
  app: string,
): UseQueryResult<LayoutSetModel[], Error> => {
  const { getLayoutSetsExtendedV4 } = useServicesContext();

  return useQuery<LayoutSetModel[]>({
    queryKey: [QueryKey.LayoutSetsExtended, org, app],
    queryFn: () => getLayoutSetsExtendedV4(org, app),
  });
};
