import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { OptionListReferences } from 'app-shared/types/OptionListReferences';

export const useOptionListsReferencesQuery = (
  org: string,
  app: string,
): UseQueryResult<OptionListReferences> => {
  const { getOptionListsReferences } = useServicesContext();
  return useQuery<OptionListReferences>({
    queryKey: [QueryKey.OptionListsUsage, org, app],
    queryFn: () => getOptionListsReferences(org, app),
  });
};
