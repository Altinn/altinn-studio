import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { OptionListsReferences } from 'app-shared/types/api/OptionsLists';

export const useOptionListsReferencesQuery = (
  org: string,
  app: string,
): UseQueryResult<OptionListsReferences> => {
  const { getOptionListsReferences } = useServicesContext();
  return useQuery<OptionListsReferences>({
    queryKey: [QueryKey.OptionListsUsage, org, app],
    queryFn: () => getOptionListsReferences(org, app),
  });
};
