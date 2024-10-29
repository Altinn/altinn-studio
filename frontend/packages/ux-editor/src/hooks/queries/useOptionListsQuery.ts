import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { Option } from 'app-shared/types/Option';

export const useOptionListsQuery = (
  org: string,
  app: string,
): UseQueryResult<Map<string, Option[]>> => {
  const { getOptionLists } = useServicesContext();

  return useQuery<any>({
    queryKey: [QueryKey.OptionLists, org, app],
    queryFn: () =>
      getOptionLists(org, app).then((result) => {
        const optionLists = {};
        Object.keys(result).forEach((optionListId) => {
          optionLists[optionListId] = result[optionListId];
        });
        return optionLists;
      }),
  });
};
