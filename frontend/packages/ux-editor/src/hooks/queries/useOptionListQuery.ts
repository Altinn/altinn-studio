import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from '../../../../shared/src/types/QueryKey';
import { useQuery, UseQueryResult } from '@tanstack/react-query';




export const useOptionListQuery = (org: string, app: string): UseQueryResult<string[]> => {
  const { getOptionListIds } = useServicesContext();

  return useQuery<string[]>(
    [QueryKey.OptionListIds, org, app],
    () => getOptionListIds(org, app).then((result) => result || [])
  );
};




