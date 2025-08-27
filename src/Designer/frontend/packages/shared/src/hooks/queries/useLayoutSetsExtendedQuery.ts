import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import type { LayoutSetModel } from '../../types/api/dto/LayoutSetModel';
import { QueryKey } from '../../types/QueryKey';

export const useLayoutSetsExtendedQuery = (
  org: string,
  app: string,
): UseQueryResult<LayoutSetModel[], Error> => {
  const { getLayoutSetsExtended } = useServicesContext();
  return useQuery<LayoutSetModel[]>({
    queryKey: [QueryKey.LayoutSetsExtended, org, app],
    queryFn: () => getLayoutSetsExtended(org, app),
  });
};
