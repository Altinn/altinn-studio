import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import type { LayoutSetsModel } from '../../types/api/dto/LayoutSetsModel';
import { QueryKey } from '../../types/QueryKey';

export const useLayoutSetsExtendedQuery = (
  org: string,
  app: string,
): UseQueryResult<LayoutSetsModel, Error> => {
  const { getLayoutSetsExtended } = useServicesContext();
  return useQuery<LayoutSetsModel>({
    queryKey: [QueryKey.LayoutSetsExtended, org, app],
    queryFn: () => getLayoutSetsExtended(org, app),
  });
};
