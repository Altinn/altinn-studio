import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useQuery } from '@tanstack/react-query';
import type { OptionsList } from 'app-shared/types/api/OptionsLists';

type GetOptionListResult = { data?: OptionsList; isError?: boolean };
type UseGetOptionListQueryResult = (optionListId: string) => GetOptionListResult;

export const useGetOptionListQuery = (org: string, app: string): UseGetOptionListQueryResult => {
  const { getOptionList } = useServicesContext();
  return (optionListId: string) =>
    useQuery<OptionsList>({
      queryKey: [QueryKey.OptionLists, org, app, optionListId],
      queryFn: () => getOptionList(org, app, optionListId),
    });
};
