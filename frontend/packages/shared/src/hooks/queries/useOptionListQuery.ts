import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { OptionsList } from 'app-shared/types/api/OptionsLists';

export const useOptionListQuery = (
  org: string,
  app: string,
  optionListId: string,
): UseQueryResult<OptionsList> => {
  const { getOptionList } = useServicesContext();
  return useQuery<OptionsList>({
    queryKey: [QueryKey.OptionList, org, app, optionListId],
    queryFn: () => getOptionList(org, app, optionListId),
  });
};
