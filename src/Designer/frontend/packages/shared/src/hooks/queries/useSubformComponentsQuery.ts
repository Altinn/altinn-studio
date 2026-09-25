import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { SubformComponent } from 'app-shared/types/api/SubformComponent';

export const useSubformComponentsQuery = (
  org: string,
  app: string,
): UseQueryResult<SubformComponent[]> => {
  const { getSubformComponents } = useServicesContext();
  return useQuery<SubformComponent[]>({
    queryKey: [QueryKey.SubformComponents, org, app],
    queryFn: () => getSubformComponents(org, app),
  });
};
