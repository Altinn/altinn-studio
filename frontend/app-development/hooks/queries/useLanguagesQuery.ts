import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

type LanguageList = string[];

export const useLanguagesQuery = (owner, app): UseQueryResult<LanguageList> => {
  const { getTextLanguages } = useServicesContext();
  return useQuery<LanguageList>({
    queryKey: [QueryKey.TextLanguages, owner, app],
    queryFn: () => getTextLanguages(owner, app),
  });
};
