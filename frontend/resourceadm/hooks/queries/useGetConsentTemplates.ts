import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ConsentTemplate } from 'app-shared/types/ResourceAdm';

/**
 * Query to get all consent templates
 *
 * @param org the organisation of the user
 * @param enabled if the query should be run or not
 *
 * @returns UseQueryResult with a list of consent templates
 */
export const useGetConsentTemplates = (
  org: string,
  enabled?: boolean,
): UseQueryResult<ConsentTemplate[]> => {
  const { getConsentTemplates } = useServicesContext();

  return useQuery<ConsentTemplate[]>({
    queryKey: [QueryKey.ConsentResourceTemplates, org],
    queryFn: () => getConsentTemplates(org),
    enabled: enabled,
  });
};
