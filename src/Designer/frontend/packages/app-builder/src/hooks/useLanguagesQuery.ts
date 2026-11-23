import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

// Same key as the text editor, so the two share the cache.
export const useLanguagesQuery = (org: string, app: string): UseQueryResult<string[]> => {
  const { getTextLanguages } = useServicesContext();
  return useQuery<string[]>({
    queryKey: [QueryKey.TextLanguages, org, app],
    queryFn: () => getTextLanguages(org, app),
  });
};
