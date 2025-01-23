import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { OptionList } from 'app-shared/types/OptionList';

export const useOptionListQuery = (
  org: string,
  app: string,
  optionListId: string,
): UseQueryResult<OptionList> => {
  const { getOptionList } = useServicesContext();
  return useQuery<OptionList>({
    queryKey: [QueryKey.OptionList, org, app, optionListId],
    queryFn: () => getOptionList(org, app, optionListId),
  });
};
