import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useQuery, UseQueryResult } from '@tanstack/react-query';

export const useOptionListIdsQuery = (org: string, app: string): UseQueryResult<string[]> => {
  const { getOptionListIds } = useServicesContext();

  return useQuery<string[]>({
    queryKey: [QueryKey.OptionListIds, org, app],
    queryFn: () => getOptionListIds(org, app).then((result) => result || []),
  });
};
