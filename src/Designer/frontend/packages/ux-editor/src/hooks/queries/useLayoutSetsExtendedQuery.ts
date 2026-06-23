import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { UiFolderLayoutSetModel } from 'app-shared/types/api/dto/UiFolderLayoutSetModel';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useLayoutSetsExtendedQuery = (
  org: string,
  app: string,
): UseQueryResult<UiFolderLayoutSetModel[], Error> => {
  const { getLayoutSetsExtended } = useServicesContext();

  return useQuery<UiFolderLayoutSetModel[]>({
    queryKey: [QueryKey.LayoutSetsExtended, org, app],
    queryFn: () => getLayoutSetsExtended(org, app),
  });
};
