import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { Option } from 'app-shared/types/Option';
import type { OptionsLists } from 'app-shared/types/api/OptionsLists';

export const useOptionListsQuery = (
  org: string,
  app: string,
): UseQueryResult<Map<string, Option[]>> => {
  const { getOptionLists } = useServicesContext();
  return useQuery<Map<string, Option[]>>({
    queryKey: [QueryKey.OptionLists, org, app],
    queryFn: () =>
      getOptionLists(org, app).then((result) => {
        return convertToMap(result);
      }),
  });
};

function convertToMap(result: OptionsLists): Map<string, Option[]> {
  const optionsMap = new Map<string, Option[]>();

  Object.entries(result).forEach(([key, value]) => {
    const mappedOptions = value.map((option) => ({
      ...option,
      description: option?.description ?? '',
      helpText: option?.helpText ?? '',
    }));

    optionsMap.set(key, mappedOptions);
  });

  return optionsMap;
}
