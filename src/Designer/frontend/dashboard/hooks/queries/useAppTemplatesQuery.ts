import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppTemplate } from 'app-shared/types/AppTemplate';

export const useAppTemplatesQuery = (options?: {
  enabled: boolean;
}): UseQueryResult<AppTemplate[]> => {
  const { getAppTemplates } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.AppTemplates],
    queryFn: () => getAppTemplates(),
    ...options,
  });
};
