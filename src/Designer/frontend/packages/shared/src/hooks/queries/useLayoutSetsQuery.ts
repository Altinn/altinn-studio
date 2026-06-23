import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { LayoutSetResponse } from 'app-shared/utils/layoutSetsUtils';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useLayoutSetsQuery = (
  org: string,
  app: string,
): UseQueryResult<LayoutSetResponse[]> => {
  const { getUiFoldersLayoutSets } = useServicesContext();
  return useQuery<LayoutSetResponse[]>({
    queryKey: [QueryKey.LayoutSets, org, app],
    queryFn: () => getUiFoldersLayoutSets(org, app),
  });
};
